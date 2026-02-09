import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import {
  proposeMemberSchema,
  insertMemberSchema,
  updateMemberSchema,
  insertMemberSubscriptionSchema,
  insertMemberTagSchema,
  updateMemberTagSchema,
  assignMemberTagSchema,
  insertMemberTaskSchema,
  updateMemberTaskSchema,
  insertMemberRelationSchema,
  DuplicateError,
  type MemberTask,
} from '../../../shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { logger } from '../../lib/logger';
import { emailNotificationService } from '../../email-notification-service';

/**
 * Service Members - Gestion des membres/CRM
 */
@Injectable()
export class MembersService {
  constructor(private readonly storageService: StorageService) {}

  // ===== Routes publiques =====

  async proposeMember(data: unknown) {
    try {
      const validatedData = proposeMemberSchema.parse(data);

      const result = await this.storageService.instance.proposeMember({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        company: validatedData.company,
        phone: validatedData.phone,
        role: validatedData.role,
        notes: validatedData.notes,
        proposedBy: validatedData.proposedBy,
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
            entityType: 'member',
            entityId: result.data.id,
            entityEmail: result.data.email,
            metricType: 'status_change',
            metricValue: 0,
            description: `Membre proposé par ${validatedData.proposedBy}`,
            recordedBy: validatedData.proposedBy,
          })
          .catch((err) => {
            logger.error('Failed to create tracking metric for member proposal', { error: err });
          });
      }

      // Envoyer la notification au responsable recrutement
      await emailNotificationService.notifyNewMemberProposal({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        company: validatedData.company,
        phone: validatedData.phone,
        role: validatedData.role,
        notes: validatedData.notes,
        proposedBy: validatedData.proposedBy,
      });

      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  // ===== Routes admin - Membres =====

  async createMember(data: unknown) {
    try {
      const validatedData = insertMemberSchema.parse(data);

      const result = await this.storageService.instance.createOrUpdateMember({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        company: validatedData.company,
        phone: validatedData.phone,
        role: validatedData.role,
        notes: validatedData.notes,
        status: validatedData.status,
        proposedBy: validatedData.proposedBy,
      });

      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
        if (error instanceof DuplicateError) {
          throw new ConflictException(error.message);
        }
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

  async getMembers(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string,
    score?: 'high' | 'medium' | 'low',
    activity?: 'recent' | 'inactive',
    prospectionStatus?: string,
  ) {
    const result = await this.storageService.instance.getMembers({
      page,
      limit,
      ...(status && status !== 'all' ? { status } : {}),
      ...(search && search.trim() ? { search } : {}),
      ...(score ? { score } : {}),
      ...(activity ? { activity } : {}),
      ...(prospectionStatus && prospectionStatus !== 'all' ? { prospectionStatus } : {}),
    });

    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    return { success: true, ...result.data };
  }

  async getMemberByEmail(email: string) {
    const result = await this.storageService.instance.getMemberByEmail(email);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    if (!result.data) {
      throw new NotFoundException('Membre non trouvé');
    }
    return { success: true, data: result.data };
  }

  async getMemberActivities(email: string) {
    const result = await this.storageService.instance.getMemberActivities(email);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async getMemberDetails(email: string) {
    const result = await this.storageService.instance.getMemberDetails(email);
    if (!result.success) {
      throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async updateMember(email: string, data: unknown, userEmail: string) {
    try {
      const validatedData = updateMemberSchema.parse(data);

      // Récupérer le membre actuel pour détecter les changements de statut
      const currentMemberResult = await this.storageService.instance.getMemberByEmail(email);
      const currentMember = currentMemberResult.success ? currentMemberResult.data : null;

      const result = await this.storageService.instance.updateMember(email, validatedData);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      // Enregistrer une métrique si le statut a changé
      if (
        currentMember &&
        result.data &&
        'status' in validatedData &&
        validatedData.status &&
        validatedData.status !== currentMember.status
      ) {
        const oldStatus = currentMember.status;
        const newStatus = validatedData.status;

        // Métrique de changement de statut
        await this.storageService.instance
          .createTrackingMetric({
            entityType: 'member',
            entityId: result.data.id,
            entityEmail: result.data.email,
            metricType: 'status_change',
            metricValue: newStatus === 'active' ? 1 : 0,
            description: `Statut changé de "${oldStatus}" à "${newStatus}"`,
            recordedBy: userEmail,
          })
          .catch((err) => {
            logger.error('Failed to create tracking metric for member status change', { error: err });
          });

        // Métrique de conversion si passage de proposed à active
        if (oldStatus === 'proposed' && newStatus === 'active') {
          await this.storageService.instance
            .createTrackingMetric({
              entityType: 'member',
              entityId: result.data.id,
              entityEmail: result.data.email,
              metricType: 'conversion',
              metricValue: 1,
              description: `Conversion de membre proposé en membre actif`,
              recordedBy: userEmail,
            })
            .catch((err) => {
              logger.error('Failed to create tracking metric for member conversion', { error: err });
            });
        }
      }

      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async deleteMember(email: string) {
    const result = await this.storageService.instance.deleteMember(email);
    if (!result.success) {
      if (('error' in result ? result.error : new Error('Unknown error')).name === 'NotFoundError') {
        throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  // ===== Routes admin - Subscriptions =====

  async getMemberSubscriptions(email: string) {
    const subscriptions = await this.storageService.instance.getSubscriptionsByMember(email);
    return { success: true, data: subscriptions };
  }

  async createMemberSubscription(email: string, data: unknown) {
    try {
      const validatedData = insertMemberSubscriptionSchema.parse({
        ...(data as Record<string, any>),
        memberEmail: email,
      });

      const subscription = await this.storageService.instance.createSubscription(validatedData);
      return { success: true, data: subscription };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException('Données invalides');
      }
      throw error;
    }
  }

  // ===== Routes admin - Tags =====

  async getAllTags() {
    const result = await this.storageService.instance.getAllTags();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createTag(data: unknown) {
    try {
      const validatedData = insertMemberTagSchema.parse(data);
      const result = await this.storageService.instance.createTag(validatedData);
      if (!result.success) {
        if (('error' in result ? result.error : new Error('Unknown error')).name === 'DuplicateError') {
          throw new ConflictException(('error' in result ? result.error : new Error('Unknown error')).message);
        }
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async updateTag(id: string, data: unknown) {
    try {
      const validatedData = updateMemberTagSchema.parse(data);
      const result = await this.storageService.instance.updateTag(id, validatedData);
      if (!result.success) {
        if (('error' in result ? result.error : new Error('Unknown error')).name === 'NotFoundError') {
          throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
        }
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async deleteTag(id: string) {
    const result = await this.storageService.instance.deleteTag(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  async getMemberTags(email: string) {
    const result = await this.storageService.instance.getTagsByMember(email);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async assignTagToMember(email: string, data: unknown, userEmail?: string) {
    try {
      const validatedData = assignMemberTagSchema.parse({
        ...(data as Record<string, any>),
        memberEmail: email,
        assignedBy: userEmail,
      });
      const result = await this.storageService.instance.assignTagToMember(validatedData as { memberEmail: string; tagId: string });
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

  async removeTagFromMember(email: string, tagId: string) {
    const result = await this.storageService.instance.removeTagFromMember(email, tagId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  // ===== Routes admin - Tasks =====

  async getMemberTasks(email: string) {
    const result = await this.storageService.instance.getTasksByMember(email);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createMemberTask(email: string, data: unknown, userEmail?: string) {
    try {
      const validatedData = insertMemberTaskSchema.parse({
        ...(data as Record<string, any>),
        memberEmail: email,
        createdBy: userEmail || 'system',
      });
      const result = await this.storageService.instance.createTask(validatedData);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async updateTask(id: string, data: unknown, userEmail?: string) {
    try {
      const validatedData = updateMemberTaskSchema.parse(data);
      const updateData: Record<string, unknown> = { ...validatedData };
      if (validatedData.status === 'completed' && !validatedData.completedBy) {
        updateData.completedBy = userEmail;
      }
      if (updateData.dueDate === null) {
        updateData.dueDate = undefined;
      }
      const result = await this.storageService.instance.updateTask(id, updateData as Parameters<typeof this.storageService.instance.updateTask>[1]);
      if (!result.success) {
        if (('error' in result ? result.error : new Error('Unknown error')).name === 'NotFoundError') {
          throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
        }
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async deleteTask(id: string) {
    const result = await this.storageService.instance.deleteTask(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  // ===== Routes admin - Relations =====

  async getMemberRelations(email: string) {
    const result = await this.storageService.instance.getRelationsByMember(email);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createMemberRelation(email: string, data: unknown, userEmail?: string) {
    try {
      const validatedData = insertMemberRelationSchema.parse({
        ...(data as Record<string, any>),
        memberEmail: email,
        createdBy: userEmail,
      });
      const result = await this.storageService.instance.createRelation(validatedData);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async deleteRelation(id: string) {
    const result = await this.storageService.instance.deleteRelation(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  async getAllRelations() {
    const result = await this.storageService.instance.getAllRelations();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  // ===== Routes admin - Tasks =====

  async getAllTasks(filters?: { status?: string; assignedTo?: string }) {
    const result = await this.storageService.instance.getAllTasks(filters);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }
}
