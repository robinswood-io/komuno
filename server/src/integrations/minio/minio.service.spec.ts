import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { promises as fs } from 'fs';
import { mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { MinIOService } from './minio.service';

interface BucketInfo {
  name: string;
}

interface MinioClientMock {
  listBuckets: ReturnType<typeof vi.fn<() => Promise<BucketInfo[]>>>;
  bucketExists: ReturnType<typeof vi.fn<(bucket: string) => Promise<boolean>>>;
  makeBucket: ReturnType<typeof vi.fn<(bucket: string, region: string) => Promise<void>>>;
  setBucketPolicy: ReturnType<typeof vi.fn<(bucket: string, policy: string) => Promise<void>>>;
  putObject: ReturnType<
    typeof vi.fn<(
      bucket: string,
      filename: string,
      buffer: Buffer,
      length: number,
      metadata: Record<string, string>
    ) => Promise<void>>
  >;
  removeObject: ReturnType<typeof vi.fn<(bucket: string, filename: string) => Promise<void>>>;
  getObject: ReturnType<typeof vi.fn<(bucket: string, filename: string) => Promise<NodeJS.ReadableStream>>>;
}

interface LoggerMock {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
}

const minioCtorState: { instance: MinioClientMock | null } = { instance: null };
const minioBehavior: {
  rejectListBuckets: boolean;
  rejectBucketExists: boolean;
} = {
  rejectListBuckets: false,
  rejectBucketExists: false,
};

vi.mock('minio', () => {
  class ClientMockClass {
    listBuckets = vi.fn(async () => {
      if (minioBehavior.rejectListBuckets) {
        throw new Error('list fail');
      }
      return [];
    });
    bucketExists = vi.fn(async () => {
      if (minioBehavior.rejectBucketExists) {
        throw new Error('bucket fail');
      }
      return true;
    });
    makeBucket = vi.fn(async () => undefined);
    setBucketPolicy = vi.fn(async () => undefined);
    putObject = vi.fn(
      async (
        _bucket: string,
        _filename: string,
        _buffer: Buffer,
        _length: number,
        _metadata: Record<string, string>
      ) => undefined
    );
    removeObject = vi.fn(async (_bucket: string, _filename: string) => undefined);
    getObject = vi.fn(async (_bucket: string, _filename: string) => Readable.from(['ok']));

    constructor() {
      minioCtorState.instance = {
        listBuckets: this.listBuckets,
        bucketExists: this.bucketExists,
        makeBucket: this.makeBucket,
        setBucketPolicy: this.setBucketPolicy,
        putObject: this.putObject,
        removeObject: this.removeObject,
        getObject: this.getObject,
      };
    }
  }

  return {
    Client: ClientMockClass,
  };
});

vi.mock('../../../lib/logger', () => {
  const logger: LoggerMock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  return { logger };
});

const { logger } = await import('../../../lib/logger');

type ServiceInternals = MinIOService & {
  client: MinioClientMock | null;
  initialized: boolean;
};

function makeService(): MinIOService {
  return new MinIOService({} as ConfigService);
}

describe('MinIOService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    minioCtorState.instance = null;
    minioBehavior.rejectListBuckets = false;
    minioBehavior.rejectBucketExists = false;
    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_PORT = '9000';
    process.env.MINIO_EXTERNAL_PORT = '9002';
    process.env.MINIO_USE_SSL = 'false';
    process.env.MINIO_BUCKET_LOAN_ITEMS = 'loan-items';
    process.env.MINIO_BUCKET_ASSETS = 'assets';
  });

  describe('initialize', () => {
    it('initialise le client et crée les buckets manquants', async () => {
      const service = makeService();

      await service.initialize();

      const client = minioCtorState.instance;
      expect(client).not.toBeNull();
      if (!client) {
        throw new Error('Client not created');
      }

      expect(client.listBuckets).toHaveBeenCalled();
      expect(client.bucketExists).toHaveBeenCalledTimes(2);
      expect(client.makeBucket).not.toHaveBeenCalled();
      expect((service as ServiceInternals).initialized).toBe(true);
    });

    it('continue même si le test de connexion listBuckets échoue', async () => {
      const service = makeService();
      minioBehavior.rejectListBuckets = true;

      await service.initialize();

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      expect(logger.warn).toHaveBeenCalled();
      expect((service as ServiceInternals).initialized).toBe(true);
      expect(client.listBuckets).toHaveBeenCalledTimes(1);
    });

    it('propage l’erreur si ensureBuckets échoue', async () => {
      const service = makeService();
      minioBehavior.rejectBucketExists = true;

      await expect(service.initialize()).rejects.toThrow('bucket fail');
      expect((service as ServiceInternals).initialized).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });

    it('onModuleInit ne casse pas l’app quand initialize échoue', async () => {
      const service = makeService();
      const initializeSpy = vi
        .spyOn(service, 'initialize')
        .mockRejectedValueOnce(new Error('init failed'));

      await service.onModuleInit();
      await Promise.resolve();

      expect(initializeSpy).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('ne réinitialise pas le client si déjà initialisé', async () => {
      const service = makeService();
      await service.initialize();

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      client.listBuckets.mockClear();
      client.bucketExists.mockClear();

      await service.initialize();

      expect(client.listBuckets).not.toHaveBeenCalled();
      expect(client.bucketExists).not.toHaveBeenCalled();
    });
  });

  describe('ensureBuckets', () => {
    it('crée et configure une policy pour les buckets manquants', async () => {
      const service = makeService();
      await service.initialize();

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      client.bucketExists.mockReset();
      client.bucketExists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      client.makeBucket.mockClear();
      client.setBucketPolicy.mockClear();

      await service.ensureBuckets();

      expect(client.makeBucket).toHaveBeenCalledTimes(1);
      expect(client.makeBucket).toHaveBeenCalledWith('loan-items', 'us-east-1');
      expect(client.setBucketPolicy).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('MinIO bucket created', { bucket: 'loan-items' });
    });

    it('lance une erreur si le client MinIO est absent', async () => {
      const service = makeService();

      await expect(service.ensureBuckets()).rejects.toThrow('MinIO client not initialized');
    });
  });

  describe('healthCheck', () => {
    it('retourne healthy quand client et buckets sont disponibles', async () => {
      const service = makeService();
      await service.initialize();

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      client.listBuckets.mockResolvedValueOnce([{ name: 'loan-items' }, { name: 'assets' }]);

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        connected: true,
        buckets: ['loan-items', 'assets'],
      });
    });

    it('recrée les buckets manquants pendant le healthcheck', async () => {
      const service = makeService();
      await service.initialize();

      const ensureBucketsSpy = vi.spyOn(service, 'ensureBuckets');
      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      client.listBuckets.mockResolvedValueOnce([{ name: 'loan-items' }]);

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(ensureBucketsSpy).toHaveBeenCalledTimes(1);
    });

    it('retourne unhealthy si listBuckets échoue', async () => {
      const service = makeService();
      await service.initialize();

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      client.listBuckets.mockRejectedValueOnce(new Error('connection down'));

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
      expect(result.error).toBe('connection down');
      expect(logger.error).toHaveBeenCalled();
    });

    it('retourne unhealthy si initialize ne produit pas de client', async () => {
      const service = makeService();
      vi.spyOn(service, 'initialize').mockResolvedValueOnce();

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        connected: false,
        buckets: [],
        error: 'Client not initialized',
      });
    });
  });

  describe('URL generation', () => {
    it('génère une URL locale avec endpoint minio -> localhost/externalPort', () => {
      process.env.MINIO_ENDPOINT = 'minio';
      process.env.MINIO_EXTERNAL_PORT = '9009';
      process.env.MINIO_USE_SSL = 'true';
      const service = makeService();

      const url = service.getFileUrl('assets', 'logo.png');

      expect(url).toBe('https://localhost:9009/assets/logo.png');
    });

    it('génère les URLs photo/asset avec les buckets configurés', () => {
      const service = makeService();

      expect(service.getPhotoUrl('p.jpg')).toBe('http://localhost:9000/loan-items/p.jpg');
      expect(service.getAssetUrl('a.svg')).toBe('http://localhost:9000/assets/a.svg');
    });

    it('utilise les valeurs par défaut quand les variables env MinIO sont absentes', () => {
      delete process.env.MINIO_ENDPOINT;
      delete process.env.MINIO_PORT;
      delete process.env.MINIO_EXTERNAL_PORT;
      delete process.env.MINIO_USE_SSL;
      delete process.env.MINIO_BUCKET_LOAN_ITEMS;
      delete process.env.MINIO_BUCKET_ASSETS;

      const service = makeService();

      expect(service.getFileUrl('loan-items', 'x.png')).toBe('http://localhost:9000/loan-items/x.png');
      expect(service.loanItemsBucket).toBe('loan-items');
      expect(service.assetsBucket).toBe('assets');
    });
  });

  describe('upload/delete guards et erreurs client', () => {
    it('uploadFile initialise le client à la demande et upload', async () => {
      const service = makeService();
      const initializeSpy = vi.spyOn(service, 'initialize');

      await service.uploadFile('loan-items', 'f.png', Buffer.from('x'), 'image/png');

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      expect(initializeSpy).toHaveBeenCalledTimes(1);
      expect(client.putObject).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('uploadFile force ensureBuckets si bucket manquant', async () => {
      const service = makeService();
      await service.initialize();
      const ensureBucketsSpy = vi.spyOn(service, 'ensureBuckets');

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      client.bucketExists.mockResolvedValueOnce(false);

      await service.uploadFile('loan-items', 'f.png', Buffer.from('x'), 'image/png');

      expect(ensureBucketsSpy).toHaveBeenCalledTimes(1);
      expect(client.putObject).toHaveBeenCalledTimes(1);
    });

    it('uploadFile remonte les erreurs MinIO client', async () => {
      const service = makeService();
      await service.initialize();

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      client.putObject.mockRejectedValueOnce(new Error('put failed'));

      await expect(
        service.uploadFile('loan-items', 'f.png', Buffer.from('x'), 'image/png')
      ).rejects.toThrow('put failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteFile ignore NoSuchKey', async () => {
      const service = makeService();
      await service.initialize();

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      const noSuchKeyError = new Error('missing') as Error & { code: string };
      noSuchKeyError.code = 'NoSuchKey';
      client.removeObject.mockRejectedValueOnce(noSuchKeyError);

      await expect(service.deleteFile('loan-items', 'missing.png')).resolves.toBeUndefined();
      expect(logger.error).not.toHaveBeenCalledWith(
        'Failed to delete file from MinIO',
        expect.any(Object)
      );
    });

    it('deleteFile remonte les erreurs non NoSuchKey', async () => {
      const service = makeService();
      await service.initialize();

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      const forbiddenError = new Error('forbidden') as Error & { code: string };
      forbiddenError.code = 'AccessDenied';
      client.removeObject.mockRejectedValueOnce(forbiddenError);

      await expect(service.deleteFile('loan-items', 'x.png')).rejects.toThrow('forbidden');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getObjectStream', () => {
    it('initialise à la demande et retourne le stream objet', async () => {
      const service = makeService();

      const stream = await service.getObjectStream('assets', 'file.bin');

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      expect(client.getObject).toHaveBeenCalledWith('assets', 'file.bin');
      expect(stream).toBeDefined();
    });

    it('remonte les erreurs du client MinIO sur getObject', async () => {
      const service = makeService();
      await service.initialize();

      const client = minioCtorState.instance;
      if (!client) {
        throw new Error('Client not created');
      }

      client.getObject.mockRejectedValueOnce(new Error('read failed'));

      await expect(service.getObjectStream('assets', 'missing.bin')).rejects.toThrow('read failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('lance une erreur si initialize n’instancie pas de client', async () => {
      const service = makeService();
      vi.spyOn(service, 'initialize').mockResolvedValueOnce();

      await expect(service.getObjectStream('assets', 'x.bin')).rejects.toThrow(
        'MinIO client not initialized'
      );
    });
  });

  describe('migrateLocalFiles', () => {
    it('migre les fichiers des deux dossiers et supprime si demandé', async () => {
      const previousCwd = process.cwd();
      const sandbox = mkdtempSync(join(tmpdir(), 'minio-migrate-'));
      process.chdir(sandbox);

      const loanDir = join(sandbox, 'public', 'uploads', 'loan-items');
      const assetsDir = join(sandbox, 'attached_assets');
      await fs.mkdir(loanDir, { recursive: true });
      await fs.mkdir(assetsDir, { recursive: true });
      await fs.writeFile(join(loanDir, 'loan-file.jpg'), Buffer.from('loan-file'));
      await fs.writeFile(join(assetsDir, 'asset-file.png'), Buffer.from('asset-file'));

      const service = makeService();
      await service.initialize();
      const uploadSpy = vi.spyOn(service, 'uploadFile').mockResolvedValue();

      const result = await service.migrateLocalFiles(true);

      expect(uploadSpy).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        loanItems: { success: 1, errors: 0 },
        assets: { success: 1, errors: 0 },
      });

      await expect(fs.access(join(loanDir, 'loan-file.jpg'))).rejects.toThrow();
      await expect(fs.access(join(assetsDir, 'asset-file.png'))).rejects.toThrow();

      process.chdir(previousCwd);
      await fs.rm(sandbox, { recursive: true, force: true });
    });

    it('retourne succès vide quand les dossiers n’existent pas (ENOENT)', async () => {
      const previousCwd = process.cwd();
      const sandbox = mkdtempSync(join(tmpdir(), 'minio-migrate-empty-'));
      process.chdir(sandbox);

      const service = makeService();
      await service.initialize();
      const uploadSpy = vi.spyOn(service, 'uploadFile').mockResolvedValue();

      const result = await service.migrateLocalFiles(false);

      expect(uploadSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        loanItems: { success: 0, errors: 0 },
        assets: { success: 0, errors: 0 },
      });

      process.chdir(previousCwd);
      await fs.rm(sandbox, { recursive: true, force: true });
    });
  });
});
