import { Injectable, BadRequestException, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import {
  insertPatronSchema,
  updatePatronSchema,
  insertPatronDonationSchema,
  insertPatronUpdateSchema,
  updatePatronUpdateSchema,
  insertEventSponsorshipSchema,
  updateEventSponsorshipSchema,
  updateIdeaPatronProposalSchema,
  DuplicateError,
} from '../../../shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { logger } from '../../lib/logger';

/**
 * Service Patrons - Gestion des mécènes
 */
@Injectable()
export class PatronsService {
  constructor(private readonly storageService: StorageService) {}

  // ===== Routes publiques =====

  async proposePatron(data: unknown, userEmail?: string) {
    try {
      const validatedData = insertPatronSchema.parse(data);

      const result = await this.storageService.instance.proposePatron({
        ...validatedData,
        createdBy: userEmail || validatedData.createdBy || 'anonymous',
      });

      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
        if (error instanceof DuplicateError) {
          throw new ConflictException(error.message);
        }
        throw new BadRequestException(error.message);
      }

      // Enregistrer une métrique de tracking pour la proposition
      if (result.data) {
        await this.storageService.instance
          .createTrackingMetric({
            entityType: 'patron',
            entityId: result.data.id,
            entityEmail: result.data.email,
            metricType: 'status_change',
            metricValue: 0,
            description: `Mécène proposé par ${userEmail || validatedData.createdBy || 'anonymous'}`,
            recordedBy: userEmail || validatedData.createdBy || undefined,
          })
          .catch((err) => {
            logger.error('Failed to create tracking metric for patron proposal', { error: err });
          });
      }

      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  // ===== Routes admin - Patrons =====

  async getPatrons(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string,
  ) {
    const result = await this.storageService.instance.getPatrons({
      page,
      limit,
      ...(status && status !== 'all' ? { status } : {}),
      ...(search && search.trim() ? { search } : {}),
    });

    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
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

  async searchPatronByEmail(email: string) {
    if (!email) {
      throw new BadRequestException('Email requis');
    }

    const result = await this.storageService.instance.getPatronByEmail(email);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    return result.data;
  }

  async getPatronById(id: string) {
    const result = await this.storageService.instance.getPatronById(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    if (!result.data) {
      throw new NotFoundException('Mécène non trouvé');
    }
    return result.data;
  }

  async createPatron(data: unknown, userEmail: string) {
    try {
      const validatedData = insertPatronSchema.parse({
        ...(data as Record<string, any>),
        createdBy: userEmail,
      });

      const result = await this.storageService.instance.createPatron(validatedData);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async updatePatron(id: string, data: unknown, userEmail: string) {
    try {
      const validatedData = updatePatronSchema.parse(data);

      // Récupérer le mécène actuel pour détecter les changements de statut
      const currentPatronResult = await this.storageService.instance.getPatronById(id);
      const currentPatron = currentPatronResult.success ? currentPatronResult.data : null;

      const result = await this.storageService.instance.updatePatron(id, validatedData);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      // Enregistrer une métrique si le statut a changé
      if (
        currentPatron &&
        result.data &&
        'status' in validatedData &&
        validatedData.status &&
        validatedData.status !== currentPatron.status
      ) {
        const oldStatus = currentPatron.status;
        const newStatus = validatedData.status;

        // Métrique de changement de statut
        await this.storageService.instance
          .createTrackingMetric({
            entityType: 'patron',
            entityId: result.data.id,
            entityEmail: result.data.email,
            metricType: 'status_change',
            metricValue: newStatus === 'active' ? 1 : 0,
            description: `Statut changé de "${oldStatus}" à "${newStatus}"`,
            recordedBy: userEmail,
          })
          .catch((err) => {
            logger.error('Failed to create tracking metric for patron status change', { error: err });
          });

        // Métrique de conversion si passage de proposed à active
        if (oldStatus === 'proposed' && newStatus === 'active') {
          await this.storageService.instance
            .createTrackingMetric({
              entityType: 'patron',
              entityId: result.data.id,
              entityEmail: result.data.email,
              metricType: 'conversion',
              metricValue: 1,
              description: `Conversion de mécène proposé en mécène actif`,
              recordedBy: userEmail,
            })
            .catch((err) => {
              logger.error('Failed to create tracking metric for patron conversion', { error: err });
            });
        }
      }

      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async deletePatron(id: string) {
    const result = await this.storageService.instance.deletePatron(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  // ===== Routes admin - Donations =====

  async createPatronDonation(patronId: string, data: unknown, userEmail: string) {
    try {
      const validatedData = insertPatronDonationSchema.parse({
        ...(data as Record<string, any>),
        patronId,
        recordedBy: userEmail,
      });

      const result = await this.storageService.instance.createPatronDonation(validatedData);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async getPatronDonations(patronId: string) {
    const result = await this.storageService.instance.getPatronDonations(patronId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  async getAllDonations() {
    const result = await this.storageService.instance.getAllDonations();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  async updatePatronDonation(id: string, data: unknown) {
    const result = await this.storageService.instance.updatePatronDonation(id, data as Partial<{ patronId: string; donatedAt: Date; amount: number; occasion: string; recordedBy: string; }>);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  async deletePatronDonation(id: string) {
    const result = await this.storageService.instance.deletePatronDonation(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  // ===== Routes admin - Proposals =====

  async getPatronProposals(patronId: string) {
    const result = await this.storageService.instance.getPatronProposals(patronId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  // ===== Routes admin - Updates =====

  async createPatronUpdate(patronId: string, data: unknown, userEmail: string) {
    try {
      const validatedData = insertPatronUpdateSchema.parse({
        ...(data as Record<string, any>),
        patronId,
        createdBy: userEmail,
      });

      const result = await this.storageService.instance.createPatronUpdate(validatedData);
      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
        if (error instanceof DuplicateError) {
          throw new ConflictException(error.message);
        }
        throw new BadRequestException(error.message);
      }

      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async getPatronUpdates(patronId: string) {
    const result = await this.storageService.instance.getPatronUpdates(patronId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  // ===== Routes admin - Sponsorships =====

  async createPatronSponsorship(patronId: string, data: unknown, userEmail: string) {
    try {
      const validatedData = insertEventSponsorshipSchema.parse({
        ...(data as Record<string, any>),
        patronId,
        proposedByAdminEmail: userEmail,
      });

      const result = await this.storageService.instance.createEventSponsorship(validatedData);
      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
        if (error instanceof DuplicateError) {
          throw new ConflictException(error.message);
        }
        throw new BadRequestException(error.message);
      }

      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async getPatronSponsorships(patronId: string) {
    const result = await this.storageService.instance.getPatronSponsorships(patronId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  // ===== Routes admin - Proposals globales =====

  async updateIdeaPatronProposal(id: string, data: unknown) {
    try {
      const validatedData = updateIdeaPatronProposalSchema.parse(data);
      const result = await this.storageService.instance.updateIdeaPatronProposal(id, validatedData);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async deleteIdeaPatronProposal(id: string) {
    const result = await this.storageService.instance.deleteIdeaPatronProposal(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  // ===== Routes admin - Updates globales =====

  async updatePatronUpdate(id: string, data: unknown) {
    try {
      const validatedData = updatePatronUpdateSchema.parse(data);
      const result = await this.storageService.instance.updatePatronUpdate(id, validatedData);
      if (!result.success) {
        if (('error' in result ? result.error : new Error('Unknown error')).name === 'NotFoundError') {
          throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
        }
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async deletePatronUpdate(id: string) {
    const result = await this.storageService.instance.deletePatronUpdate(id);
    if (!result.success) {
      if (('error' in result ? result.error : new Error('Unknown error')).name === 'NotFoundError') {
        throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  // ===== Routes admin - Sponsorships globales =====

  async getAllSponsorships() {
    const result = await this.storageService.instance.getAllSponsorships();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  async getSponsorshipStats() {
    const result = await this.storageService.instance.getSponsorshipStats();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  async updateEventSponsorship(id: string, data: unknown) {
    try {
      const validatedData = updateEventSponsorshipSchema.parse(data);
      const result = await this.storageService.instance.updateEventSponsorship(id, validatedData);
      if (!result.success) {
        if (('error' in result ? result.error : new Error('Unknown error')).name === 'NotFoundError') {
          throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
        }
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async deleteEventSponsorship(id: string) {
    const result = await this.storageService.instance.deleteEventSponsorship(id);
    if (!result.success) {
      if (('error' in result ? result.error : new Error('Unknown error')).name === 'NotFoundError') {
        throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }
}
