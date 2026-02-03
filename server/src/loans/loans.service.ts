import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import {
  insertLoanItemSchema,
  updateLoanItemSchema,
  updateLoanItemStatusSchema,
} from '../../../shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { logger } from '../../lib/logger';
import { notificationService } from '../../notification-service';
import { emailNotificationService } from '../../email-notification-service';
import { MinIOService } from '../integrations/minio/minio.service';

/**
 * Service Loans - Gestion des prêts
 */
@Injectable()
export class LoansService {
  constructor(
    private readonly storageService: StorageService,
    private readonly minioService: MinIOService,
  ) {}

  // ===== Routes publiques =====

  async getLoanItems(page: number = 1, limit: number = 20, search?: string) {
    const result = await this.storageService.instance.getLoanItems({
      page,
      limit,
      search,
    });

    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }

    const totalPages = Math.ceil(result.data.total / result.data.limit);
    return {
      success: true,
      data: result.data.data,
      total: result.data.total,
      page: result.data.page,
      limit: result.data.limit,
      totalPages,
    };
  }

  async createLoanItem(data: unknown) {
    try {
      const validatedData = insertLoanItemSchema.parse(data);
      const result = await this.storageService.instance.createLoanItem(validatedData);

      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
      }

      // Envoyer notifications pour nouveau matériel
      try {
        await notificationService.notifyNewLoanItem({
          title: result.data.title,
          lenderName: result.data.lenderName,
        });

        await emailNotificationService.notifyNewLoanItem(result.data);
      } catch (notifError) {
        logger.warn('Loan item notification failed', { itemId: result.data.id, error: notifError });
      }

      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  // ===== Routes admin =====

  async getAllLoanItems(page: number = 1, limit: number = 20, search?: string) {
    const result = await this.storageService.instance.getAllLoanItems({ page, limit, search });

    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }

    const totalPages = Math.ceil(result.data.total / result.data.limit);
    return {
      success: true,
      data: result.data.data,
      total: result.data.total,
      page: result.data.page,
      limit: result.data.limit,
      totalPages,
    };
  }

  async getLoanItem(id: string) {
    const result = await this.storageService.instance.getLoanItem(id);

    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }

    if (!result.data) {
      throw new NotFoundException('Fiche prêt non trouvée');
    }

    return result.data;
  }

  async updateLoanItem(id: string, data: unknown) {
    try {
      const validatedData = updateLoanItemSchema.parse(data);
      const result = await this.storageService.instance.updateLoanItem(id, validatedData);

      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
      }

      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async updateLoanItemStatus(id: string, status: unknown, userEmail?: string) {
    try {
      const validatedData = updateLoanItemStatusSchema.parse({ status });
      const result = await this.storageService.instance.updateLoanItemStatus(
        id,
        validatedData.status,
        userEmail,
      );

      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async deleteLoanItem(id: string) {
    // Récupérer l'item avant suppression pour supprimer la photo
    const itemResult = await this.storageService.instance.getLoanItem(id);
    if (itemResult.success && itemResult.data?.photoUrl) {
      try {
        // Extraire le nom du fichier de l'URL
        const urlParts = itemResult.data.photoUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        if (filename) {
          await this.minioService.deleteFile('photos', filename).catch((err) => {
            logger.warn('Failed to delete loan item photo from MinIO', { filename, error: err });
          });
        }
      } catch (error) {
        logger.warn('Failed to delete loan item photo', { itemId: id, error });
      }
    }

    const result = await this.storageService.instance.deleteLoanItem(id);
    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }
  }

  async uploadLoanItemPhoto(id: string, file: Express.Multer.File) {
    try {
      // Vérifier que l'item existe
      const itemResult = await this.storageService.instance.getLoanItem(id);
      if (!itemResult.success || !itemResult.data) {
        throw new NotFoundException('Fiche prêt non trouvée');
      }

      // Supprimer l'ancienne photo si elle existe
      if (itemResult.data.photoUrl) {
        const urlParts = itemResult.data.photoUrl.split('/');
        const oldFilename = urlParts[urlParts.length - 1];
        if (oldFilename) {
          await this.minioService.deleteFile('photos', oldFilename).catch((err) => {
            logger.warn('Failed to delete old loan item photo', { filename: oldFilename, error: err });
          });
        }
      }

      // Uploader la nouvelle photo vers MinIO
      const filename = `loan-item-${id}-${Date.now()}-${file.originalname}`;
      const buffer = Buffer.from(file.buffer);
      await this.minioService.uploadFile('photos', filename, buffer, file.mimetype);

      // Mettre à jour l'item avec la nouvelle URL
      const photoUrl = await this.minioService.getPhotoUrl(filename);
      const updateResult = await this.storageService.instance.updateLoanItem(id, { photoUrl });

      if (!updateResult.success) {
        const error = 'error' in updateResult ? updateResult.error : new Error('Unknown error');
        throw new BadRequestException(error.message);
      }

      return { success: true, data: updateResult.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }
}
