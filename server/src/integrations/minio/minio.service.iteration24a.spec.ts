import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MinIOService } from './minio.service';

interface BucketInfo {
  name: string;
}

interface MinioClientMock {
  listBuckets: ReturnType<typeof vi.fn<() => Promise<BucketInfo[]>>>;
  bucketExists: ReturnType<typeof vi.fn<(bucket: string) => Promise<boolean>>>;
  makeBucket: ReturnType<typeof vi.fn<(bucket: string, region: string) => Promise<void>>>;
  setBucketPolicy: ReturnType<typeof vi.fn<(bucket: string, policy: string) => Promise<void>>>;
}

interface LoggerMock {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
}

interface FileStatsMock {
  isFile: () => boolean;
}

const fsPromisesState = vi.hoisted(() => ({
  readdir: vi.fn<(path: string) => Promise<string[]>>(),
  stat: vi.fn<(path: string) => Promise<FileStatsMock>>(),
}));

const fsState = vi.hoisted(() => ({
  readFile: vi.fn<(path: string) => Promise<Buffer>>(),
  unlink: vi.fn<(path: string) => Promise<void>>(),
}));

const minioCtorState: { instance: MinioClientMock | null } = { instance: null };

vi.mock('fs/promises', () => ({
  readdir: fsPromisesState.readdir,
  stat: fsPromisesState.stat,
}));

vi.mock('fs', () => ({
  promises: {
    readFile: fsState.readFile,
    unlink: fsState.unlink,
  },
}));

vi.mock('minio', () => {
  class ClientMockClass {
    listBuckets = vi.fn(async () => []);
    bucketExists = vi.fn(async () => true);
    makeBucket = vi.fn(async (_bucket: string, _region: string) => undefined);
    setBucketPolicy = vi.fn(async (_bucket: string, _policy: string) => undefined);

    constructor() {
      minioCtorState.instance = {
        listBuckets: this.listBuckets,
        bucketExists: this.bucketExists,
        makeBucket: this.makeBucket,
        setBucketPolicy: this.setBucketPolicy,
      };
    }
  }

  return { Client: ClientMockClass };
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
  client: unknown;
};

function makeService(): MinIOService {
  return new MinIOService({} as ConfigService);
}

function loanItemsDirPath(): string {
  return join(process.cwd(), 'public', 'uploads', 'loan-items');
}

function assetsDirPath(): string {
  return join(process.cwd(), 'attached_assets');
}

function fileStats(isFile: boolean): FileStatsMock {
  return { isFile: () => isFile };
}

describe('MinIOService - iteration24a migrate/ensure edge coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    minioCtorState.instance = null;

    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_PORT = '9000';
    process.env.MINIO_EXTERNAL_PORT = '9002';
    process.env.MINIO_USE_SSL = 'false';
    process.env.MINIO_BUCKET_LOAN_ITEMS = 'loan-items';
    process.env.MINIO_BUCKET_ASSETS = 'assets';

    fsPromisesState.readdir.mockResolvedValue([]);
    fsPromisesState.stat.mockResolvedValue(fileStats(true));
    fsState.readFile.mockResolvedValue(Buffer.from('blob'));
    fsState.unlink.mockResolvedValue();
  });

  it('ensureBuckets logs and rethrows when bucket existence check fails', async () => {
    const service = makeService();
    await service.initialize();

    const client = minioCtorState.instance;
    if (!client) {
      throw new Error('Client not created');
    }

    client.bucketExists.mockRejectedValueOnce(new Error('bucketExists failure'));

    await expect(service.ensureBuckets()).rejects.toThrow('bucketExists failure');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to ensure MinIO buckets',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('migrateLocalFiles migrates files from both directories with expected mime types', async () => {
    const service = makeService();
    vi.spyOn(service, 'initialize').mockResolvedValue();
    (service as ServiceInternals).client = {};

    const uploadSpy = vi.spyOn(service, 'uploadFile').mockResolvedValue();

    fsPromisesState.readdir.mockImplementation(async (path: string) => {
      if (path === loanItemsDirPath()) {
        return ['photo.JPG', 'folder'];
      }
      if (path === assetsDirPath()) {
        return ['logo.webp'];
      }
      return [];
    });

    fsPromisesState.stat.mockImplementation(async (path: string) => {
      if (path.endsWith('folder')) {
        return fileStats(false);
      }
      return fileStats(true);
    });

    fsState.readFile.mockImplementation(async (path: string) => {
      if (path.endsWith('photo.JPG')) {
        return Buffer.from('loan');
      }
      return Buffer.from('asset');
    });

    const result = await service.migrateLocalFiles(false);

    expect(result).toEqual({
      loanItems: { success: 1, errors: 0 },
      assets: { success: 1, errors: 0 },
    });
    expect(uploadSpy).toHaveBeenNthCalledWith(
      1,
      'loan-items',
      'photo.JPG',
      Buffer.from('loan'),
      'image/jpeg'
    );
    expect(uploadSpy).toHaveBeenNthCalledWith(
      2,
      'assets',
      'logo.webp',
      Buffer.from('asset'),
      'image/webp'
    );
    expect(fsState.unlink).not.toHaveBeenCalled();
  });

  it('migrateLocalFiles deletes local files after migration when deleteAfterMigration=true', async () => {
    const service = makeService();
    vi.spyOn(service, 'initialize').mockResolvedValue();
    (service as ServiceInternals).client = {};
    vi.spyOn(service, 'uploadFile').mockResolvedValue();

    fsPromisesState.readdir.mockImplementation(async (path: string) => {
      if (path === loanItemsDirPath()) {
        return ['to-delete.png'];
      }
      return [];
    });

    const result = await service.migrateLocalFiles(true);

    expect(result.loanItems.success).toBe(1);
    expect(result.assets.success).toBe(0);
    expect(fsState.unlink).toHaveBeenCalledTimes(1);
    expect(fsState.unlink).toHaveBeenCalledWith(
      join(loanItemsDirPath(), 'to-delete.png')
    );
  });

  it('migrateLocalFiles increments loanItems.errors when upload of a loan item fails', async () => {
    const service = makeService();
    vi.spyOn(service, 'initialize').mockResolvedValue();
    (service as ServiceInternals).client = {};

    const uploadSpy = vi.spyOn(service, 'uploadFile');
    uploadSpy
      .mockRejectedValueOnce(new Error('upload failed'))
      .mockResolvedValueOnce();

    fsPromisesState.readdir.mockImplementation(async (path: string) => {
      if (path === loanItemsDirPath()) {
        return ['broken.png'];
      }
      if (path === assetsDirPath()) {
        return ['ok.gif'];
      }
      return [];
    });

    const result = await service.migrateLocalFiles(false);

    expect(result).toEqual({
      loanItems: { success: 0, errors: 1 },
      assets: { success: 1, errors: 0 },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to migrate loan item file',
      expect.objectContaining({ file: 'broken.png', error: expect.any(Error) })
    );
  });

  it('migrateLocalFiles increments assets.errors when uploading an asset fails', async () => {
    const service = makeService();
    vi.spyOn(service, 'initialize').mockResolvedValue();
    (service as ServiceInternals).client = {};
    vi.spyOn(service, 'uploadFile').mockRejectedValueOnce(new Error('asset upload failed'));

    fsPromisesState.readdir.mockImplementation(async (path: string) => {
      if (path === loanItemsDirPath()) {
        return [];
      }
      if (path === assetsDirPath()) {
        return ['broken.svg'];
      }
      return [];
    });

    const result = await service.migrateLocalFiles(false);

    expect(result).toEqual({
      loanItems: { success: 0, errors: 0 },
      assets: { success: 0, errors: 1 },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to migrate asset file',
      expect.objectContaining({ file: 'broken.svg', error: expect.any(Error) })
    );
  });

  it('migrateLocalFiles warns for non-ENOENT loan-items directory errors', async () => {
    const service = makeService();
    vi.spyOn(service, 'initialize').mockResolvedValue();
    (service as ServiceInternals).client = {};

    const accessError = Object.assign(new Error('permission denied'), {
      code: 'EACCES',
    });

    fsPromisesState.readdir.mockImplementation(async (path: string) => {
      if (path === loanItemsDirPath()) {
        throw accessError;
      }
      return [];
    });

    const result = await service.migrateLocalFiles(false);

    expect(result.loanItems).toEqual({ success: 0, errors: 0 });
    expect(logger.warn).toHaveBeenCalledWith(
      'Loan items directory not found or not accessible',
      expect.objectContaining({ path: loanItemsDirPath(), error: accessError })
    );
  });

  it('migrateLocalFiles ignores ENOENT for assets directory without warning', async () => {
    const service = makeService();
    vi.spyOn(service, 'initialize').mockResolvedValue();
    (service as ServiceInternals).client = {};

    const notFoundError = Object.assign(new Error('missing assets dir'), {
      code: 'ENOENT',
    });

    fsPromisesState.readdir.mockImplementation(async (path: string) => {
      if (path === assetsDirPath()) {
        throw notFoundError;
      }
      return [];
    });

    const result = await service.migrateLocalFiles(false);

    expect(result.assets).toEqual({ success: 0, errors: 0 });
    expect(logger.warn).not.toHaveBeenCalledWith(
      'Assets directory not found or not accessible',
      expect.anything()
    );
  });

  it('migrateLocalFiles propagates initialize failure before migration loop starts', async () => {
    const service = makeService();
    vi.spyOn(service, 'initialize').mockRejectedValueOnce(new Error('init broke'));

    await expect(service.migrateLocalFiles()).rejects.toThrow('init broke');
    expect(logger.error).toHaveBeenCalledTimes(0);
  });
});
