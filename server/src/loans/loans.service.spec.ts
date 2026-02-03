import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LoansService } from './loans.service';
import { StorageService } from '../common/storage/storage.service';
import { MinIOService } from '../integrations/minio/minio.service';
import * as schema from '../../../shared/schema';
import { ZodError } from 'zod';

// Mock services
vi.mock('../common/storage/storage.service');
vi.mock('../integrations/minio/minio.service');
vi.mock('../../notification-service', () => ({
  notificationService: {
    notifyNewLoanItem: vi.fn(),
  },
}));
vi.mock('../../email-notification-service', () => ({
  emailNotificationService: {
    notifyNewLoanItem: vi.fn(),
  },
}));
vi.mock('../../lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('LoansService', () => {
  let service: LoansService;
  let storageService: any;
  let minioService: any;

  const mockLoanItem = {
    id: 'loan-1',
    title: 'Projecteur vidéo',
    description: 'Pour présentations',
    lenderName: 'JD Tech',
    photoUrl: 'https://example.com/photo.jpg',
    status: 'available' as const,
    proposedBy: 'Jean Dupont',
    proposedByEmail: 'jean@example.com',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    updatedBy: 'admin@example.com',
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock instances
    storageService = {
      instance: {
        getLoanItems: vi.fn(),
        getAllLoanItems: vi.fn(),
        getLoanItem: vi.fn(),
        createLoanItem: vi.fn(),
        updateLoanItem: vi.fn(),
        updateLoanItemStatus: vi.fn(),
        deleteLoanItem: vi.fn(),
      },
    };

    minioService = {
      deleteFile: vi.fn(),
      uploadFile: vi.fn(),
      getPhotoUrl: vi.fn(),
    };

    // Create service instance with mocks
    service = new LoansService(
      storageService as any,
      minioService as any,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===== CRUD Tests =====

  describe('CRUD Operations', () => {
    describe('createLoanItem', () => {
      it('should create a loan item with valid data', async () => {
        const validData = {
          title: 'Projecteur vidéo',
          description: 'Pour présentations',
          lenderName: 'JD Tech',
          photoUrl: 'https://example.com/photo.jpg',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        storageService.instance.createLoanItem.mockResolvedValue({
          success: true,
          data: mockLoanItem,
        });

        const result = await service.createLoanItem(validData);

        expect(result).toEqual(mockLoanItem);
        expect(storageService.instance.createLoanItem).toHaveBeenCalledWith(
          expect.objectContaining({
            title: validData.title,
            proposedByEmail: validData.proposedByEmail,
          }),
        );
      });

      it('should throw BadRequestException when data is invalid', async () => {
        const invalidData = {
          title: 'x', // Too short
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        await expect(service.createLoanItem(invalidData)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException when email is invalid', async () => {
        const invalidData = {
          title: 'Projecteur vidéo',
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'invalid-email',
        };

        await expect(service.createLoanItem(invalidData)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw error if storage operation fails', async () => {
        const validData = {
          title: 'Projecteur vidéo',
          description: 'Pour présentations',
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        storageService.instance.createLoanItem.mockResolvedValue({
          success: false,
          error: new Error('Database error'),
        });

        await expect(service.createLoanItem(validData)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should sanitize text input in createLoanItem', async () => {
        const dataWithSpecialChars = {
          title: 'Projecteur <vidéo>',
          lenderName: 'JD "Tech"',
          proposedBy: 'Jean & Marie',
          proposedByEmail: 'jean@example.com',
        };

        storageService.instance.createLoanItem.mockResolvedValue({
          success: true,
          data: mockLoanItem,
        });

        await service.createLoanItem(dataWithSpecialChars);

        expect(storageService.instance.createLoanItem).toHaveBeenCalled();
      });
    });

    describe('getLoanItems', () => {
      it('should return paginated loan items', async () => {
        const mockData = {
          data: [mockLoanItem],
          total: 1,
          page: 1,
          limit: 20,
        };

        storageService.instance.getLoanItems.mockResolvedValue({
          success: true,
          data: mockData,
        });

        const result = await service.getLoanItems(1, 20);

        expect(result).toEqual({
          success: true,
          data: [mockLoanItem],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        });
        expect(storageService.instance.getLoanItems).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          search: undefined,
        });
      });

      it('should support search parameter', async () => {
        const expectedResult = {
          items: [mockLoanItem],
          total: 1,
          page: 1,
          limit: 20,
        };

        storageService.instance.getLoanItems.mockResolvedValue({
          success: true,
          data: expectedResult,
        });

        await service.getLoanItems(1, 20, 'projecteur');

        expect(storageService.instance.getLoanItems).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          search: 'projecteur',
        });
      });

      it('should throw error if storage fails', async () => {
        storageService.instance.getLoanItems.mockResolvedValue({
          success: false,
          error: new Error('Database error'),
        });

        await expect(service.getLoanItems(1, 20)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('getLoanItem', () => {
      it('should return a single loan item by id', async () => {
        storageService.instance.getLoanItem.mockResolvedValue({
          success: true,
          data: mockLoanItem,
        });

        const result = await service.getLoanItem('loan-1');

        expect(result).toEqual(mockLoanItem);
        expect(storageService.instance.getLoanItem).toHaveBeenCalledWith('loan-1');
      });

      it('should throw NotFoundException when item not found', async () => {
        storageService.instance.getLoanItem.mockResolvedValue({
          success: true,
          data: null,
        });

        await expect(service.getLoanItem('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw BadRequestException on storage error', async () => {
        storageService.instance.getLoanItem.mockResolvedValue({
          success: false,
          error: new Error('Database error'),
        });

        await expect(service.getLoanItem('loan-1')).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('updateLoanItem', () => {
      it('should update loan item with partial data', async () => {
        const updateData = {
          title: 'Projecteur vidéo HD',
          description: 'Pour grandes présentations',
        };

        const updatedItem = { ...mockLoanItem, ...updateData };

        storageService.instance.updateLoanItem.mockResolvedValue({
          success: true,
          data: updatedItem,
        });

        const result = await service.updateLoanItem('loan-1', updateData);

        expect(result.data).toEqual(updatedItem);
        expect(storageService.instance.updateLoanItem).toHaveBeenCalledWith(
          'loan-1',
          expect.objectContaining(updateData),
        );
      });

      it('should throw BadRequestException for invalid title length', async () => {
        const invalidData = {
          title: 'x', // Too short
        };

        await expect(
          service.updateLoanItem('loan-1', invalidData),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error if storage operation fails', async () => {
        const updateData = { title: 'New Title' };

        storageService.instance.updateLoanItem.mockResolvedValue({
          success: false,
          error: new Error('Database error'),
        });

        await expect(
          service.updateLoanItem('loan-1', updateData),
        ).rejects.toThrow(BadRequestException);
      });

      it('should allow updating only description', async () => {
        const updateData = {
          description: 'Updated description',
        };

        const updatedItem = { ...mockLoanItem, ...updateData };

        storageService.instance.updateLoanItem.mockResolvedValue({
          success: true,
          data: updatedItem,
        });

        await service.updateLoanItem('loan-1', updateData);

        expect(storageService.instance.updateLoanItem).toHaveBeenCalledWith(
          'loan-1',
          expect.objectContaining({ description: updateData.description }),
        );
      });
    });

    describe('deleteLoanItem', () => {
      it('should delete loan item successfully', async () => {
        storageService.instance.getLoanItem.mockResolvedValue({
          success: true,
          data: mockLoanItem,
        });

        storageService.instance.deleteLoanItem.mockResolvedValue({
          success: true,
        });

        minioService.deleteFile.mockResolvedValue(true);

        await service.deleteLoanItem('loan-1');

        expect(storageService.instance.deleteLoanItem).toHaveBeenCalledWith('loan-1');
      });

      it('should delete associated photo from MinIO', async () => {
        storageService.instance.getLoanItem.mockResolvedValue({
          success: true,
          data: mockLoanItem,
        });

        storageService.instance.deleteLoanItem.mockResolvedValue({
          success: true,
        });

        minioService.deleteFile.mockResolvedValue(true);

        await service.deleteLoanItem('loan-1');

        expect(minioService.deleteFile).toHaveBeenCalledWith(
          'photos',
          'photo.jpg',
        );
      });

      it('should handle missing photo gracefully', async () => {
        const itemWithoutPhoto = { ...mockLoanItem, photoUrl: null };

        storageService.instance.getLoanItem.mockResolvedValue({
          success: true,
          data: itemWithoutPhoto,
        });

        storageService.instance.deleteLoanItem.mockResolvedValue({
          success: true,
        });

        await service.deleteLoanItem('loan-1');

        expect(minioService.deleteFile).not.toHaveBeenCalled();
      });

      it('should throw error if storage deletion fails', async () => {
        storageService.instance.getLoanItem.mockResolvedValue({
          success: true,
          data: mockLoanItem,
        });

        storageService.instance.deleteLoanItem.mockResolvedValue({
          success: false,
          error: new Error('Database error'),
        });

        await expect(service.deleteLoanItem('loan-1')).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  // ===== Status Transitions Tests =====

  describe('Status Transitions', () => {
    describe('updateLoanItemStatus', () => {
      it('should transition from available to borrowed', async () => {
        const availableItem = { ...mockLoanItem, status: 'available' };
        const borrowedItem = { ...mockLoanItem, status: 'borrowed' };

        storageService.instance.updateLoanItemStatus.mockResolvedValue({
          success: true,
          data: borrowedItem,
        });

        await service.updateLoanItemStatus('loan-1', 'borrowed', 'admin@example.com');

        expect(storageService.instance.updateLoanItemStatus).toHaveBeenCalledWith(
          'loan-1',
          'borrowed',
          'admin@example.com',
        );
      });

      it('should transition from borrowed to available', async () => {
        const borrowedItem = { ...mockLoanItem, status: 'borrowed' };
        const returnedItem = { ...mockLoanItem, status: 'available' };

        storageService.instance.updateLoanItemStatus.mockResolvedValue({
          success: true,
          data: returnedItem,
        });

        await service.updateLoanItemStatus('loan-1', 'available');

        expect(storageService.instance.updateLoanItemStatus).toHaveBeenCalledWith(
          'loan-1',
          'available',
          undefined,
        );
      });

      it('should allow transition to unavailable', async () => {
        storageService.instance.updateLoanItemStatus.mockResolvedValue({
          success: true,
          data: { ...mockLoanItem, status: 'unavailable' },
        });

        await service.updateLoanItemStatus('loan-1', 'unavailable');

        expect(storageService.instance.updateLoanItemStatus).toHaveBeenCalledWith(
          'loan-1',
          'unavailable',
          undefined,
        );
      });

      it('should allow transition to pending', async () => {
        storageService.instance.updateLoanItemStatus.mockResolvedValue({
          success: true,
          data: { ...mockLoanItem, status: 'pending' },
        });

        await service.updateLoanItemStatus('loan-1', 'pending');

        expect(storageService.instance.updateLoanItemStatus).toHaveBeenCalledWith(
          'loan-1',
          'pending',
          undefined,
        );
      });

      it('should reject invalid status', async () => {
        await expect(
          service.updateLoanItemStatus('loan-1', 'invalid-status'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error if status update fails', async () => {
        storageService.instance.updateLoanItemStatus.mockResolvedValue({
          success: false,
          error: new Error('Database error'),
        });

        await expect(
          service.updateLoanItemStatus('loan-1', 'borrowed'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should track user email when status changed by admin', async () => {
        const adminEmail = 'admin@example.com';

        storageService.instance.updateLoanItemStatus.mockResolvedValue({
          success: true,
          data: mockLoanItem,
        });

        await service.updateLoanItemStatus('loan-1', 'borrowed', adminEmail);

        expect(storageService.instance.updateLoanItemStatus).toHaveBeenCalledWith(
          'loan-1',
          'borrowed',
          adminEmail,
        );
      });
    });
  });

  // ===== Validation Constraints Tests =====

  describe('Validation Constraints', () => {
    describe('Title validation', () => {
      it('should reject title shorter than 3 characters', async () => {
        const invalidData = {
          title: 'ab',
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        await expect(service.createLoanItem(invalidData)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should reject title longer than 200 characters', async () => {
        const longTitle = 'a'.repeat(201);
        const invalidData = {
          title: longTitle,
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        await expect(service.createLoanItem(invalidData)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should accept valid title (3-200 characters)', async () => {
        const validData = {
          title: 'Projecteur vidéo',
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        storageService.instance.createLoanItem.mockResolvedValue({
          success: true,
          data: mockLoanItem,
        });

        const result = await service.createLoanItem(validData);
        expect(result).toBeDefined();
      });
    });

    describe('Email validation', () => {
      it('should reject invalid email format', async () => {
        const invalidData = {
          title: 'Projecteur vidéo',
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'not-an-email',
        };

        await expect(service.createLoanItem(invalidData)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should accept valid email formats', async () => {
        const validEmails = [
          'user@example.com',
          'user.name@example.co.uk',
          'user+tag@example.com',
        ];

        for (const email of validEmails) {
          const validData = {
            title: 'Projecteur vidéo',
            lenderName: 'JD Tech',
            proposedBy: 'Jean Dupont',
            proposedByEmail: email,
          };

          storageService.instance.createLoanItem.mockResolvedValue({
            success: true,
            data: { ...mockLoanItem, proposedByEmail: email },
          });

          const result = await service.createLoanItem(validData);
          expect(result.proposedByEmail).toBe(email);
        }
      });
    });

    describe('Description validation', () => {
      it('should reject description longer than 5000 characters', async () => {
        const longDescription = 'a'.repeat(5001);
        const invalidData = {
          title: 'Projecteur vidéo',
          description: longDescription,
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        await expect(service.createLoanItem(invalidData)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should accept optional description', async () => {
        const validData = {
          title: 'Projecteur vidéo',
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        storageService.instance.createLoanItem.mockResolvedValue({
          success: true,
          data: { ...mockLoanItem, description: undefined },
        });

        const result = await service.createLoanItem(validData);
        expect(result).toBeDefined();
      });
    });

    describe('Lender name validation', () => {
      it('should reject lender name shorter than 2 characters', async () => {
        const invalidData = {
          title: 'Projecteur vidéo',
          lenderName: 'J',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        await expect(service.createLoanItem(invalidData)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should reject lender name longer than 100 characters', async () => {
        const longName = 'a'.repeat(101);
        const invalidData = {
          title: 'Projecteur vidéo',
          lenderName: longName,
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        await expect(service.createLoanItem(invalidData)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('Photo URL validation', () => {
      it('should reject invalid URL format', async () => {
        const invalidData = {
          title: 'Projecteur vidéo',
          lenderName: 'JD Tech',
          photoUrl: 'not-a-valid-url',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        await expect(service.createLoanItem(invalidData)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should accept valid photo URLs', async () => {
        const validUrls = [
          'https://example.com/photo.jpg',
          'http://example.com/photo.png',
          'https://cdn.example.com/images/photo.webp',
        ];

        for (const photoUrl of validUrls) {
          const validData = {
            title: 'Projecteur vidéo',
            lenderName: 'JD Tech',
            photoUrl,
            proposedBy: 'Jean Dupont',
            proposedByEmail: 'jean@example.com',
          };

          storageService.instance.createLoanItem.mockResolvedValue({
            success: true,
            data: { ...mockLoanItem, photoUrl },
          });

          const result = await service.createLoanItem(validData);
          expect(result.photoUrl).toBe(photoUrl);
        }
      });

      it('should make photo URL optional', async () => {
        const validData = {
          title: 'Projecteur vidéo',
          lenderName: 'JD Tech',
          proposedBy: 'Jean Dupont',
          proposedByEmail: 'jean@example.com',
        };

        storageService.instance.createLoanItem.mockResolvedValue({
          success: true,
          data: { ...mockLoanItem, photoUrl: undefined },
        });

        const result = await service.createLoanItem(validData);
        expect(result).toBeDefined();
      });
    });
  });

  // ===== Admin Routes Tests =====

  describe('Admin Operations', () => {
    describe('getAllLoanItems', () => {
      it('should return all loan items (admin)', async () => {
        const expectedResult = {
          items: [mockLoanItem],
          total: 1,
          page: 1,
          limit: 20,
        };

        storageService.instance.getAllLoanItems.mockResolvedValue({
          success: true,
          data: expectedResult,
        });

        const result = await service.getAllLoanItems(1, 20);

        expect(result).toEqual(expectedResult);
        expect(storageService.instance.getAllLoanItems).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          search: undefined,
        });
      });

      it('should support search for admin users', async () => {
        const expectedResult = {
          items: [mockLoanItem],
          total: 1,
          page: 1,
          limit: 20,
        };

        storageService.instance.getAllLoanItems.mockResolvedValue({
          success: true,
          data: expectedResult,
        });

        await service.getAllLoanItems(1, 20, 'projecteur');

        expect(storageService.instance.getAllLoanItems).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          search: 'projecteur',
        });
      });
    });
  });

  // ===== Photo Upload Tests =====

  describe('Photo Upload', () => {
    it('should upload photo for loan item', async () => {
      const file = {
        buffer: Buffer.from('image data'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      };

      storageService.instance.getLoanItem.mockResolvedValue({
        success: true,
        data: { ...mockLoanItem, photoUrl: null },
      });

      minioService.uploadFile.mockResolvedValue(true);
      minioService.deleteFile.mockResolvedValue(true);
      minioService.getPhotoUrl.mockResolvedValue('https://minio.example.com/photo.jpg');

      storageService.instance.updateLoanItem.mockResolvedValue({
        success: true,
        data: { ...mockLoanItem, photoUrl: 'https://minio.example.com/photo.jpg' },
      });

      const result = await service.uploadLoanItemPhoto('loan-1', file as any);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should delete old photo before uploading new one', async () => {
      const file = {
        buffer: Buffer.from('image data'),
        originalname: 'new-photo.jpg',
        mimetype: 'image/jpeg',
      };

      storageService.instance.getLoanItem.mockResolvedValue({
        success: true,
        data: mockLoanItem,
      });

      minioService.uploadFile.mockResolvedValue(true);
      minioService.getPhotoUrl.mockResolvedValue('https://minio.example.com/new-photo.jpg');
      minioService.deleteFile.mockResolvedValue(true);

      storageService.instance.updateLoanItem.mockResolvedValue({
        success: true,
        data: { ...mockLoanItem, photoUrl: 'https://minio.example.com/new-photo.jpg' },
      });

      await service.uploadLoanItemPhoto('loan-1', file as any);

      expect(minioService.deleteFile).toHaveBeenCalledWith('photos', 'photo.jpg');
    });

    it('should throw NotFoundException if loan item not found', async () => {
      const file = {
        buffer: Buffer.from('image data'),
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      };

      storageService.instance.getLoanItem.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(
        service.uploadLoanItemPhoto('non-existent', file as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
