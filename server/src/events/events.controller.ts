import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';
import type { Admin } from '@shared/schema';

@ApiTags('events')
@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Liste publique des événements (pas de permission requise)
  @Get()
  @ApiOperation({ summary: 'Obtenir la liste des événements avec pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre d\'événements par page', example: 20 })
  @ApiResponse({ status: 200, description: 'Liste des événements avec pagination' })
  async getEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    const result = await this.eventsService.getEvents(pageNum, limitNum);

    // Unwrap Result to match PaginatedResponse type
    if (!result.success) {
      throw new Error('error' in result ? String(result.error) : 'Failed to fetch events');
    }

    return {
      success: true,
      data: result.data.data,
      total: result.data.total,
      page: result.data.page,
      limit: result.data.limit,
      totalPages: Math.ceil(result.data.total / result.data.limit),
    };
  }

  // Création d'événement - nécessite events.write (events_manager ou super_admin)
  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('events.write')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouvel événement (nécessite permission events.write)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Soirée networking' },
        description: { type: 'string', example: 'Rencontre professionnelle entre membres CJD' },
        date: { type: 'string', format: 'date-time', example: '2026-02-15T19:00:00Z' },
        location: { type: 'string', example: 'Salle des fêtes, Amiens' },
        maxParticipants: { type: 'number', example: 50 }
      },
      required: ['title', 'description', 'date', 'location']
    }
  })
  @ApiResponse({ status: 201, description: 'Événement créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createEvent(@Body() body: unknown, @User() user: Admin) {
    return await this.eventsService.createEvent(body, user);
  }

  // Création d'événement avec inscriptions - nécessite events.write (events_manager ou super_admin)
  @Post('with-inscriptions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('events.write')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un événement avec inscriptions pré-remplies (nécessite permission events.write)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        event: { type: 'object', description: 'Données de l\'événement' },
        inscriptions: { type: 'array', items: { type: 'object' }, description: 'Liste des inscriptions initiales' }
      },
      required: ['event', 'inscriptions']
    }
  })
  @ApiResponse({ status: 201, description: 'Événement et inscriptions créés avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createEventWithInscriptions(@Body() body: unknown, @User() user: Admin) {
    return await this.eventsService.createEventWithInscriptions(body, user);
  }

  // Mise à jour d'événement - nécessite events.write (events_manager ou super_admin)
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('events.write')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un événement (nécessite permission events.write)' })
  @ApiParam({ name: 'id', description: 'ID de l\'événement', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        location: { type: 'string' },
        maxParticipants: { type: 'number' },
        status: { type: 'string', enum: ['draft', 'published', 'cancelled'] }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Événement mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Événement non trouvé' })
  async updateEvent(@Param('id') id: string, @Body() body: unknown) {
    return await this.eventsService.updateEvent(id, body);
  }

  // Suppression d'événement - nécessite events.delete (events_manager ou super_admin)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('events.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un événement (nécessite permission events.delete)' })
  @ApiParam({ name: 'id', description: 'ID de l\'événement', example: 'uuid-123' })
  @ApiResponse({ status: 204, description: 'Événement supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Événement non trouvé' })
  async deleteEvent(@Param('id') id: string) {
    await this.eventsService.deleteEvent(id);
  }

  // Voir les inscriptions - nécessite events.read (events_reader, events_manager ou super_admin)
  @Get(':id/inscriptions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('events.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir les inscriptions d\'un événement (nécessite permission events.read)' })
  @ApiParam({ name: 'id', description: 'ID de l\'événement', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Liste des inscriptions pour l\'événement' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Événement non trouvé' })
  async getEventInscriptions(@Param('id') id: string) {
    return await this.eventsService.getEventInscriptions(id);
  }
}

@ApiTags('events')
@Controller('api/inscriptions')
export class InscriptionsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 900000 } })
  @ApiOperation({ summary: 'S\'inscrire à un événement (publique, rate-limited)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', example: 'uuid-123' },
        participantName: { type: 'string', example: 'Marie Martin' },
        participantEmail: { type: 'string', format: 'email', example: 'marie@example.com' }
      },
      required: ['eventId', 'participantName', 'participantEmail']
    }
  })
  @ApiResponse({ status: 201, description: 'Inscription enregistrée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides ou inscription déjà existante' })
  @ApiResponse({ status: 429, description: 'Trop de requêtes (rate limit)' })
  async createInscription(@Body() body: unknown) {
    return await this.eventsService.createInscription(body);
  }
}

@ApiTags('events')
@Controller('api/unsubscriptions')
export class UnsubscriptionsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Se désinscrire d\'un événement (publique)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', example: 'uuid-123' },
        participantEmail: { type: 'string', format: 'email', example: 'marie@example.com' }
      },
      required: ['eventId', 'participantEmail']
    }
  })
  @ApiResponse({ status: 200, description: 'Désinscription effectuée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Inscription non trouvée' })
  async createUnsubscription(@Body() body: unknown) {
    return await this.eventsService.createUnsubscription(body);
  }
}


