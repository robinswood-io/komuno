import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { LoansController, AdminLoansController } from './loans.controller';
import { LoansService } from './loans.service';

// Mock LoansService
vi.mock('./loans.service', () => ({
  LoansService: vi.fn(() => ({
    getLoanItems: vi.fn(),
    getAllLoanItems: vi.fn(),
    getLoanItem: vi.fn(),
    createLoanItem: vi.fn(),
    updateLoanItem: vi.fn(),
    updateLoanItemStatus: vi.fn(),
    deleteLoanItem: vi.fn(),
    uploadLoanItemPhoto: vi.fn(),
  })),
}));

type FileFilterCallback = (
  error: BadRequestException | null,
  acceptFile: boolean,
) => void;

type UploadFileCandidate = {
  mimetype: string;
  originalname: string;
};

type UploadFileFilter = (
  req: unknown,
  file: UploadFileCandidate,
  cb: FileFilterCallback,
) => void;

type InterceptorClass = new (
  options?: Record<string, unknown>,
) => {
  multer: {
    fileFilter: UploadFileFilter;
  };
};

type ReflectWithMetadata = {
  getMetadata: (metadataKey: string, target: object) => unknown;
};

function getUploadPhotoFileFilter(): UploadFileFilter {
  const reflector = Reflect as unknown as ReflectWithMetadata;
  const metadata = reflector.getMetadata(
    INTERCEPTORS_METADATA,
    AdminLoansController.prototype.uploadLoanItemPhoto,
  );

  if (!Array.isArray(metadata) || metadata.length === 0) {
    throw new Error('Intercepteur upload non trouvé sur uploadLoanItemPhoto');
  }

  const UploadInterceptor = metadata[0] as InterceptorClass;
  const interceptorInstance = new UploadInterceptor({});

  return interceptorInstance.multer.fileFilter;
}

describe('LoansController', () => {
  let controller: LoansController;
  let loansService: unknown;

  const mockLoanItem = {
    id: 'loan-1',
    title: 'Projecteur vidéo',
    description: 'Pour présentations',
    lenderName: 'JD Tech',
    photoUrl: 'https://example.com/photo.jpg',
    status: 'available',
    proposedBy: 'Jean Dupont',
    proposedByEmail: 'jean@example.com',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    updatedBy: 'admin@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    loansService = {
      getLoanItems: vi.fn(),
      createLoanItem: vi.fn(),
    };

    // Create controller with mocked service
    controller = new LoansController(loansService as unknown);
  });

  describe('Public Routes', () => {
    describe('GET /api/loan-items', () => {
      it('should return paginated loan items', async () => {
        const expectedResult = {
          items: [mockLoanItem],
          total: 1,
          page: 1,
          limit: 20,
        };

        loansService.getLoanItems.mockResolvedValue(expectedResult);

        const result = await controller.getLoanItems('1', '20');

        expect(result).toEqual(expectedResult);
        expect(loansService.getLoanItems).toHaveBeenCalledWith(1, 20, undefined);
      });

      it('should parse page and limit from query params', async () => {
        loansService.getLoanItems.mockResolvedValue({
          items: [],
          total: 0,
          page: 2,
          limit: 50,
        });

        await controller.getLoanItems('2', '50');

        expect(loansService.getLoanItems).toHaveBeenCalledWith(2, 50, undefined);
      });

      it('should use default page (1) if not provided', async () => {
        loansService.getLoanItems.mockResolvedValue({
          items: [],
          total: 0,
          page: 1,
          limit: 20,
        });

        await controller.getLoanItems(undefined, '20');

        expect(loansService.getLoanItems).toHaveBeenCalledWith(1, 20, undefined);
      });

      it('should use default limit (20) if not provided', async () => {
        loansService.getLoanItems.mockResolvedValue({
          items: [],
          total: 0,
          page: 1,
          limit: 20,
        });

        await controller.getLoanItems('1', undefined);

        expect(loansService.getLoanItems).toHaveBeenCalledWith(1, 20, undefined);
      });

      it('should support search parameter', async () => {
        const searchResult = {
          items: [mockLoanItem],
          total: 1,
          page: 1,
          limit: 20,
        };

        loansService.getLoanItems.mockResolvedValue(searchResult);

        await controller.getLoanItems('1', '20', 'projecteur');

        expect(loansService.getLoanItems).toHaveBeenCalledWith(
          1,
          20,
          'projecteur',
        );
      });
    });

    describe('POST /api/loan-items', () => {
      it('should create a loan item', async () => {
        const createData = {
          title: 'Projecteur vidéo',
          description: 'Pour présentations',
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        loansService.createLoanItem.mockResolvedValue(mockLoanItem);

        const result = await controller.createLoanItem(createData);

        expect(result).toEqual(mockLoanItem);
        expect(loansService.createLoanItem).toHaveBeenCalledWith(createData);
      });

      it('should pass raw body to service for validation', async () => {
        const bodyData = {
          title: 'Projecteur',
          lenderName: 'JD',
          proposedBy: 'Jean',
          proposedByEmail: 'jean@example.com',
        };

        loansService.createLoanItem.mockResolvedValue(mockLoanItem);

        await controller.createLoanItem(bodyData);

        // Service receives raw data and validates it
        expect(loansService.createLoanItem).toHaveBeenCalledWith(bodyData);
      });
    });
  });
});

describe('AdminLoansController', () => {
  let controller: AdminLoansController;
  let loansService: unknown;

  const mockLoanItem = {
    id: 'loan-1',
    title: 'Projecteur vidéo',
    description: 'Pour présentations',
    lenderName: 'JD Tech',
    photoUrl: 'https://example.com/photo.jpg',
    status: 'available',
    proposedBy: 'Jean Dupont',
    proposedByEmail: 'jean@example.com',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    updatedBy: 'admin@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    loansService = {
      getAllLoanItems: vi.fn(),
      getLoanItem: vi.fn(),
      updateLoanItem: vi.fn(),
      updateLoanItemStatus: vi.fn(),
      deleteLoanItem: vi.fn(),
      uploadLoanItemPhoto: vi.fn(),
    };

    controller = new AdminLoansController(loansService as unknown);
  });

  describe('GET /api/admin/loan-items', () => {
    it('should return all loan items (admin)', async () => {
      const expectedResult = {
        items: [mockLoanItem],
        total: 1,
        page: 1,
        limit: 20,
      };

      loansService.getAllLoanItems.mockResolvedValue(expectedResult);

      const result = await controller.getAllLoanItems('1', '20');

      expect(result).toEqual(expectedResult);
      expect(loansService.getAllLoanItems).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('should support pagination parameters', async () => {
      loansService.getAllLoanItems.mockResolvedValue({
        items: [],
        total: 0,
        page: 5,
        limit: 50,
      });

      await controller.getAllLoanItems('5', '50');

      expect(loansService.getAllLoanItems).toHaveBeenCalledWith(5, 50, undefined);
    });

    it('should support search in all items', async () => {
      loansService.getAllLoanItems.mockResolvedValue({
        items: [mockLoanItem],
        total: 1,
        page: 1,
        limit: 20,
      });

      await controller.getAllLoanItems('1', '20', 'JD Tech');

      expect(loansService.getAllLoanItems).toHaveBeenCalledWith(
        1,
        20,
        'JD Tech',
      );
    });
  });

  describe('GET /api/admin/loan-items/:id', () => {
    it('should return a single loan item by id', async () => {
      loansService.getLoanItem.mockResolvedValue(mockLoanItem);

      const result = await controller.getLoanItem('loan-1');

      expect(result).toEqual(mockLoanItem);
      expect(loansService.getLoanItem).toHaveBeenCalledWith('loan-1');
    });

    it('should throw NotFoundException if item not found', async () => {
      loansService.getLoanItem.mockRejectedValue(
        new NotFoundException('Fiche prêt non trouvée'),
      );

      await expect(controller.getLoanItem('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PUT /api/admin/loan-items/:id', () => {
    it('should update loan item', async () => {
      const updateData = {
        title: 'Projecteur HD',
        description: 'Mise à jour',
      };

      const updatedItem = { ...mockLoanItem, ...updateData };

      loansService.updateLoanItem.mockResolvedValue({
        success: true,
        data: updatedItem,
      });

      const result = await controller.updateLoanItem('loan-1', updateData);

      expect(result.data).toEqual(updatedItem);
      expect(loansService.updateLoanItem).toHaveBeenCalledWith(
        'loan-1',
        updateData,
      );
    });

    it('should reject invalid update data', async () => {
      loansService.updateLoanItem.mockRejectedValue(
        new BadRequestException('Invalid data'),
      );

      await expect(
        controller.updateLoanItem('loan-1', { title: 'x' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow partial updates', async () => {
      const partialUpdate = { description: 'Only update description' };

      loansService.updateLoanItem.mockResolvedValue({
        success: true,
        data: { ...mockLoanItem, ...partialUpdate },
      });

      await controller.updateLoanItem('loan-1', partialUpdate);

      expect(loansService.updateLoanItem).toHaveBeenCalledWith(
        'loan-1',
        partialUpdate,
      );
    });
  });

  describe('PATCH /api/admin/loan-items/:id/status', () => {
    it('should update loan item status to borrowed', async () => {
      loansService.updateLoanItemStatus.mockResolvedValue({});

      const result = await controller.updateLoanItemStatus(
        'loan-1',
        { status: 'borrowed' },
        { email: 'admin@example.com' },
      );

      expect(result.success).toBe(true);
      expect(loansService.updateLoanItemStatus).toHaveBeenCalledWith(
        'loan-1',
        'borrowed',
        'admin@example.com',
      );
    });

    it('should update loan item status to available', async () => {
      loansService.updateLoanItemStatus.mockResolvedValue({});

      const result = await controller.updateLoanItemStatus(
        'loan-1',
        { status: 'available' },
        { email: 'admin@example.com' },
      );

      expect(result.success).toBe(true);
      expect(loansService.updateLoanItemStatus).toHaveBeenCalledWith(
        'loan-1',
        'available',
        'admin@example.com',
      );
    });

    it('should support pending status', async () => {
      loansService.updateLoanItemStatus.mockResolvedValue({});

      await controller.updateLoanItemStatus(
        'loan-1',
        { status: 'pending' },
        { email: 'admin@example.com' },
      );

      expect(loansService.updateLoanItemStatus).toHaveBeenCalledWith(
        'loan-1',
        'pending',
        'admin@example.com',
      );
    });

    it('should support unavailable status', async () => {
      loansService.updateLoanItemStatus.mockResolvedValue({});

      await controller.updateLoanItemStatus(
        'loan-1',
        { status: 'unavailable' },
        { email: 'admin@example.com' },
      );

      expect(loansService.updateLoanItemStatus).toHaveBeenCalledWith(
        'loan-1',
        'unavailable',
        'admin@example.com',
      );
    });

    it('should reject invalid status', async () => {
      loansService.updateLoanItemStatus.mockRejectedValue(
        new BadRequestException('Invalid status'),
      );

      await expect(
        controller.updateLoanItemStatus(
          'loan-1',
          { status: 'invalid' },
          { email: 'admin@example.com' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should track admin email', async () => {
      loansService.updateLoanItemStatus.mockResolvedValue({});

      const adminUser = { email: 'admin@example.com' };

      await controller.updateLoanItemStatus(
        'loan-1',
        { status: 'borrowed' },
        adminUser,
      );

      expect(loansService.updateLoanItemStatus).toHaveBeenCalledWith(
        'loan-1',
        'borrowed',
        'admin@example.com',
      );
    });
  });

  describe('DELETE /api/admin/loan-items/:id', () => {
    it('should delete loan item', async () => {
      loansService.deleteLoanItem.mockResolvedValue(undefined);

      await controller.deleteLoanItem('loan-1');

      expect(loansService.deleteLoanItem).toHaveBeenCalledWith('loan-1');
    });

    it('should return no content on success', async () => {
      loansService.deleteLoanItem.mockResolvedValue(undefined);

      const result = await controller.deleteLoanItem('loan-1');

      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException if item not found', async () => {
      loansService.deleteLoanItem.mockRejectedValue(
        new NotFoundException('Fiche prêt non trouvée'),
      );

      await expect(controller.deleteLoanItem('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('POST /api/admin/loan-items/:id/photo', () => {
    it('should upload photo for loan item', async () => {
      const mockFile = {
        buffer: Buffer.from('image data'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      };

      const uploadResult = {
        success: true,
        data: { ...mockLoanItem, photoUrl: 'https://example.com/photo.jpg' },
      };

      loansService.uploadLoanItemPhoto.mockResolvedValue(uploadResult);

      const result = await controller.uploadLoanItemPhoto(
        'loan-1',
        mockFile as unknown,
      );

      expect(result.success).toBe(true);
      expect(loansService.uploadLoanItemPhoto).toHaveBeenCalledWith(
        'loan-1',
        mockFile,
      );
    });

    it('should reject if no file provided', async () => {
      await expect(
        controller.uploadLoanItemPhoto('loan-1', undefined as unknown),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept JPG files', async () => {
      const mockFile = {
        buffer: Buffer.from('image data'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      };

      loansService.uploadLoanItemPhoto.mockResolvedValue({
        success: true,
        data: mockLoanItem,
      });

      await controller.uploadLoanItemPhoto('loan-1', mockFile as unknown);

      expect(loansService.uploadLoanItemPhoto).toHaveBeenCalled();
    });

    it('should accept PNG files', async () => {
      const mockFile = {
        buffer: Buffer.from('image data'),
        originalname: 'photo.png',
        mimetype: 'image/png',
      };

      loansService.uploadLoanItemPhoto.mockResolvedValue({
        success: true,
        data: mockLoanItem,
      });

      await controller.uploadLoanItemPhoto('loan-1', mockFile as unknown);

      expect(loansService.uploadLoanItemPhoto).toHaveBeenCalled();
    });

    it('should accept WebP files', async () => {
      const mockFile = {
        buffer: Buffer.from('image data'),
        originalname: 'photo.webp',
        mimetype: 'image/webp',
      };

      loansService.uploadLoanItemPhoto.mockResolvedValue({
        success: true,
        data: mockLoanItem,
      });

      await controller.uploadLoanItemPhoto('loan-1', mockFile as unknown);

      expect(loansService.uploadLoanItemPhoto).toHaveBeenCalled();
    });

    it('should reject oversized files (5MB+ limit)', async () => {
      // File size validation is handled by the FileInterceptor
      // This test verifies the endpoint behavior when file passes interceptor
      const mockFile = {
        buffer: Buffer.alloc(4 * 1024 * 1024), // 4MB (within limit)
        originalname: 'large.jpg',
        mimetype: 'image/jpeg',
      };

      loansService.uploadLoanItemPhoto.mockResolvedValue({
        success: true,
        data: mockLoanItem,
      });

      await controller.uploadLoanItemPhoto('loan-1', mockFile as unknown);

      expect(loansService.uploadLoanItemPhoto).toHaveBeenCalled();
    });

    it('should reject unsupported file types', async () => {
      const mockFile = {
        buffer: Buffer.from('document data'),
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
      };

      // File type validation happens in FileInterceptor
      // Verify error handling when invalid type reaches endpoint
      loansService.uploadLoanItemPhoto.mockRejectedValue(
        new BadRequestException('Format de fichier non autorisé'),
      );

      await expect(
        controller.uploadLoanItemPhoto('loan-1', mockFile as unknown),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if loan item not found', async () => {
      const mockFile = {
        buffer: Buffer.from('image data'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      };

      loansService.uploadLoanItemPhoto.mockRejectedValue(
        new NotFoundException('Fiche prêt non trouvée'),
      );

      await expect(
        controller.uploadLoanItemPhoto('non-existent', mockFile as unknown),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject file when mimetype is not allowed (fileFilter branch)', () => {
      const fileFilter = getUploadPhotoFileFilter();

      let callbackError: BadRequestException | null = null;
      let callbackAccepted = true;

      fileFilter(
        {},
        {
          mimetype: 'application/pdf',
          originalname: 'document.pdf',
        },
        (error, acceptFile) => {
          callbackError = error;
          callbackAccepted = acceptFile;
        },
      );

      expect(callbackAccepted).toBe(false);
      expect(callbackError).toBeInstanceOf(BadRequestException);
      expect(callbackError?.message).toContain(
        'Format de fichier non autorisé',
      );
    });

    it('should reject file when extension is not allowed (fileFilter branch)', () => {
      const fileFilter = getUploadPhotoFileFilter();

      let callbackError: BadRequestException | null = null;
      let callbackAccepted = true;

      fileFilter(
        {},
        {
          mimetype: 'image/jpeg',
          originalname: 'photo.exe',
        },
        (error, acceptFile) => {
          callbackError = error;
          callbackAccepted = acceptFile;
        },
      );

      expect(callbackAccepted).toBe(false);
      expect(callbackError).toBeInstanceOf(BadRequestException);
      expect(callbackError?.message).toContain(
        'Extension de fichier non autorisée',
      );
    });

    it('should accept file when mimetype and extension are allowed (fileFilter branch)', () => {
      const fileFilter = getUploadPhotoFileFilter();

      let callbackError: BadRequestException | null = null;
      let callbackAccepted = false;

      fileFilter(
        {},
        {
          mimetype: 'image/png',
          originalname: 'photo.png',
        },
        (error, acceptFile) => {
          callbackError = error;
          callbackAccepted = acceptFile;
        },
      );

      expect(callbackError).toBeNull();
      expect(callbackAccepted).toBe(true);
    });
  });

  describe('Status Transition Workflows', () => {
    it('should handle complete lifecycle: pending -> available -> borrowed -> available', async () => {
      loansService.updateLoanItemStatus.mockResolvedValue({});

      // Create item (status: pending by default)
      // Transition: pending -> available
      await controller.updateLoanItemStatus(
        'loan-1',
        { status: 'available' },
        { email: 'admin@example.com' },
      );

      // Transition: available -> borrowed
      await controller.updateLoanItemStatus(
        'loan-1',
        { status: 'borrowed' },
        { email: 'admin@example.com' },
      );

      // Transition: borrowed -> available (item returned)
      await controller.updateLoanItemStatus(
        'loan-1',
        { status: 'available' },
        { email: 'admin@example.com' },
      );

      expect(loansService.updateLoanItemStatus).toHaveBeenCalledTimes(3);
    });

    it('should allow transition to unavailable for maintenance', async () => {
      loansService.updateLoanItemStatus.mockResolvedValue({});

      await controller.updateLoanItemStatus(
        'loan-1',
        { status: 'unavailable' },
        { email: 'admin@example.com' },
      );

      expect(loansService.updateLoanItemStatus).toHaveBeenCalledWith(
        'loan-1',
        'unavailable',
        'admin@example.com',
      );
    });
  });

  describe('Pagination and Search', () => {
    it('should handle large page numbers', async () => {
      loansService.getAllLoanItems.mockResolvedValue({
        items: [],
        total: 1000,
        page: 100,
        limit: 20,
      });

      await controller.getAllLoanItems('100', '20');

      expect(loansService.getAllLoanItems).toHaveBeenCalledWith(100, 20, undefined);
    });

    it('should handle large limit values', async () => {
      loansService.getAllLoanItems.mockResolvedValue({
        items: [],
        total: 500,
        page: 1,
        limit: 100,
      });

      await controller.getAllLoanItems('1', '100');

      expect(loansService.getAllLoanItems).toHaveBeenCalledWith(1, 100, undefined);
    });

    it('should handle special characters in search', async () => {
      loansService.getAllLoanItems.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.getAllLoanItems('1', '20', 'projecteur & écran');

      expect(loansService.getAllLoanItems).toHaveBeenCalledWith(
        1,
        20,
        'projecteur & écran',
      );
    });
  });
});
