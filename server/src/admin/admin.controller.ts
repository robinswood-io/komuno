import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Req, BadRequestException, UsePipes } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';
import { ZodValidationPipe } from '../common/pipes/validation.pipe';
import { logger } from '../../lib/logger';
import { resolveRequestBody } from '../common/utils/request-body';
import { frontendErrorSchema } from '@shared/schema';
import { z } from 'zod';
import type { DevRequestStatus } from '../../utils/development-request-status';
import {
  updateIdeaStatusDto,
  updateEventStatusDto,
  createInscriptionDto,
  bulkCreateInscriptionsDto,
  createAdministratorDto,
  updateAdministratorRoleDto,
  updateAdministratorStatusDto,
  updateAdministratorInfoDto,
  approveAdministratorDto,
  createVoteDto,
  updateUnsubscriptionDto,
  updateFeatureConfigDto,
  updateEmailConfigDto,
  type UpdateIdeaStatusDto,
  type UpdateEventStatusDto,
  type CreateInscriptionDto,
  type BulkCreateInscriptionsDto,
  type CreateAdministratorDto,
  type UpdateAdministratorRoleDto,
  type UpdateAdministratorStatusDto,
  type UpdateAdministratorInfoDto,
  type ApproveAdministratorDto,
  type CreateDevelopmentRequestDto,
  type UpdateDevelopmentRequestDto,
  type UpdateDevelopmentRequestStatusDto,
  type CreateVoteDto,
  type UpdateUnsubscriptionDto,
  type UpdateFeatureConfigDto,
  type UpdateEmailConfigDto,
} from './admin.dto';

/**
 * Controller Admin - Routes d'administration
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('api/admin')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ===== Routes Admin Ideas =====

  @Get('ideas')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir toutes les idées (admin) avec pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre d\'idées par page', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut (pending, approved, rejected, under_review, postponed, completed)', example: 'pending' })
  @ApiQuery({ name: 'featured', required: false, description: 'Filtrer par mise en avant (true, false)', example: 'true' })
  @ApiResponse({ status: 200, description: 'Liste des idées avec pagination' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getAllIdeas(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('featured') featured?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return await this.adminService.getAllIdeas(pageNum, limitNum, status, featured);
  }

  @Patch('ideas/:id/status')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateIdeaStatusDto))
  @ApiOperation({ summary: 'Mettre à jour le statut d\'une idée' })
  @ApiParam({ name: 'id', description: 'ID de l\'idée', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'under_review', 'postponed', 'completed'], example: 'approved' }
      },
      required: ['status']
    }
  })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Idée non trouvée' })
  async updateIdeaStatus(
    @Param('id') id: string,
    @Body() body: UpdateIdeaStatusDto,
  ) {
    logger.info('[AdminController] Updating idea status', { ideaId: id, newStatus: body.status });
    await this.adminService.updateIdeaStatus(id, body.status);
    logger.info('[AdminController] Idea status updated successfully', { ideaId: id });
    return { success: true, message: 'Statut mis à jour' };
  }

  @Patch('ideas/:id/featured')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Basculer le statut "mise en avant" d\'une idée' })
  @ApiParam({ name: 'id', description: 'ID de l\'idée', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Statut featured mis à jour' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Idée non trouvée' })
  async toggleIdeaFeatured(@Param('id') id: string) {
    return await this.adminService.toggleIdeaFeatured(id);
  }

  @Post('ideas/:id/transform-to-event')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Transformer une idée approuvée en événement' })
  @ApiParam({ name: 'id', description: 'ID de l\'idée', example: 'uuid-123' })
  @ApiResponse({ status: 201, description: 'Événement créé à partir de l\'idée' })
  @ApiResponse({ status: 400, description: 'L\'idée doit être approuvée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Idée non trouvée' })
  async transformIdeaToEvent(@Param('id') id: string) {
    return await this.adminService.transformIdeaToEvent(id);
  }

  @Put('ideas/:id')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Mettre à jour une idée' })
  @ApiParam({ name: 'id', description: 'ID de l\'idée', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Titre modifié' },
        description: { type: 'string', example: 'Description modifiée' },
        deadline: { type: 'string', format: 'date-time', example: '2026-06-30T23:59:59Z' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Idée mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Idée non trouvée' })
  async updateIdea(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return await this.adminService.updateIdea(id, body);
  }

  @Get('ideas/:ideaId/votes')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les votes d\'une idée (format RESTful imbriqué)' })
  @ApiParam({ name: 'ideaId', description: 'ID de l\'idée', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Liste des votes de l\'idée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Idée non trouvée' })
  async getIdeaVotes(@Param('ideaId') ideaId: string) {
    return await this.adminService.getVotesByIdea(ideaId);
  }

  @Get('votes/:ideaId')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les votes d\'une idée (alias, déprécié)' })
  @ApiParam({ name: 'ideaId', description: 'ID de l\'idée', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Liste des votes de l\'idée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Idée non trouvée' })
  async getVotesByIdeaAlias(@Param('ideaId') ideaId: string) {
    return await this.adminService.getVotesByIdea(ideaId);
  }

  // ===== Routes Admin Events =====

  @Get('events')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir tous les événements (admin) avec pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre d\'événements par page', example: 20 })
  @ApiResponse({ status: 200, description: 'Liste des événements avec pagination' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getAllEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return await this.adminService.getAllEvents(pageNum, limitNum);
  }

  @Get('events/:eventId/inscriptions')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les inscriptions d\'un événement' })
  @ApiParam({ name: 'eventId', description: 'ID de l\'événement', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Liste des inscriptions' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Événement non trouvé' })
  async getEventInscriptions(@Param('eventId') eventId: string) {
    return await this.adminService.getEventInscriptions(eventId);
  }

  @Put('events/:id')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Mettre à jour un événement' })
  @ApiParam({ name: 'id', description: 'ID de l\'événement', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        location: { type: 'string' },
        maxParticipants: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Événement mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Événement non trouvé' })
  async updateEvent(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return await this.adminService.updateEvent(id, body);
  }

  @Patch('events/:id/status')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateEventStatusDto))
  @ApiOperation({ summary: 'Mettre à jour le statut d\'un événement' })
  @ApiParam({ name: 'id', description: 'ID de l\'événement', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'published', 'cancelled', 'postponed', 'completed'], example: 'published' }
      },
      required: ['status']
    }
  })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Événement non trouvé' })
  async updateEventStatus(
    @Param('id') id: string,
    @Body() body: UpdateEventStatusDto,
  ) {
    await this.adminService.updateEventStatus(id, body.status);
  }

  // ===== Routes Admin Inscriptions =====

  @Get('inscriptions/:eventId')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les inscriptions par événement' })
  @ApiParam({ name: 'eventId', description: 'ID de l\'événement', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Liste des inscriptions' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getInscriptionsByEvent(@Param('eventId') eventId: string) {
    return await this.adminService.getEventInscriptions(eventId);
  }

  @Post('inscriptions')
  @Permissions('admin.edit')
  @UsePipes(new ZodValidationPipe(createInscriptionDto))
  @ApiOperation({ summary: 'Créer une inscription manuellement' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', example: 'uuid-event-123' },
        name: { type: 'string', example: 'Jean Dupont' },
        email: { type: 'string', format: 'email', example: 'jean@example.com' },
        company: { type: 'string', example: 'Entreprise SAS' },
        phone: { type: 'string', example: '+33612345678' },
        comments: { type: 'string', example: 'Commentaires optionnels' }
      },
      required: ['eventId', 'name', 'email']
    }
  })
  @ApiResponse({ status: 201, description: 'Inscription créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createInscription(@Body() body: CreateInscriptionDto) {
    return await this.adminService.createInscription(body);
  }

  @Delete('inscriptions/:inscriptionId')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Supprimer une inscription' })
  @ApiParam({ name: 'inscriptionId', description: 'ID de l\'inscription', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Inscription supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Inscription non trouvée' })
  async deleteInscription(@Param('inscriptionId') inscriptionId: string) {
    return await this.adminService.deleteInscription(inscriptionId);
  }

  @Post('inscriptions/bulk')
  @Permissions('admin.edit')
  @UsePipes(new ZodValidationPipe(bulkCreateInscriptionsDto))
  @ApiOperation({ summary: 'Créer plusieurs inscriptions en masse' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', example: 'uuid-event-123' },
        inscriptions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          }
        }
      },
      required: ['eventId', 'inscriptions']
    }
  })
  @ApiResponse({ status: 201, description: 'Inscriptions créées avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async bulkCreateInscriptions(
    @Body() body: BulkCreateInscriptionsDto,
  ) {
    return await this.adminService.bulkCreateInscriptions(body.eventId, body.inscriptions);
  }

  // ===== Routes Admin Votes =====

  @Post('votes')
  @Permissions('admin.edit')
  @UsePipes(new ZodValidationPipe(createVoteDto))
  @ApiOperation({ summary: 'Créer un vote manuellement (admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ideaId: { type: 'string', example: 'uuid-idea-123' },
        voterName: { type: 'string', example: 'Jean Dupont' },
        voterEmail: { type: 'string', format: 'email', example: 'jean@example.com' }
      },
      required: ['ideaId', 'voterName', 'voterEmail']
    }
  })
  @ApiResponse({ status: 201, description: 'Vote créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides ou vote déjà existant' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createVote(@Body() body: CreateVoteDto) {
    return await this.adminService.createVote(body);
  }

  @Delete('votes/:voteId')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Supprimer un vote' })
  @ApiParam({ name: 'voteId', description: 'ID du vote', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Vote supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Vote non trouvé' })
  async deleteVote(@Param('voteId') voteId: string) {
    return await this.adminService.deleteVote(voteId);
  }

  // ===== Routes Admin Administrators =====

  @Get('administrators')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Obtenir tous les administrateurs' })
  @ApiResponse({ status: 200, description: 'Liste des administrateurs' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getAllAdministrators() {
    return await this.adminService.getAllAdministrators();
  }

  @Get('pending-admins')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Obtenir les administrateurs en attente de validation' })
  @ApiResponse({ status: 200, description: 'Liste des administrateurs en attente' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getPendingAdministrators() {
    return await this.adminService.getPendingAdministrators();
  }

  @Post('administrators')
  @Permissions('admin.manage')
  @UsePipes(new ZodValidationPipe(createAdministratorDto))
  @ApiOperation({ summary: 'Créer un nouvel administrateur' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'nouveau@admin.com' },
        firstName: { type: 'string', example: 'Nouveau' },
        lastName: { type: 'string', example: 'Admin' },
        role: { type: 'string', enum: ['super_admin', 'ideas_reader', 'ideas_manager', 'events_reader', 'events_manager'], example: 'ideas_reader' }
      },
      required: ['email', 'firstName', 'lastName', 'role']
    }
  })
  @ApiResponse({ status: 201, description: 'Administrateur créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides ou email déjà utilisé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createAdministrator(
    @Body() body: CreateAdministratorDto,
    @User() user: { email: string },
  ) {
    return await this.adminService.createAdministrator(body, user.email);
  }

  @Patch('administrators/:email/role')
  @Permissions('admin.manage')
  @UsePipes(new ZodValidationPipe(updateAdministratorRoleDto))
  @ApiOperation({ summary: 'Mettre à jour le rôle d\'un administrateur' })
  @ApiParam({ name: 'email', description: 'Email de l\'administrateur', example: 'admin@example.com' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['super_admin', 'ideas_reader', 'ideas_manager', 'events_reader', 'events_manager'], example: 'ideas_manager' }
      },
      required: ['role']
    }
  })
  @ApiResponse({ status: 200, description: 'Rôle mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Administrateur non trouvé' })
  async updateAdministratorRole(
    @Param('email') email: string,
    @Body() body: UpdateAdministratorRoleDto,
    @User() user: { email: string },
  ) {
    return await this.adminService.updateAdministratorRole(email, body.role, user.email);
  }

  @Patch('administrators/:email/status')
  @Permissions('admin.manage')
  @UsePipes(new ZodValidationPipe(updateAdministratorStatusDto))
  @ApiOperation({ summary: 'Activer/désactiver un administrateur' })
  @ApiParam({ name: 'email', description: 'Email de l\'administrateur', example: 'admin@example.com' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isActive: { type: 'boolean', example: false }
      },
      required: ['isActive']
    }
  })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Administrateur non trouvé' })
  async updateAdministratorStatus(
    @Param('email') email: string,
    @Body() body: UpdateAdministratorStatusDto,
    @User() user: { email: string },
  ) {
    return await this.adminService.updateAdministratorStatus(email, body.isActive, user.email);
  }

  @Patch('administrators/:email/info')
  @Permissions('admin.manage')
  @UsePipes(new ZodValidationPipe(updateAdministratorInfoDto))
  @ApiOperation({ summary: 'Mettre à jour les informations d\'un administrateur' })
  @ApiParam({ name: 'email', description: 'Email de l\'administrateur', example: 'admin@example.com' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Nouveau Prénom' },
        lastName: { type: 'string', example: 'Nouveau Nom' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Informations mises à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Administrateur non trouvé' })
  async updateAdministratorInfo(
    @Param('email') email: string,
    @Body() body: UpdateAdministratorInfoDto,
    @User() user: { email: string },
  ) {
    return await this.adminService.updateAdministratorInfo(email, body, user.email);
  }

  @Patch('administrators/:email/password')
  @Permissions('admin.manage')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiOperation({ summary: 'Modifier le mot de passe (nécessite /forgot-password)' })
  @ApiParam({ name: 'email', description: 'Email de l\'administrateur' })
  @ApiResponse({ status: 501, description: 'Utilisez /api/auth/forgot-password pour réinitialiser' })
  async updateAdministratorPassword() {
    // NOTE: Password reset is handled via /api/auth/forgot-password endpoint
    return {
      message: "Utilisez l'endpoint /api/auth/forgot-password pour réinitialiser le mot de passe.",
    };
  }

  @Delete('administrators/:email')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Supprimer un administrateur' })
  @ApiParam({ name: 'email', description: 'Email de l\'administrateur', example: 'admin@example.com' })
  @ApiResponse({ status: 200, description: 'Administrateur supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Administrateur non trouvé' })
  async deleteAdministrator(
    @Param('email') email: string,
    @User() user: { email: string },
  ) {
    return await this.adminService.deleteAdministrator(email, user.email);
  }

  @Patch('administrators/:email/approve')
  @Permissions('admin.manage')
  @UsePipes(new ZodValidationPipe(approveAdministratorDto))
  @ApiOperation({ summary: 'Approuver un administrateur en attente' })
  @ApiParam({ name: 'email', description: 'Email de l\'administrateur', example: 'nouveau@admin.com' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['super_admin', 'ideas_reader', 'ideas_manager', 'events_reader', 'events_manager'], example: 'ideas_reader' }
      },
      required: ['role']
    }
  })
  @ApiResponse({ status: 200, description: 'Administrateur approuvé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Administrateur non trouvé' })
  async approveAdministrator(
    @Param('email') email: string,
    @Body() body: ApproveAdministratorDto,
  ) {
    return await this.adminService.approveAdministrator(email, body.role);
  }

  @Delete('administrators/:email/reject')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Rejeter un administrateur en attente' })
  @ApiParam({ name: 'email', description: 'Email de l\'administrateur', example: 'nouveau@admin.com' })
  @ApiResponse({ status: 200, description: 'Administrateur rejeté avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Administrateur non trouvé' })
  async rejectAdministrator(@Param('email') email: string) {
    return await this.adminService.rejectAdministrator(email);
  }

  // ===== Routes Admin Dashboard/Stats =====

  @Get('stats')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les statistiques globales du tableau de bord' })
  @ApiResponse({ status: 200, description: 'Statistiques du tableau de bord admin' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getAdminStats() {
    return await this.adminService.getAdminStats();
  }

  @Get('db-health')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir le statut de santé de la base de données' })
  @ApiResponse({ status: 200, description: 'État de la connexion à la base de données' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getDatabaseHealth() {
    return await this.adminService.getDatabaseHealth();
  }

  @Get('pool-stats')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les statistiques du pool de connexions' })
  @ApiResponse({ status: 200, description: 'Statistiques du pool de connexions' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getPoolStats() {
    return await this.adminService.getPoolStats();
  }

  // ===== Routes Admin Unsubscriptions =====

  @Get('events/:id/unsubscriptions')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les désinscriptions d\'un événement' })
  @ApiParam({ name: 'id', description: 'ID de l\'événement', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Liste des désinscriptions' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getEventUnsubscriptions(@Param('id') id: string) {
    return await this.adminService.getEventUnsubscriptions(id);
  }

  @Delete('unsubscriptions/:id')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Supprimer une désinscription' })
  @ApiParam({ name: 'id', description: 'ID de la désinscription', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Désinscription supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Désinscription non trouvée' })
  async deleteUnsubscription(@Param('id') id: string) {
    return await this.adminService.deleteUnsubscription(id);
  }

  @Put('unsubscriptions/:id')
  @Permissions('admin.edit')
  @UsePipes(new ZodValidationPipe(updateUnsubscriptionDto))
  @ApiOperation({ summary: 'Mettre à jour une désinscription' })
  @ApiParam({ name: 'id', description: 'ID de la désinscription', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Jean Dupont' },
        email: { type: 'string', format: 'email', example: 'jean@example.com' },
        comments: { type: 'string', example: 'Raison de l\'absence' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Désinscription mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Désinscription non trouvée' })
  async updateUnsubscription(
    @Param('id') id: string,
    @Body() body: UpdateUnsubscriptionDto,
  ) {
    return await this.adminService.updateUnsubscription(id, body);
  }

  // ===== Routes Admin Development Requests =====

  @Get('development-requests')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Obtenir toutes les demandes de développement' })
  @ApiResponse({ status: 200, description: 'Liste des demandes de développement' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getDevelopmentRequests(
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const normalizedType = type === 'bug' || type === 'feature' ? type : undefined;
    const isDevRequestStatus = (value: string): value is DevRequestStatus =>
      value === 'pending' ||
      value === 'in_progress' ||
      value === 'done' ||
      value === 'cancelled';

    const normalizedStatus: DevRequestStatus | 'open' | 'closed' | undefined =
      status && (isDevRequestStatus(status) || status === 'open' || status === 'closed')
        ? status
        : undefined;

    const data = await this.adminService.getDevelopmentRequests({
      type: normalizedType,
      status: normalizedStatus,
    });
    return { success: true, data };
  }

  @Post('development-requests')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Créer une demande de développement (bug/feature)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Ajouter export CSV' },
        description: { type: 'string', example: 'Permettre l\'export des données en CSV' },
        type: { type: 'string', enum: ['bug', 'feature'], example: 'feature' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'medium' }
      },
      required: ['title', 'description', 'type']
    }
  })
  @ApiResponse({ status: 201, description: 'Demande créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createDevelopmentRequest(
    @Body() body: CreateDevelopmentRequestDto,
    @Req() req: Request,
    @User() user: { email: string; firstName?: string; lastName?: string },
  ) {
    const resolvedBody = resolveRequestBody(body, req);
    const data = await this.adminService.createDevelopmentRequest(resolvedBody, user);
    return { success: true, data };
  }

  @Put('development-requests/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour une demande de développement' })
  @ApiParam({ name: 'id', description: 'ID de la demande', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['bug', 'feature'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        adminComment: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Demande mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Demande non trouvée' })
  async updateDevelopmentRequest(
    @Param('id') id: string,
    @Body() body: UpdateDevelopmentRequestDto,
    @Req() req: Request,
  ) {
    const resolvedBody = resolveRequestBody(body, req);
    const data = await this.adminService.updateDevelopmentRequest(id, resolvedBody);
    return { success: true, data };
  }

  @Post('development-requests/:id/sync')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Synchroniser une demande avec GitHub' })
  @ApiParam({ name: 'id', description: 'ID de la demande', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Synchronisation effectuée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Demande non trouvée' })
  async syncDevelopmentRequestWithGitHub(@Param('id') id: string) {
    const data = await this.adminService.syncDevelopmentRequestWithGitHub(id);
    return { success: true, data };
  }

  @Patch('development-requests/:id/status')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour le statut d\'une demande de développement' })
  @ApiParam({ name: 'id', description: 'ID de la demande', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'in_progress', 'done', 'cancelled'], example: 'in_progress' }
      },
      required: ['status']
    }
  })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Demande non trouvée' })
  async updateDevelopmentRequestStatus(
    @Param('id') id: string,
    @Body() body: UpdateDevelopmentRequestStatusDto,
    @Req() req: Request,
    @User() user: { email: string },
  ) {
    const resolvedBody = resolveRequestBody(body, req);
    const data = await this.adminService.updateDevelopmentRequestStatus(id, resolvedBody, user);
    return { success: true, data };
  }

  @Delete('development-requests/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Supprimer une demande de développement' })
  @ApiParam({ name: 'id', description: 'ID de la demande', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Demande supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Demande non trouvée' })
  async deleteDevelopmentRequest(@Param('id') id: string) {
    await this.adminService.deleteDevelopmentRequest(id);
    return { success: true };
  }

  // ===== Routes Admin Logs & Tests =====

  @Get('errors')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les logs d\'erreurs récents' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre de logs à récupérer', example: 100 })
  @ApiResponse({ status: 200, description: 'Liste des logs d\'erreurs' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getErrorLogs(@Query('limit') limit?: string) {
    const limitNum = parseInt(limit || '100', 10);
    return await this.adminService.getErrorLogs(limitNum);
  }

  @Get('test-email')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Tester la configuration email complète' })
  @ApiResponse({ status: 200, description: 'Configuration email testée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 500, description: 'Erreur de configuration email' })
  async testEmailConfiguration() {
    return await this.adminService.testEmailConfiguration();
  }

  @Get('test-email-simple')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Tester l\'envoi d\'email simple' })
  @ApiResponse({ status: 200, description: 'Email de test envoyé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 500, description: 'Erreur d\'envoi email' })
  async testEmailSimple() {
    return await this.adminService.testEmailSimple();
  }

  // ===== Routes Admin Feature Configuration =====

  @Get('features')
  @ApiOperation({ summary: 'Obtenir la configuration des fonctionnalités' })
  @ApiResponse({ status: 200, description: 'Liste des fonctionnalités et leur statut' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getFeatureConfig() {
    return await this.adminService.getFeatureConfig();
  }

  @Put('features/:featureKey')
  @Permissions('admin.manage')
  @UsePipes(new ZodValidationPipe(updateFeatureConfigDto))
  @ApiOperation({ summary: 'Activer/désactiver une fonctionnalité' })
  @ApiParam({ name: 'featureKey', description: 'Clé de la fonctionnalité', example: 'chatbot' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true }
      },
      required: ['enabled']
    }
  })
  @ApiResponse({ status: 200, description: 'Fonctionnalité mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async updateFeatureConfig(
    @Param('featureKey') featureKey: string,
    @Body() body: UpdateFeatureConfigDto,
    @User() user: { email: string },
  ) {
    return await this.adminService.updateFeatureConfig(featureKey, body.enabled, user.email);
  }

  // ===== Routes Admin Email Configuration =====

  @Get('email-config')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir la configuration email' })
  @ApiResponse({ status: 200, description: 'Configuration email actuelle' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getEmailConfig() {
    return await this.adminService.getEmailConfig();
  }

  @Put('email-config')
  @Permissions('admin.manage')
  @UsePipes(new ZodValidationPipe(updateEmailConfigDto))
  @ApiOperation({ summary: 'Mettre à jour la configuration email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        smtpHost: { type: 'string', example: 'smtp.example.com' },
        smtpPort: { type: 'number', example: 587 },
        smtpUser: { type: 'string', example: 'user@example.com' },
        smtpPassword: { type: 'string', example: 'password' },
        fromEmail: { type: 'string', example: 'noreply@cjd-amiens.fr' },
        fromName: { type: 'string', example: 'CJD Amiens' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Configuration email mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async updateEmailConfig(
    @Body() body: UpdateEmailConfigDto,
    @User() user: { email: string },
  ) {
    return await this.adminService.updateEmailConfig(body, user.email);
  }
}

/**
 * Controller Logs - Routes pour les logs frontend
 */
@ApiTags('admin')
@Controller('api/logs')
export class LogsController {
  @Post('frontend-error')
  @ApiOperation({ summary: 'Logger une erreur frontend' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Uncaught TypeError: Cannot read property of undefined' },
        stack: { type: 'string', example: 'at Component.render (app.js:123)' },
        componentStack: { type: 'string', example: 'in MyComponent' },
        url: { type: 'string', example: 'https://cjd80.rbw.ovh/admin' },
        userAgent: { type: 'string', example: 'Mozilla/5.0...' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['message']
    }
  })
  @ApiResponse({ status: 200, description: 'Erreur loggée avec succès' })
  @ApiResponse({ status: 400, description: 'Format d\'erreur invalide' })
  async logFrontendError(@Body() body: unknown, @Req() req: Request) {
    try {
      const validatedData = frontendErrorSchema.parse(body);

      const sanitizedStack = validatedData.stack?.substring(0, 5000) || 'N/A';
      const sanitizedComponentStack = validatedData.componentStack?.substring(0, 3000) || 'N/A';

      logger.error('Frontend error', {
        message: validatedData.message,
        stack: sanitizedStack,
        componentStack: sanitizedComponentStack,
        url: validatedData.url,
        userAgent: validatedData.userAgent,
        timestamp: validatedData.timestamp,
        userEmail: req.user?.email || 'anonymous',
      });

      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Invalid frontend error log attempt', { error: error.toString() });
        throw new BadRequestException('Invalid error format');
      }
      logger.error('Failed to log frontend error', { error });
      throw error;
    }
  }
}
