import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { AutomationsService } from '../automations/automations.service';
import {
  proposeMemberSchema,
  insertMemberSchema,
  updateMemberSchema,
  assignMemberSchema,
  insertMemberSubscriptionSchema,
  insertMemberTagSchema,
  updateMemberTagSchema,
  assignMemberTagSchema,
  insertMemberTaskSchema,
  updateMemberTaskSchema,
  insertMemberRelationSchema,
  insertMemberGroupSchema,
  updateMemberGroupSchema,
  insertMemberGroupMembershipSchema,
  updateMemberGroupMembershipSchema,
  duplicateMemberGroupSchema,
  insertMemberContactSchema,
  updateMemberContactSchema,
  DuplicateError,
  type MemberTask,
} from '../../../shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { logger } from '../../lib/logger';
import { emailNotificationService } from '../../email-notification-service';
import { db } from '../../db';
import { members, memberGroups, memberGroupMemberships, memberTagAssignments, memberSubscriptions, subscriptionTypes } from '../../../shared/schema';
import { inArray, sql, and, eq, asc, desc, ilike, or } from 'drizzle-orm';

/**
 * Service Members - Gestion des membres/CRM
 */
@Injectable()
export class MembersService {
  constructor(
    private readonly storageService: StorageService,
    private readonly integrationsService?: IntegrationsService,
    private readonly automationsService?: AutomationsService,
  ) {}

  private emitOutboundEventBestEffort(eventType: string, data: Record<string, unknown>) {
    void this.integrationsService?.emitOutboundEvent(eventType, data).catch((error) => {
      logger.warn('Outbound webhook emission failed', { eventType, error });
    });
  }

  private emitAutomationEventBestEffort(eventType: string, data: Record<string, unknown>) {
    void this.automationsService?.emitEvent(eventType, data).catch((error) => {
      logger.warn('Automation event emission failed', { eventType, error });
    });
  }

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

  async createMember(data: unknown, creatorEmail: string) {
    try {
      const validatedData = insertMemberSchema.parse(data);
      // Le responsable est l'utilisateur courant, sauf si explicitement fourni
      const assignedTo = validatedData.assignedTo ?? creatorEmail;

      const result = await this.storageService.instance.createOrUpdateMember({
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        company: validatedData.company,
        department: validatedData.department,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        firstContactDate: validatedData.firstContactDate as any,
        meetingDate: validatedData.meetingDate as any,
        sector: validatedData.sector,
        phone: validatedData.phone,
        role: validatedData.role,
        notes: validatedData.notes,
        status: validatedData.status,
        prospectionStatus: validatedData.prospectionStatus,
        proposedBy: validatedData.proposedBy,
        soncasProfile: validatedData.soncasProfile,
        createdBy: creatorEmail,
        assignedTo,
      });

      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
        if (error instanceof DuplicateError) {
          throw new ConflictException(error.message);
        }
        throw new BadRequestException(error.message);
      }

      // Enregistrer l'historique de création
      if (result.data) {
        await this.storageService.instance.createOwnershipHistoryEntry({
          memberEmail: result.data.email,
          action: 'created',
          adminEmail: creatorEmail,
          toEmail: assignedTo,
        }).catch((err) => logger.error('Failed to create ownership history entry', { error: err }));
        const automationPayload = {
          id: result.data.email,
          email: result.data.email,
          status: result.data.status,
          prospectionStatus: result.data.prospectionStatus,
          createdBy: creatorEmail,
          assignedTo,
        };
        this.emitOutboundEventBestEffort('member.created', automationPayload);
        this.emitAutomationEventBestEffort('member.created', automationPayload);
      }

      return { success: true, data: result.data };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async assignMember(memberEmail: string, data: unknown, currentUserEmail: string) {
    try {
      const validatedData = assignMemberSchema.parse(data);
      const result = await this.storageService.instance.assignMember(
        memberEmail,
        validatedData.assignedTo,
        currentUserEmail,
        validatedData.note,
      );
      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
        throw new BadRequestException(error.message);
      }
      return { success: true };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async getMemberOwnershipHistory(memberEmail: string) {
    const result = await this.storageService.instance.getMemberOwnershipHistory(memberEmail);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async getMembers(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string,
    score?: 'high' | 'medium' | 'low',
    activity?: 'recent' | 'inactive',
    prospectionStatus?: string,
    city?: string,
    department?: string,
    assignedTo?: string,
    onlyProspects?: boolean,
    excludeProspects?: boolean,
  ) {
    const result = await this.storageService.instance.getMembers({
      page,
      limit,
      ...(status && status !== 'all' ? { status } : {}),
      ...(search && search.trim() ? { search } : {}),
      ...(score ? { score } : {}),
      ...(activity ? { activity } : {}),
      ...(prospectionStatus && prospectionStatus !== 'all' ? { prospectionStatus } : {}),
      ...(city && city.trim() ? { city } : {}),
      ...(department && department !== 'all' ? { department } : {}),
      ...(assignedTo && assignedTo !== 'all' ? { assignedTo } : {}),
      ...(onlyProspects ? { onlyProspects: true } : {}),
      ...(excludeProspects ? { excludeProspects: true } : {}),
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

      // Conversion automatique : prospect Signé → membre actif
      // prospectionStatus passe à null, status passe à 'active'
      const updateData = validatedData.prospectionStatus === 'Signé'
        ? { ...validatedData, status: 'active' as const, prospectionStatus: null }
        : validatedData;

      // Récupérer le membre actuel pour détecter les changements de statut
      const currentMemberResult = await this.storageService.instance.getMemberByEmail(email);
      const currentMember = currentMemberResult.success ? currentMemberResult.data : null;

      const result = await this.storageService.instance.updateMember(email, updateData);
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      // Enregistrer une métrique si le statut a changé
      if (
        currentMember &&
        result.data &&
        updateData.status &&
        updateData.status !== currentMember.status
      ) {
        const oldStatus = currentMember.status;
        const newStatus = updateData.status;

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

  // ===== Routes admin - Contacts membres (historique d'interactions) =====

  async getMemberContacts(memberEmail: string) {
    const result = await this.storageService.instance.getMemberContacts(memberEmail);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return { success: true, data: result.data };
  }

  async createMemberContact(memberEmail: string, data: unknown, userEmail: string) {
    try {
      const validatedData = insertMemberContactSchema.parse({
        ...(data as Record<string, unknown>),
        memberEmail,
        createdBy: userEmail,
      });
      const result = await this.storageService.instance.createMemberContact(validatedData);
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

  async updateMemberContact(id: string, data: unknown) {
    try {
      const validatedData = updateMemberContactSchema.parse(data);
      const result = await this.storageService.instance.updateMemberContact(id, validatedData);
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

  async deleteMemberContact(id: string) {
    const result = await this.storageService.instance.deleteMemberContact(id);
    if (!result.success) {
      if (('error' in result ? result.error : new Error('Unknown error')).name === 'NotFoundError') {
        throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  // ===== Routes admin - Opérations en masse =====

  async bulkUpdateStatus(emails: string[], status: string): Promise<{ success: true; updated: number }> {
    if (!emails || emails.length === 0) {
      throw new BadRequestException('Aucun email fourni');
    }
    if (!status) {
      throw new BadRequestException('Statut manquant');
    }

    try {
      await db
        .update(members)
        .set({ status, updatedAt: sql`NOW()` })
        .where(inArray(members.email, emails));

      logger.info('Bulk status update', { count: emails.length, status });
      return { success: true, updated: emails.length };
    } catch (error) {
      throw new BadRequestException(`Erreur lors de la mise à jour en masse: ${error}`);
    }
  }

  async bulkAssignTag(emails: string[], tagId: string): Promise<{ success: true; assigned: number }> {
    if (!emails || emails.length === 0) {
      throw new BadRequestException('Aucun email fourni');
    }
    if (!tagId) {
      throw new BadRequestException('Tag ID manquant');
    }

    let assigned = 0;
    for (const email of emails) {
      try {
        // Vérifier si l'association existe déjà
        const existing = await db
          .select()
          .from(memberTagAssignments)
          .where(
            and(
              eq(memberTagAssignments.memberEmail, email),
              eq(memberTagAssignments.tagId, tagId)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(memberTagAssignments).values({
            memberEmail: email,
            tagId,
            assignedBy: 'bulk',
          });
          assigned++;
        }
      } catch {
        // ignorer les erreurs individuelles
      }
    }

    logger.info('Bulk tag assignment', { count: assigned, tagId });
    return { success: true, assigned };
  }

  async bulkDelete(emails: string[]): Promise<{ success: true; deleted: number }> {
    if (!emails || emails.length === 0) {
      throw new BadRequestException('Aucun email fourni');
    }

    try {
      const result = await db
        .delete(members)
        .where(inArray(members.email, emails))
        .returning({ email: members.email });

      logger.info('Bulk member delete', { count: result.length });
      return { success: true, deleted: result.length };
    } catch (error) {
      throw new BadRequestException(`Erreur lors de la suppression en masse: ${error}`);
    }
  }

  async bulkAssignSubscription(
    emails: string[],
    subscriptionTypeId: string,
    startDate: string,
    paymentMethod: string | undefined,
    assignedBy: string,
  ): Promise<{ success: true; assigned: number }> {
    if (!emails || emails.length === 0) {
      throw new BadRequestException('Aucun email fourni');
    }

    // Vérifier que le type de cotisation existe
    const subType = await db
      .select()
      .from(subscriptionTypes)
      .where(eq(subscriptionTypes.id, subscriptionTypeId))
      .limit(1);

    if (subType.length === 0) {
      throw new BadRequestException('Type de cotisation introuvable');
    }

    const { amountInCents, durationType } = subType[0];

    // Calculer la date de fin selon le type
    const start = new Date(startDate);
    const end = new Date(start);
    if (durationType === 'monthly') {
      end.setMonth(end.getMonth() + 1);
    } else if (durationType === 'quarterly') {
      end.setMonth(end.getMonth() + 3);
    } else {
      end.setFullYear(end.getFullYear() + 1);
    }
    const endDate = end.toISOString().split('T')[0];

    let assigned = 0;
    for (const email of emails) {
      try {
        await db.insert(memberSubscriptions).values({
          memberEmail: email,
          subscriptionTypeId,
          subscriptionType: durationType,
          amountInCents,
          startDate,
          endDate,
          status: 'active',
          paymentMethod: paymentMethod ?? null,
          assignedBy,
        });
        assigned++;
      } catch {
        // ignorer les erreurs individuelles (ex: membre inexistant)
      }
    }

    logger.info('Bulk subscription assignment', { count: assigned, subscriptionTypeId });
    return { success: true, assigned };
  }

  // ===== Routes admin - Groupes annuels de membres =====

  private handleZodError(error: unknown): never {
    if (error instanceof ZodError) {
      throw new BadRequestException(fromZodError(error).toString());
    }
    throw error;
  }

  private async getMembershipsForGroup(groupId: string) {
    return await db
      .select({
        id: memberGroupMemberships.id,
        groupId: memberGroupMemberships.groupId,
        memberEmail: memberGroupMemberships.memberEmail,
        role: memberGroupMemberships.role,
        mission: memberGroupMemberships.mission,
        startDate: memberGroupMemberships.startDate,
        endDate: memberGroupMemberships.endDate,
        notes: memberGroupMemberships.notes,
        assignedBy: memberGroupMemberships.assignedBy,
        createdAt: memberGroupMemberships.createdAt,
        updatedAt: memberGroupMemberships.updatedAt,
        firstName: members.firstName,
        lastName: members.lastName,
        company: members.company,
        status: members.status,
      })
      .from(memberGroupMemberships)
      .leftJoin(members, eq(memberGroupMemberships.memberEmail, members.email))
      .where(eq(memberGroupMemberships.groupId, groupId))
      .orderBy(asc(members.lastName), asc(members.firstName));
  }

  async getMemberGroups(options?: {
    year?: number;
    type?: string;
    memberEmail?: string;
    search?: string;
    includeInactive?: boolean;
  }) {
    const conditions = [] as any[];

    if (!options?.includeInactive) {
      conditions.push(eq(memberGroups.isActive, true));
    }
    if (options?.year) {
      conditions.push(eq(memberGroups.year, options.year));
    }
    if (options?.type && options.type !== 'all') {
      conditions.push(eq(memberGroups.type, options.type));
    }
    if (options?.search?.trim()) {
      const search = `%${options.search.trim()}%`;
      conditions.push(or(ilike(memberGroups.name, search), ilike(memberGroups.description, search)));
    }

    if (options?.memberEmail) {
      const memberships = await db
        .select({ groupId: memberGroupMemberships.groupId })
        .from(memberGroupMemberships)
        .where(eq(memberGroupMemberships.memberEmail, options.memberEmail));
      const groupIds = memberships.map((membership) => membership.groupId);
      if (groupIds.length === 0) {
        return { success: true, data: [] };
      }
      conditions.push(inArray(memberGroups.id, groupIds));
    }

    const groups = await db
      .select()
      .from(memberGroups)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(memberGroups.year), asc(memberGroups.name));

    const data = await Promise.all(groups.map(async (group) => {
      const memberships = await this.getMembershipsForGroup(group.id);
      return {
        ...group,
        memberCount: memberships.length,
        memberships,
      };
    }));

    return { success: true, data };
  }

  async getMemberGroup(groupId: string) {
    const [group] = await db.select().from(memberGroups).where(eq(memberGroups.id, groupId)).limit(1);
    if (!group) {
      throw new NotFoundException('Groupe membre non trouvé');
    }

    const memberships = await this.getMembershipsForGroup(groupId);
    return {
      success: true,
      data: {
        ...group,
        memberCount: memberships.length,
        memberships,
      },
    };
  }

  async createMemberGroup(data: unknown, createdBy?: string) {
    try {
      const validatedData = insertMemberGroupSchema.parse({ ...(data as Record<string, unknown>), createdBy });
      const [created] = await db.insert(memberGroups).values(validatedData).returning();
      logger.info('Groupe membre créé', { groupId: created.id, name: created.name, year: created.year });
      return await this.getMemberGroup(created.id);
    } catch (error) {
      if ((error as any)?.code === '23505') {
        throw new ConflictException('Un groupe avec ce nom existe déjà pour cette année');
      }
      return this.handleZodError(error);
    }
  }

  async updateMemberGroup(groupId: string, data: unknown) {
    try {
      const validatedData = updateMemberGroupSchema.parse(data);
      const [updated] = await db
        .update(memberGroups)
        .set({ ...validatedData, updatedAt: sql`NOW()` })
        .where(eq(memberGroups.id, groupId))
        .returning();

      if (!updated) {
        throw new NotFoundException('Groupe membre non trouvé');
      }
      return await this.getMemberGroup(updated.id);
    } catch (error) {
      if ((error as any)?.code === '23505') {
        throw new ConflictException('Un groupe avec ce nom existe déjà pour cette année');
      }
      return this.handleZodError(error);
    }
  }

  async deleteMemberGroup(groupId: string) {
    const [deleted] = await db
      .delete(memberGroups)
      .where(eq(memberGroups.id, groupId))
      .returning({ id: memberGroups.id });

    if (!deleted) {
      throw new NotFoundException('Groupe membre non trouvé');
    }

    logger.info('Groupe membre supprimé', { groupId });
    return { success: true };
  }

  async addMemberToGroup(groupId: string, data: unknown, assignedBy?: string) {
    try {
      await this.getMemberGroup(groupId);
      const validatedData = insertMemberGroupMembershipSchema.parse({
        ...(data as Record<string, unknown>),
        groupId,
        assignedBy,
      });

      const [created] = await db.insert(memberGroupMemberships).values(validatedData).returning();
      logger.info('Membre ajouté à un groupe annuel', { groupId, memberEmail: created.memberEmail });
      return { success: true, data: created };
    } catch (error) {
      if ((error as any)?.code === '23505') {
        throw new ConflictException('Ce membre est déjà dans ce groupe');
      }
      return this.handleZodError(error);
    }
  }

  async updateMemberGroupMembership(groupId: string, membershipId: string, data: unknown) {
    try {
      const validatedData = updateMemberGroupMembershipSchema.parse(data);
      const [updated] = await db
        .update(memberGroupMemberships)
        .set({ ...validatedData, updatedAt: sql`NOW()` })
        .where(and(eq(memberGroupMemberships.id, membershipId), eq(memberGroupMemberships.groupId, groupId)))
        .returning();

      if (!updated) {
        throw new NotFoundException('Affectation groupe/membre non trouvée');
      }
      return { success: true, data: updated };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async removeMemberFromGroup(groupId: string, membershipId: string) {
    const [deleted] = await db
      .delete(memberGroupMemberships)
      .where(and(eq(memberGroupMemberships.id, membershipId), eq(memberGroupMemberships.groupId, groupId)))
      .returning({ id: memberGroupMemberships.id });

    if (!deleted) {
      throw new NotFoundException('Affectation groupe/membre non trouvée');
    }

    return { success: true };
  }

  async duplicateMemberGroup(groupId: string, data: unknown, createdBy?: string) {
    try {
      const { targetYear, name } = duplicateMemberGroupSchema.parse(data);
      const source = (await this.getMemberGroup(groupId)).data;
      const [created] = await db
        .insert(memberGroups)
        .values({
          name: name ?? source.name,
          type: source.type,
          year: targetYear,
          description: source.description,
          color: source.color,
          isActive: true,
          createdBy,
        })
        .returning();

      const shiftDate = (value: string | null) => {
        if (!value) return null;
        return `${targetYear}${value.slice(4)}`;
      };

      if (source.memberships.length > 0) {
        await db.insert(memberGroupMemberships).values(source.memberships.map((membership) => ({
          groupId: created.id,
          memberEmail: membership.memberEmail,
          role: membership.role,
          mission: membership.mission,
          startDate: shiftDate(membership.startDate),
          endDate: shiftDate(membership.endDate),
          notes: membership.notes,
          assignedBy: createdBy,
        })));
      }

      logger.info('Groupe membre dupliqué', { sourceGroupId: groupId, targetGroupId: created.id, targetYear });
      return await this.getMemberGroup(created.id);
    } catch (error) {
      if ((error as any)?.code === '23505') {
        throw new ConflictException('Un groupe avec ce nom existe déjà pour cette année');
      }
      return this.handleZodError(error);
    }
  }

  async getMemberGroupSummary(year?: number) {
    const conditions = [] as any[];
    if (year) {
      conditions.push(eq(memberGroups.year, year));
    }

    const rows = await db
      .select({
        groupId: memberGroups.id,
        groupName: memberGroups.name,
        groupType: memberGroups.type,
        groupYear: memberGroups.year,
        groupColor: memberGroups.color,
        membershipId: memberGroupMemberships.id,
        memberEmail: memberGroupMemberships.memberEmail,
        role: memberGroupMemberships.role,
        mission: memberGroupMemberships.mission,
        firstName: members.firstName,
        lastName: members.lastName,
        company: members.company,
      })
      .from(memberGroups)
      .leftJoin(memberGroupMemberships, eq(memberGroups.id, memberGroupMemberships.groupId))
      .leftJoin(members, eq(memberGroupMemberships.memberEmail, members.email))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(memberGroups.year), asc(memberGroups.name), asc(members.lastName));

    const byMember = new Map<string, any>();
    for (const row of rows) {
      if (!row.memberEmail) continue;
      const existing = byMember.get(row.memberEmail) ?? {
        memberEmail: row.memberEmail,
        firstName: row.firstName,
        lastName: row.lastName,
        company: row.company,
        groups: [],
      };
      existing.groups.push({
        id: row.groupId,
        name: row.groupName,
        type: row.groupType,
        year: row.groupYear,
        color: row.groupColor,
        role: row.role,
        mission: row.mission,
      });
      byMember.set(row.memberEmail, existing);
    }

    return {
      success: true,
      data: {
        rows,
        members: Array.from(byMember.values()),
      },
    };
  }
}
