import { Readable } from 'node:stream';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { BrandingService } from './branding.service';
import { StorageService } from '../common/storage/storage.service';
import { MinIOService } from '../integrations/minio/minio.service';
import type { BrandingConfig } from '../../shared/schema';

type GetBrandingConfigResult =
  | { success: true; data: BrandingConfig | null }
  | { success: false; error?: Error };

type UpdateBrandingConfigResult =
  | { success: true; data: BrandingConfig }
  | { success: false; error?: Error };

type DeleteBrandingConfigResult =
  | { success: true }
  | { success: false; error?: Error };

interface StorageInstanceMock {
  getBrandingConfig: () => Promise<GetBrandingConfigResult>;
  updateBrandingConfig: (
    config: string,
    userEmail: string,
  ) => Promise<UpdateBrandingConfigResult>;
  deleteBrandingConfig: () => Promise<DeleteBrandingConfigResult>;
}

interface StorageServiceMock {
  instance: StorageInstanceMock;
}

interface MinioServiceMock {
  uploadFile: (
    bucket: string,
    filename: string,
    buffer: Buffer,
    mimetype: string,
  ) => Promise<void>;
  getObjectStream: (
    bucket: string,
    filename: string,
  ) => Promise<NodeJS.ReadableStream>;
  assetsBucket: string;
}

describe('BrandingService', () => {
  let service: BrandingService;
  let storageMock: StorageServiceMock;
  let minioMock: MinioServiceMock;

  const mockBrandingConfig: BrandingConfig = {
    id: 1,
    config: JSON.stringify({
      colors: { primary: '#3B82F6' },
      organization: { name: 'Test Organization' },
    }),
    updatedBy: 'admin@test.com',
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    storageMock = {
      instance: {
        getBrandingConfig: vi.fn<StorageInstanceMock['getBrandingConfig']>(),
        updateBrandingConfig: vi.fn<StorageInstanceMock['updateBrandingConfig']>(),
        deleteBrandingConfig: vi.fn<StorageInstanceMock['deleteBrandingConfig']>(),
      },
    };

    minioMock = {
      uploadFile: vi.fn<MinioServiceMock['uploadFile']>(),
      getObjectStream: vi.fn<MinioServiceMock['getObjectStream']>(),
      assetsBucket: 'assets',
    };

    service = new BrandingService(
      storageMock as unknown as StorageService,
      minioMock as unknown as MinIOService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('getBrandingConfig', () => {
    it('returns default config when no custom config exists', async () => {
      storageMock.instance.getBrandingConfig = vi
        .fn<StorageInstanceMock['getBrandingConfig']>()
        .mockResolvedValue({ success: true, data: null });

      const result = await service.getBrandingConfig();

      expect(result.isDefault).toBe(true);
      expect(JSON.parse(result.config)).toHaveProperty('organization');
      expect(storageMock.instance.getBrandingConfig).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException when storage returns known error', async () => {
      storageMock.instance.getBrandingConfig = vi
        .fn<StorageInstanceMock['getBrandingConfig']>()
        .mockResolvedValue({ success: false, error: new Error('Database connection failed') });

      await expect(service.getBrandingConfig()).rejects.toThrow(BadRequestException);
      await expect(service.getBrandingConfig()).rejects.toThrow('Database connection failed');
    });

    it('throws BadRequestException when storage returns unknown error', async () => {
      storageMock.instance.getBrandingConfig = vi
        .fn<StorageInstanceMock['getBrandingConfig']>()
        .mockResolvedValue({ success: false });

      await expect(service.getBrandingConfig()).rejects.toThrow('Unknown error');
    });

    it('returns existing config unchanged when already normalized', async () => {
      const normalizedConfig = JSON.stringify({
        logoFilename: 'logo-main.png',
        logoUrl: '/api/admin/branding/logo/logo-main.png',
      });

      storageMock.instance.getBrandingConfig = vi
        .fn<StorageInstanceMock['getBrandingConfig']>()
        .mockResolvedValue({
          success: true,
          data: { ...mockBrandingConfig, config: normalizedConfig },
        });

      const result = await service.getBrandingConfig();

      expect(result.isDefault).toBe(false);
      expect(result.config).toBe(normalizedConfig);
      expect(storageMock.instance.updateBrandingConfig).not.toHaveBeenCalled();
    });

    it('normalizes legacy logo URL and persists updated config', async () => {
      const legacyConfig = JSON.stringify({
        logoUrl: 'https://cdn.example.com/assets/logo-legacy.png',
      });

      storageMock.instance.getBrandingConfig = vi
        .fn<StorageInstanceMock['getBrandingConfig']>()
        .mockResolvedValue({
          success: true,
          data: { ...mockBrandingConfig, config: legacyConfig, updatedBy: null },
        });

      storageMock.instance.updateBrandingConfig = vi
        .fn<StorageInstanceMock['updateBrandingConfig']>()
        .mockResolvedValue({
          success: true,
          data: mockBrandingConfig,
        });

      const result = await service.getBrandingConfig();
      const parsed = JSON.parse(result.config) as {
        logoFilename: string;
        logoUrl: string;
      };

      expect(parsed.logoFilename).toBe('logo-legacy.png');
      expect(parsed.logoUrl).toBe('/api/admin/branding/logo/logo-legacy.png');
      expect(storageMock.instance.updateBrandingConfig).toHaveBeenCalledWith(
        result.config,
        'system@branding.local',
      );
    });

    it('cleans absolute legacy URL with unextractable filename', async () => {
      const legacyConfig = JSON.stringify({
        logoFilename: 'folder/logo.png',
        logoUrl: 'https://minio.internal:9000/random/path/logo.png',
      });

      storageMock.instance.getBrandingConfig = vi
        .fn<StorageInstanceMock['getBrandingConfig']>()
        .mockResolvedValue({
          success: true,
          data: { ...mockBrandingConfig, config: legacyConfig },
        });

      storageMock.instance.updateBrandingConfig = vi
        .fn<StorageInstanceMock['updateBrandingConfig']>()
        .mockResolvedValue({ success: true, data: mockBrandingConfig });

      const result = await service.getBrandingConfig();
      const parsed = JSON.parse(result.config) as Record<string, unknown>;

      expect(parsed.logoUrl).toBeUndefined();
      expect(storageMock.instance.updateBrandingConfig).toHaveBeenCalledTimes(1);
    });

    it('does not fail when normalization persistence fails', async () => {
      const legacyConfig = JSON.stringify({
        logoUrl: '/assets/logo-fallback.png',
      });

      storageMock.instance.getBrandingConfig = vi
        .fn<StorageInstanceMock['getBrandingConfig']>()
        .mockResolvedValue({
          success: true,
          data: { ...mockBrandingConfig, config: legacyConfig },
        });

      storageMock.instance.updateBrandingConfig = vi
        .fn<StorageInstanceMock['updateBrandingConfig']>()
        .mockRejectedValue(new Error('Write failed'));

      const result = await service.getBrandingConfig();

      expect(result.config).toContain('/api/admin/branding/logo/logo-fallback.png');
      expect(result.isDefault).toBe(false);
    });
  });

  describe('updateBrandingConfig', () => {
    const userEmail = 'admin@test.com';
    const validConfig = JSON.stringify({ colors: { primary: '#00a844' } });

    it('throws when config is missing', async () => {
      await expect(service.updateBrandingConfig('', userEmail)).rejects.toThrow(
        'Configuration manquante',
      );
    });

    it('throws when storage update fails', async () => {
      storageMock.instance.updateBrandingConfig = vi
        .fn<StorageInstanceMock['updateBrandingConfig']>()
        .mockResolvedValue({ success: false, error: new Error('Failed to update') });

      await expect(service.updateBrandingConfig(validConfig, userEmail)).rejects.toThrow(
        'Failed to update',
      );
    });

    it('returns updated config when storage update succeeds', async () => {
      const updated: BrandingConfig = {
        ...mockBrandingConfig,
        config: validConfig,
        updatedBy: userEmail,
      };

      storageMock.instance.updateBrandingConfig = vi
        .fn<StorageInstanceMock['updateBrandingConfig']>()
        .mockResolvedValue({ success: true, data: updated });

      const result = await service.updateBrandingConfig(validConfig, userEmail);

      expect(result).toEqual(updated);
      expect(storageMock.instance.updateBrandingConfig).toHaveBeenCalledWith(
        validConfig,
        userEmail,
      );
    });
  });

  describe('resetBrandingConfig', () => {
    it('returns default branding after successful reset', async () => {
      storageMock.instance.deleteBrandingConfig = vi
        .fn<StorageInstanceMock['deleteBrandingConfig']>()
        .mockResolvedValue({ success: true });

      const result = await service.resetBrandingConfig();

      expect(result.isDefault).toBe(true);
      expect(JSON.parse(result.config)).toHaveProperty('app');
      expect(storageMock.instance.deleteBrandingConfig).toHaveBeenCalledTimes(1);
    });

    it('throws when reset fails', async () => {
      storageMock.instance.deleteBrandingConfig = vi
        .fn<StorageInstanceMock['deleteBrandingConfig']>()
        .mockResolvedValue({ success: false, error: new Error('Delete failed') });

      await expect(service.resetBrandingConfig()).rejects.toThrow('Delete failed');
    });
  });

  describe('uploadLogo', () => {
    const userEmail = 'admin@test.com';
    const mockFile: Express.Multer.File = {
      fieldname: 'logo',
      originalname: 'company-logo.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 128,
      destination: '',
      filename: '',
      path: '',
      buffer: Buffer.from('png-bytes'),
      stream: Readable.from([]),
    };

    it('uploads logo and stores branding config for default branding', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

      storageMock.instance.getBrandingConfig = vi
        .fn<StorageInstanceMock['getBrandingConfig']>()
        .mockResolvedValue({ success: true, data: null });

      storageMock.instance.updateBrandingConfig = vi
        .fn<StorageInstanceMock['updateBrandingConfig']>()
        .mockResolvedValue({ success: true, data: mockBrandingConfig });

      minioMock.uploadFile = vi.fn<MinioServiceMock['uploadFile']>().mockResolvedValue();

      const result = await service.uploadLogo(mockFile, userEmail);

      expect(result).toEqual({
        filename: 'logo-1700000000000.png',
        url: '/api/admin/branding/logo/logo-1700000000000.png',
      });

      expect(minioMock.uploadFile).toHaveBeenCalledWith(
        'assets',
        'logo-1700000000000.png',
        mockFile.buffer,
        'image/png',
      );

      expect(storageMock.instance.updateBrandingConfig).toHaveBeenCalledWith(
        expect.stringContaining('"logoFilename":"logo-1700000000000.png"'),
        userEmail,
      );
    });

    it('merges uploaded logo into existing custom config', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1700000001234);

      const existingConfig = JSON.stringify({
        colors: { primary: '#123456' },
      });

      storageMock.instance.getBrandingConfig = vi
        .fn<StorageInstanceMock['getBrandingConfig']>()
        .mockResolvedValue({
          success: true,
          data: { ...mockBrandingConfig, config: existingConfig },
        });

      storageMock.instance.updateBrandingConfig = vi
        .fn<StorageInstanceMock['updateBrandingConfig']>()
        .mockResolvedValue({ success: true, data: mockBrandingConfig });

      minioMock.uploadFile = vi.fn<MinioServiceMock['uploadFile']>().mockResolvedValue();

      await service.uploadLogo(mockFile, userEmail);

      const updateCall = vi.mocked(storageMock.instance.updateBrandingConfig).mock.calls[0];
      const savedConfig = JSON.parse(updateCall[0]) as {
        colors: { primary: string };
        logoFilename: string;
        logoUrl: string;
      };

      expect(savedConfig.colors.primary).toBe('#123456');
      expect(savedConfig.logoFilename).toBe('logo-1700000001234.png');
    });

    it('rethrows BadRequestException from update flow', async () => {
      storageMock.instance.getBrandingConfig = vi
        .fn<StorageInstanceMock['getBrandingConfig']>()
        .mockResolvedValue({ success: true, data: null });

      storageMock.instance.updateBrandingConfig = vi
        .fn<StorageInstanceMock['updateBrandingConfig']>()
        .mockResolvedValue({ success: false, error: new Error('Persist failed') });

      minioMock.uploadFile = vi.fn<MinioServiceMock['uploadFile']>().mockResolvedValue();

      await expect(service.uploadLogo(mockFile, userEmail)).rejects.toThrow(BadRequestException);
      await expect(service.uploadLogo(mockFile, userEmail)).rejects.toThrow('Persist failed');
    });

    it('wraps generic upload errors in BadRequestException', async () => {
      minioMock.uploadFile = vi
        .fn<MinioServiceMock['uploadFile']>()
        .mockRejectedValue(new Error('MinIO unavailable'));

      await expect(service.uploadLogo(mockFile, userEmail)).rejects.toThrow(
        'Erreur lors de l\'upload du logo: MinIO unavailable',
      );
    });
  });

  describe('getLogoStream', () => {
    it('delegates stream retrieval to MinIO assets bucket', async () => {
      const stream = Readable.from(['logo']);
      minioMock.getObjectStream = vi
        .fn<MinioServiceMock['getObjectStream']>()
        .mockResolvedValue(stream);

      const result = await service.getLogoStream('logo.png');

      expect(result).toBe(stream);
      expect(minioMock.getObjectStream).toHaveBeenCalledWith('assets', 'logo.png');
    });
  });
});
