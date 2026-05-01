import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Admin } from '@shared/schema';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';

type BrandingServiceMethods = Pick<
  BrandingService,
  | 'getBrandingConfig'
  | 'getLogoStream'
  | 'updateBrandingConfig'
  | 'resetBrandingConfig'
  | 'uploadLogo'
>;

type MockedBrandingService = {
  [K in keyof BrandingServiceMethods]: ReturnType<typeof vi.fn>;
};

const makeAdmin = (): Admin => ({
  email: 'admin@komuno.test',
  firstName: 'Admin',
  lastName: 'Komuno',
  password: null,
  addedBy: null,
  role: 'super_admin',
  status: 'active',
  isActive: true,
  notificationEmail: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

const makeUploadedFile = (
  overrides: Partial<Express.Multer.File> = {}
): Express.Multer.File => ({
  fieldname: 'logo',
  originalname: 'logo.png',
  encoding: '7bit',
  mimetype: 'image/png',
  size: 1024,
  destination: '',
  filename: 'logo.png',
  path: '',
  buffer: Buffer.from('file-content'),
  stream: ReadableStream.from([]),
  ...overrides,
});

class ReadableStream {
  static from(chunks: Uint8Array[]): NodeJS.ReadableStream {
    const stream = {
      pipe: vi.fn(),
      readable: true,
      read: () => null,
      setEncoding: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      isPaused: vi.fn(),
      unpipe: vi.fn(),
      unshift: vi.fn(),
      wrap: vi.fn(),
      [Symbol.asyncIterator]: async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      },
      on: vi.fn(),
      once: vi.fn(),
      removeListener: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn(),
      listeners: vi.fn(),
      rawListeners: vi.fn(),
      emit: vi.fn(),
      listenerCount: vi.fn(),
      prependListener: vi.fn(),
      prependOnceListener: vi.fn(),
      eventNames: vi.fn(),
      addListener: vi.fn(),
    };

    return stream as unknown as NodeJS.ReadableStream;
  }
}

describe('BrandingController', () => {
  let controller: BrandingController;
  let mockService: MockedBrandingService;

  beforeEach(() => {
    mockService = {
      getBrandingConfig: vi.fn(),
      getLogoStream: vi.fn(),
      updateBrandingConfig: vi.fn(),
      resetBrandingConfig: vi.fn(),
      uploadLogo: vi.fn(),
    };

    controller = new BrandingController(
      mockService as unknown as BrandingService
    );
  });

  describe('getBranding', () => {
    it('retourne success=true avec la config', async () => {
      const brandingConfig = {
        config: '{"colors":{"primary":"#123456"}}',
        isDefault: false,
      };
      mockService.getBrandingConfig.mockResolvedValue(brandingConfig);

      const result = await controller.getBranding();

      expect(result).toEqual({ success: true, data: brandingConfig });
      expect(mockService.getBrandingConfig).toHaveBeenCalledTimes(1);
    });

    it('propage les erreurs du service', async () => {
      mockService.getBrandingConfig.mockRejectedValue(
        new BadRequestException('Erreur lecture branding')
      );

      await expect(controller.getBranding()).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getLogoByFilename', () => {
    const makeResponse = (): Response => {
      const res = {
        setHeader: vi.fn(),
      };

      return res as unknown as Response;
    };

    it('rejette un nom de fichier invalide', async () => {
      const res = makeResponse();

      await expect(
        controller.getLogoByFilename('../invalid.png', res)
      ).rejects.toThrow(BadRequestException);
      expect(mockService.getLogoStream).not.toHaveBeenCalled();
    });

    it('sert le logo avec content-type image/png', async () => {
      const stream = ReadableStream.from([]);
      const pipeSpy = vi.spyOn(stream, 'pipe');
      const res = makeResponse();
      mockService.getLogoStream.mockResolvedValue(stream);

      await controller.getLogoByFilename('logo.png', res);

      expect(mockService.getLogoStream).toHaveBeenCalledWith('logo.png');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=3600'
      );
      expect(pipeSpy).toHaveBeenCalledWith(res);
    });

    it('applique application/octet-stream pour une extension inconnue', async () => {
      const stream = ReadableStream.from([]);
      const res = makeResponse();
      mockService.getLogoStream.mockResolvedValue(stream);

      await controller.getLogoByFilename('logo.unknownext', res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream'
      );
    });

    it('retourne NotFoundException si le service échoue', async () => {
      const res = makeResponse();
      mockService.getLogoStream.mockRejectedValue(new Error('Not found'));

      await expect(
        controller.getLogoByFilename('missing.png', res)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBranding', () => {
    const admin = makeAdmin();

    it('met à jour la config avec success=true', async () => {
      const body = { config: '{"organization":{"name":"Komuno"}}' };
      const updatedConfig = { id: 1, config: body.config, updatedBy: admin.email };
      mockService.updateBrandingConfig.mockResolvedValue(updatedConfig);

      const result = await controller.updateBranding(body, admin);

      expect(mockService.updateBrandingConfig).toHaveBeenCalledWith(
        body.config,
        admin.email
      );
      expect(result).toEqual({ success: true, data: updatedConfig });
    });

    it('propage les erreurs du service', async () => {
      mockService.updateBrandingConfig.mockRejectedValue(
        new BadRequestException('Configuration invalide')
      );

      await expect(
        controller.updateBranding({ config: '{"bad":true}' }, admin)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetBranding', () => {
    it('réinitialise la config avec success=true', async () => {
      const defaultConfig = {
        config: '{"organization":{"name":"Default"}}',
        isDefault: true,
      };
      mockService.resetBrandingConfig.mockResolvedValue(defaultConfig);

      const result = await controller.resetBranding();

      expect(mockService.resetBrandingConfig).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, data: defaultConfig });
    });

    it('propage les erreurs du service', async () => {
      mockService.resetBrandingConfig.mockRejectedValue(
        new BadRequestException('Reset impossible')
      );

      await expect(controller.resetBranding()).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('uploadLogo', () => {
    const admin = makeAdmin();

    it('rejette si aucun fichier n\'est fourni', async () => {
      await expect(
        controller.uploadLogo(undefined as unknown as Express.Multer.File, admin)
      ).rejects.toThrow(BadRequestException);
      expect(mockService.uploadLogo).not.toHaveBeenCalled();
    });

    it('rejette un mime type non autorisé', async () => {
      const file = makeUploadedFile({
        mimetype: 'text/plain',
        originalname: 'logo.txt',
      });

      await expect(controller.uploadLogo(file, admin)).rejects.toThrow(
        BadRequestException
      );
      expect(mockService.uploadLogo).not.toHaveBeenCalled();
    });

    it('rejette un fichier trop volumineux (> 5MB)', async () => {
      const file = makeUploadedFile({
        size: 5 * 1024 * 1024 + 1,
      });

      await expect(controller.uploadLogo(file, admin)).rejects.toThrow(
        BadRequestException
      );
      expect(mockService.uploadLogo).not.toHaveBeenCalled();
    });

    it('upload le logo avec success=true pour un fichier valide', async () => {
      const file = makeUploadedFile();
      const uploadResult = {
        filename: 'logo-1710000000000.png',
        url: '/api/admin/branding/logo/logo-1710000000000.png',
      };
      mockService.uploadLogo.mockResolvedValue(uploadResult);

      const result = await controller.uploadLogo(file, admin);

      expect(mockService.uploadLogo).toHaveBeenCalledWith(file, admin.email);
      expect(result).toEqual({ success: true, data: uploadResult });
    });

    it('propage les erreurs du service', async () => {
      const file = makeUploadedFile();
      mockService.uploadLogo.mockRejectedValue(
        new BadRequestException('Erreur upload')
      );

      await expect(controller.uploadLogo(file, admin)).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
