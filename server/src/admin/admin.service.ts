import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import { IdeasService } from '../ideas/ideas.service';
import { EventsService } from '../events/events.service';
import {
  updateIdeaSchema,
  updateIdeaStatusSchema,
  insertEventSchema,
  updateEventStatusSchema,
  insertAdminSchema,
  updateAdminSchema,
  updateAdminInfoSchema,
  insertUnsubscriptionSchema,
  insertInscriptionSchema,
  insertDevelopmentRequestSchema,
  updateDevelopmentRequestSchema,
  updateDevelopmentRequestStatusSchema,
  ADMIN_ROLES,
  type Idea,
  type DevelopmentRequest
} from '../../../shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { logger } from '../../lib/logger';
import { getPoolStats } from '../../db';
import { checkDatabaseHealth } from '../../utils/db-health';
import {
  buildGitHubLabels,
  statusFromGitHub,
  toApiStatus,
  toStorageStatus,
  type DevRequestStatus,
} from '../../utils/development-request-status';
import { emailNotificationService } from '../../email-notification-service';
import { emailService } from '../../email-service';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { UpdateEmailConfigDto } from './admin.dto';

/**
 * Service Admin - Gestion des routes d'administration
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly storageService: StorageService,
    private readonly ideasService: IdeasService,
    private readonly eventsService: EventsService,
  ) {}

  // ===== Routes Admin Ideas =====

  async getAllIdeas(page: number = 1, limit: number = 20, status?: string, featured?: string) {
    const result = await this.storageService.instance.getAllIdeas({ page, limit, status, featured });
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

  async updateIdeaStatus(id: string, status: unknown) {
    return await this.ideasService.updateIdeaStatus(id, status);
  }

  async toggleIdeaFeatured(id: string) {
    const result = await this.storageService.instance.toggleIdeaFeatured(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { featured: result.data };
  }

  async transformIdeaToEvent(ideaId: string) {
    const result = await this.storageService.instance.transformIdeaToEvent(ideaId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, eventId: result.data.id };
  }

  async updateIdea(id: string, data: unknown) {
    try {
      const validatedData = updateIdeaSchema.parse(data);
      const result = await this.storageService.instance.updateIdea(id, validatedData);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).message);
      }
      throw error;
    }
  }

  // ===== Routes Admin Events =====

  async getAllEvents(page: number = 1, limit: number = 20) {
    const result = await this.storageService.instance.getAllEvents({ page, limit });
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

  async updateEvent(id: string, data: unknown) {
    try {
      const validatedData = insertEventSchema.parse(data);
      const result = await this.storageService.instance.updateEvent(id, validatedData);
      if (!result.success) {
        throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async updateEventStatus(id: string, status: unknown) {
    try {
      const validatedData = updateEventStatusSchema.parse({ status });
      const result = await this.storageService.instance.updateEventStatus(id, validatedData.status);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async getEventInscriptions(eventId: string) {
    const result = await this.storageService.instance.getEventInscriptions(eventId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  // ===== Routes Admin Inscriptions =====

  async createInscription(data: unknown) {
    try {
      const validatedData = insertInscriptionSchema.parse(data);
      const result = await this.storageService.instance.createInscription(validatedData);
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

  async deleteInscription(inscriptionId: string) {
    const result = await this.storageService.instance.deleteInscription(inscriptionId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true };
  }

  async bulkCreateInscriptions(eventId: string, inscriptions: Array<{ name?: string; email?: string; comments?: string; company?: string; phone?: string }>) {
    if (!eventId || !Array.isArray(inscriptions)) {
      throw new BadRequestException('eventId et inscriptions (array) requis');
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (const inscription of inscriptions) {
      if (!inscription.name || !inscription.email) {
        errors.push(`Inscription invalide: nom et email requis pour ${inscription.name || inscription.email || 'inscription inconnue'}`);
        continue;
      }

      const result = await this.storageService.instance.createInscription({
        eventId,
        name: inscription.name.trim(),
        email: inscription.email.trim(),
        company: inscription.company?.trim() || undefined,
        phone: inscription.phone?.trim() || undefined,
        comments: inscription.comments?.trim() || undefined,
      });

      if (result.success) {
        results.push(result.data);
      } else {
        errors.push(`Erreur pour ${inscription.name}: ${('error' in result ? result.error : new Error('Unknown error')).message}`);
      }
    }

    return {
      success: results.length > 0,
      created: results.length,
      errors: errors.length,
      errorMessages: errors,
      data: results,
    };
  }

  // ===== Routes Admin Votes =====

  async getVotesByIdea(ideaId: string) {
    return await this.ideasService.getVotesByIdea(ideaId);
  }

  async createVote(data: unknown) {
    return await this.ideasService.createVote(data);
  }

  async deleteVote(voteId: string) {
    const result = await this.storageService.instance.deleteVote(voteId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true };
  }

  // ===== Routes Admin Administrators =====

  private sanitizeAdmin(admin: any) {
    return {
      ...admin,
      password: undefined,
    };
  }

  async getAllAdministrators() {
    const result = await this.storageService.instance.getAllAdmins();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return {
      success: true,
      data: result.data.map(admin => this.sanitizeAdmin(admin)),
    };
  }

  async getPendingAdministrators() {
    const result = await this.storageService.instance.getPendingAdmins();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return {
      success: true,
      data: result.data.map(admin => this.sanitizeAdmin(admin)),
    };
  }

  async createAdministrator(data: unknown, addedBy: string) {
    try {
      const validatedData = insertAdminSchema.parse(data);
      const { email, firstName, lastName, role } = validatedData;

      if (!email || !firstName || !lastName || !role) {
        throw new BadRequestException('Tous les champs sont requis');
      }

      // Create user in database with hashed password via StorageService
      const result = await this.storageService.instance.createUser({
        email,
        password: 'temporary-password-must-be-changed', // User should reset password
        firstName,
        lastName,
        role,
        addedBy,
      });

      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      return {
        success: true,
        data: this.sanitizeAdmin(result.data),
        message: 'Administrateur créé avec succès',
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).message);
      }
      throw error;
    }
  }

  async updateAdministratorRole(email: string, role: unknown, currentUserEmail: string) {
    try {
      if (email === currentUserEmail) {
        throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle');
      }

      const validatedData = updateAdminSchema.parse({ role });
      if (!validatedData.role) {
        throw new BadRequestException('Le rôle est requis');
      }

      const result = await this.storageService.instance.updateAdminRole(email, validatedData.role);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      return {
        success: true,
        data: this.sanitizeAdmin(result.data),
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).message);
      }
      throw error;
    }
  }

  async updateAdministratorStatus(email: string, isActive: unknown, currentUserEmail: string) {
    try {
      if (email === currentUserEmail) {
        throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte');
      }

      const validatedData = updateAdminSchema.parse({ isActive });
      if (typeof validatedData.isActive !== 'boolean') {
        throw new BadRequestException('Le statut actif est requis');
      }

      const result = await this.storageService.instance.updateAdminStatus(email, validatedData.isActive);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      return {
        success: true,
        data: this.sanitizeAdmin(result.data),
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).message);
      }
      throw error;
    }
  }

  async updateAdministratorInfo(email: string, data: unknown, currentUserEmail: string) {
    try {
      if (email === currentUserEmail) {
        throw new BadRequestException('Vous ne pouvez pas modifier vos propres informations');
      }

      const validatedData = updateAdminInfoSchema.parse(data);
      const result = await this.storageService.instance.updateAdminInfo(email, validatedData);

      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      return {
        success: true,
        data: result.data,
        message: 'Informations mises à jour avec succès',
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).message);
      }
      throw error;
    }
  }

  async deleteAdministrator(email: string, currentUserEmail: string) {
    if (email === currentUserEmail) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    }

    const result = await this.storageService.instance.deleteAdmin(email);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    return {
      success: true,
      message: 'Administrateur supprimé avec succès',
    };
  }

  async approveAdministrator(email: string, role: unknown) {
    if (!role || !Object.values(ADMIN_ROLES).includes(role as any)) {
      throw new BadRequestException('Rôle valide requis');
    }

    const result = await this.storageService.instance.approveAdmin(email, role as string);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    return {
      success: true,
      data: this.sanitizeAdmin(result.data),
      message: 'Compte approuvé avec succès',
    };
  }

  async rejectAdministrator(email: string) {
    const result = await this.storageService.instance.deleteAdmin(email);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    return {
      success: true,
      message: 'Compte rejeté et supprimé avec succès',
    };
  }

  // ===== Routes Admin Dashboard/Stats =====

  async getAdminStats() {
    const stats = await this.storageService.instance.getAdminStats();
    if (!stats.success) {
      throw new BadRequestException(('error' in stats ? stats.error : new Error('Unknown error')).message);
    }
    return {
      success: true,
      data: stats.data,
    };
  }

  async getDatabaseHealth() {
    try {
      const health = await checkDatabaseHealth();
      return health;
    } catch (error) {
      logger.error('Database health check failed', { error });
      throw new BadRequestException('Erreur lors de la vérification de la santé de la base de données');
    }
  }

  async getPoolStats() {
    const stats = getPoolStats();
    return {
      pool: stats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  // ===== Routes Admin Unsubscriptions =====

  async getEventUnsubscriptions(eventId: string) {
    const result = await this.storageService.instance.getEventUnsubscriptions(eventId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  async deleteUnsubscription(id: string) {
    const result = await this.storageService.instance.deleteUnsubscription(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { message: 'Absence supprimée avec succès' };
  }

  async updateUnsubscription(id: string, data: unknown) {
    try {
      const validatedData = insertUnsubscriptionSchema.omit({ eventId: true }).parse(data);
      const result = await this.storageService.instance.updateUnsubscription(id, validatedData);
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

  // ===== Routes Admin Development Requests =====

  async getDevelopmentRequests(filters?: { type?: 'bug' | 'feature'; status?: DevRequestStatus | 'open' | 'closed' }) {
    const result = await this.storageService.instance.getDevelopmentRequests({
      type: filters?.type,
      status: filters?.status ? toStorageStatus(filters.status) : undefined,
    });
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data.map((request) => ({
      ...request,
      status: toApiStatus(request.status),
    }));
  }

  async createDevelopmentRequest(data: unknown, user: { email: string; firstName?: string; lastName?: string }) {
    try {
      // Valider d'abord les données de base
      const baseData = insertDevelopmentRequestSchema.omit({ requestedBy: true, requestedByName: true }).parse(data);
      // Puis créer l'objet complet
      const validatedData = insertDevelopmentRequestSchema.parse({
        ...baseData,
        requestedBy: user.email,
        requestedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      });

      const result = await this.storageService.instance.createDevelopmentRequest(validatedData);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      // Créer l'issue GitHub en arrière-plan
      const { createGitHubIssue } = await import('../../utils/github-integration');
      createGitHubIssue(validatedData)
        .then(async (githubIssue) => {
          if (githubIssue) {
            await this.storageService.instance.updateDevelopmentRequest(result.data.id, {
              githubIssueNumber: githubIssue.number,
              githubIssueUrl: githubIssue.html_url,
            });
            logger.info('GitHub issue created and linked', {
              requestId: result.data.id,
              issueNumber: githubIssue.number,
              issueUrl: githubIssue.html_url,
            });
          }
        })
        .catch((error) => {
          logger.error('GitHub issue creation failed', { requestId: result.data.id, error });
        });

      return {
        ...result.data,
        status: toApiStatus(result.data.status),
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async updateDevelopmentRequest(id: string, data: unknown) {
    try {
      const existingRequests = await this.storageService.instance.getDevelopmentRequests();
      if (!existingRequests.success) {
        throw new BadRequestException(('error' in existingRequests ? existingRequests.error : new Error('Unknown error')).message);
      }
      const existingRequest = existingRequests.data.find((request) => request.id === id);
      if (!existingRequest) {
        throw new NotFoundException('Demande non trouvée');
      }

      const validatedData = updateDevelopmentRequestSchema.parse(data);
      const normalizedPayload = {
        ...validatedData,
        status: validatedData.status ? toStorageStatus(validatedData.status) : undefined,
      };
      const result = await this.storageService.instance.updateDevelopmentRequest(id, normalizedPayload);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      if (result.data.githubIssueNumber) {
        const shouldSync =
          Boolean(validatedData.title) ||
          Boolean(validatedData.description) ||
          Boolean(validatedData.type) ||
          Boolean(validatedData.priority) ||
          Boolean(validatedData.status);

        if (shouldSync) {
          const { updateGitHubIssueDetails } = await import('../../utils/github-integration');
          const apiStatus = toApiStatus(result.data.status);
          const nextState = result.data.status === 'closed' || result.data.status === 'cancelled' ? 'closed' : 'open';
          const labels = buildGitHubLabels({
            status: apiStatus,
            type: result.data.type === 'bug' ? 'bug' : 'feature',
            priority: result.data.priority,
          });

          const shouldUpdateBody = Boolean(
            validatedData.description || validatedData.type || validatedData.priority
          );

          await updateGitHubIssueDetails(result.data.githubIssueNumber, {
            title: validatedData.title ?? result.data.title,
            body: shouldUpdateBody
              ? [
                `**Description:**`,
                result.data.description,
                ``,
                `**Type:** ${result.data.type === "bug" ? "🐛 Bug" : "✨ Fonctionnalité"}`,
                `**Priorité:** ${result.data.priority}`,
                `**Demandé par:** ${result.data.requestedByName} (${result.data.requestedBy})`,
                ``,
                `---`,
                `*Issue mise à jour automatiquement depuis l'interface d'administration CJD Amiens*`
              ].join('\n')
              : undefined,
            labels,
            state: nextState,
          });
        }
      }

      return {
        ...result.data,
        status: toApiStatus(result.data.status),
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async syncDevelopmentRequestWithGitHub(id: string) {
    const getResult = await this.storageService.instance.getDevelopmentRequests();
    if (!getResult.success) {
      const error = 'error' in getResult ? getResult.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }

    const request = getResult.data.find((r) => r.id === id);
    if (!request) {
      throw new NotFoundException('Demande non trouvée');
    }

    if (!request.githubIssueNumber) {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('GitHub sync skipped - no linked issue', { requestId: id });
        return {
          success: true,
          message: 'Synchronisation GitHub ignorée (aucune issue associée)',
          data: {
            ...request,
            status: toApiStatus(request.status),
          },
        };
      }
      throw new BadRequestException('Aucune issue GitHub associée à cette demande');
    }

    const { syncGitHubIssueStatus } = await import('../../utils/github-integration');
    const githubStatus = await syncGitHubIssueStatus(request.githubIssueNumber);

    if (!githubStatus) {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('GitHub sync skipped - token or repo missing', { requestId: id });
        return {
          success: true,
          message: 'Synchronisation GitHub ignorée (configuration manquante)',
          data: {
            ...request,
            status: toApiStatus(request.status),
          },
        };
      }
      throw new BadRequestException('Impossible de récupérer le statut depuis GitHub');
    }

    const nextStatus = statusFromGitHub(githubStatus.status === 'closed' ? 'closed' : 'open', githubStatus.labels);
    const updateResult = await this.storageService.instance.updateDevelopmentRequest(id, {
      githubStatus: githubStatus.status,
      status: toStorageStatus(nextStatus),
      lastSyncedAt: new Date(),
    });

    if (!updateResult.success) {
      const error = 'error' in updateResult ? updateResult.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }

    logger.info('GitHub sync successful', { requestId: id, issueNumber: request.githubIssueNumber });
    return {
      success: true,
      message: 'Synchronisation avec GitHub réussie',
      data: {
        ...updateResult.data,
        status: toApiStatus(updateResult.data.status),
      },
    };
  }

  async updateDevelopmentRequestStatus(
    id: string,
    data: unknown,
    user: { email: string; role?: string },
  ) {
    if (process.env.NODE_ENV === 'production' && user.role !== 'super_admin') {
      throw new BadRequestException(
        'Seuls les super administrateurs peuvent modifier les statuts des demandes de développement',
      );
    }

    try {
      const existingRequests = await this.storageService.instance.getDevelopmentRequests();
      if (!existingRequests.success) {
        throw new BadRequestException(('error' in existingRequests ? existingRequests.error : new Error('Unknown error')).message);
      }
      const existingRequest = existingRequests.data.find((request) => request.id === id);
      if (!existingRequest) {
        throw new NotFoundException('Demande non trouvée');
      }

      // Valider d'abord les données de base
      const baseData = updateDevelopmentRequestStatusSchema.omit({ lastStatusChangeBy: true }).parse(data);
      // Puis créer l'objet complet
      const validatedData = updateDevelopmentRequestStatusSchema.parse({
        ...baseData,
        lastStatusChangeBy: user.email,
      });

      const storageStatus = toStorageStatus(validatedData.status);
      const result = await this.storageService.instance.updateDevelopmentRequestStatus(
        id,
        storageStatus,
        validatedData.adminComment,
        validatedData.lastStatusChangeBy,
      );

      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      if (existingRequest.githubIssueNumber) {
        const { updateGitHubIssueStatus } = await import('../../utils/github-integration');
        const targetState = storageStatus === 'closed' || storageStatus === 'cancelled' ? 'closed' : 'open';
        const labels = buildGitHubLabels({
          status: toApiStatus(storageStatus),
          type: existingRequest.type === 'bug' ? 'bug' : 'feature',
          priority: existingRequest.priority,
        });

        const updatedIssue = await updateGitHubIssueStatus(existingRequest.githubIssueNumber, targetState, labels);
        if (updatedIssue) {
          await this.storageService.instance.updateDevelopmentRequest(existingRequest.id, {
            githubStatus: updatedIssue.state,
            lastSyncedAt: new Date(),
          });
        }
      }

      logger.info('Development request status updated by admin', {
        requestId: id,
        newStatus: validatedData.status,
        updatedBy: user.email,
      });

      return {
        ...result.data,
        status: toApiStatus(result.data.status),
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async syncDevelopmentRequestFromGitHub(payload: {
    issueNumber: number;
    issueUrl: string;
    state: 'open' | 'closed';
    labels?: string[];
    title?: string;
  }) {
    const getResult = await this.storageService.instance.getDevelopmentRequests();
    if (!getResult.success) {
      const error = 'error' in getResult ? getResult.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }

    const request = getResult.data.find((req) => req.githubIssueNumber === payload.issueNumber);
    if (!request) {
      return { success: false, message: 'Aucune demande liée à cette issue' };
    }

    const nextStatus = statusFromGitHub(payload.state, payload.labels);
    const updatePayload: Partial<DevelopmentRequest> = {
      githubStatus: payload.state,
      status: toStorageStatus(nextStatus),
      githubIssueUrl: payload.issueUrl,
      lastSyncedAt: new Date(),
    };

    if (payload.title && payload.title !== request.title) {
      updatePayload.title = payload.title;
    }

    const updateResult = await this.storageService.instance.updateDevelopmentRequest(request.id, updatePayload);
    if (!updateResult.success) {
      const error = 'error' in updateResult ? updateResult.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }

    logger.info('Development request synced from GitHub webhook', {
      requestId: request.id,
      issueNumber: payload.issueNumber,
      state: payload.state,
    });

    return {
      success: true,
      data: {
        ...updateResult.data,
        status: toApiStatus(updateResult.data.status),
      },
    };
  }

  async deleteDevelopmentRequest(id: string) {
    // Récupérer la demande avant suppression pour fermer l'issue GitHub
    const getResult = await this.storageService.instance.getDevelopmentRequests();
    if (getResult.success) {
      const request = getResult.data.find((r) => r.id === id);
      if (request?.githubIssueNumber) {
        const { closeGitHubIssue } = await import('../../utils/github-integration');
        closeGitHubIssue(request.githubIssueNumber, 'not_planned').catch((error) => {
          logger.error('GitHub issue close failed', { issueNumber: request.githubIssueNumber, error });
        });
      }
    }

    const result = await this.storageService.instance.deleteDevelopmentRequest(id);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    return { success: true, message: 'Demande supprimée avec succès' };
  }

  // ===== Routes Admin Logs & Tests =====

  async getErrorLogs(limit: number = 100) {
    try {
      const errorLogPath = join(__dirname, '../../../logs/error.log');

      try {
        const errorLog = await fs.readFile(errorLogPath, 'utf-8');
        const lines = errorLog.split('\n').filter((l) => l.trim());
        const recentLines = lines.slice(-limit);

        const errors = recentLines.map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: line };
          }
        });

        return {
          success: true,
          data: {
            count: errors.length,
            errors: errors.reverse(),
          },
        };
      } catch (fileError: any) {
        if (fileError.code === 'ENOENT') {
          return {
            success: true,
            data: {
              count: 0,
              errors: [],
              message: 'No error log file found yet',
            },
          };
        }
        throw fileError;
      }
    } catch (error) {
      logger.error('Failed to read error logs', { error });
      throw new BadRequestException('Failed to retrieve error logs');
    }
  }

  async testEmailConfiguration() {
    const result = await emailNotificationService.testEmailConfiguration();
    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message || 'Erreur lors du test email');
    }
    return {
      success: true,
      message: 'Email de test envoyé avec succès',
    };
  }

  async testEmailSimple() {
    logger.info('[Test Email] Début du test d\'envoi email simple...');

    const adminsResult = await this.storageService.instance.getAllAdmins();
    if (!adminsResult.success) {
      logger.error('[Test Email] Erreur lors de la récupération des admins');
      throw new BadRequestException('Erreur lors de la récupération des administrateurs');
    }

    logger.info('[Test Email] Admins récupérés:', { count: adminsResult.data?.length || 0 });
    const activeAdmins = adminsResult.data?.filter((a: any) => a.isActive && a.status === 'active') || [];
    logger.info('[Test Email] Admins actifs:', { count: activeAdmins.length });

    if (activeAdmins.length === 0) {
      logger.warn('[Test Email] Aucun admin actif trouvé');
      throw new BadRequestException('Aucun administrateur actif trouvé');
    }

    const testEmail = activeAdmins[0].email;
    logger.info('[Test Email] Envoi vers:', { email: testEmail });

    const result = await emailService.sendEmail({
      to: [testEmail],
      subject: 'Test Configuration SMTP - CJD Amiens',
      html: `
        <h2>Test de Configuration Email</h2>
        <p>Si vous recevez cet email, la configuration SMTP OVH est correcte!</p>
        <p>Serveur: ssl0.ovh.net</p>
        <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
      `,
    });

    logger.info('[Test Email] Résultat:', { success: result.success });
    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      logger.error('[Test Email] Erreur:', { error });
    }

    return {
      success: result.success,
      message: result.success ? `Email envoyé à ${testEmail}` : "Erreur lors de l'envoi",
      details: result,
    };
  }

  // ===== Routes Admin Feature Configuration =====

  async getFeatureConfig() {
    const result = await this.storageService.instance.getFeatureConfig();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return {
      success: true,
      data: result.data,
    };
  }

  async updateFeatureConfig(featureKey: string, enabled: boolean, updatedBy: string) {
    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('Le champ "enabled" doit être un booléen');
    }

    const result = await this.storageService.instance.updateFeatureConfig(featureKey, enabled, updatedBy);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    logger.info('Feature config updated', { featureKey, enabled, updatedBy });
    return {
      success: true,
      data: result.data,
    };
  }

  // ===== Routes Admin Email Configuration =====

  async getEmailConfig() {
    const result = await this.storageService.instance.getEmailConfig();
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    // Si pas de config, retourner les valeurs par défaut des variables d'environnement
    if (!result.data) {
      return {
        success: true,
        data: {
          host: process.env.SMTP_HOST || 'ssl0.ovh.net',
          port: parseInt(process.env.SMTP_PORT || '465', 10),
          secure: process.env.SMTP_SECURE !== 'false',
          username: process.env.SMTP_USER || '',
          fromEmail: process.env.SMTP_FROM_EMAIL || '',
          fromName: process.env.SMTP_FROM_NAME || 'CJD',
          isDefault: true,
        },
      };
    }

    return {
      success: true,
      data: result.data,
    };
  }

  async updateEmailConfig(config: UpdateEmailConfigDto, updatedBy: string) {
    // La validation est faite par le ZodValidationPipe dans le contrôleur
    const result = await this.storageService.instance.updateEmailConfig({
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      password: config.password,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      provider: 'smtp' as const,
    }, updatedBy);

    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    // Recharger la configuration email
    try {
      await emailService.reloadConfig();
      logger.info('Email config updated and reloaded', { updatedBy });
    } catch (reloadError) {
      logger.warn('Email config updated but reload failed', { updatedBy, error: reloadError });
    }

    return {
      success: true,
      data: result.data,
      message: 'Configuration email mise à jour avec succès',
    };
  }
}
