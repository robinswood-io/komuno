import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';
import { resolveRequestBody } from '../common/utils/request-body';

/**
 * Controller Tracking - Routes tracking
 */
@ApiTags('tracking')
@ApiBearerAuth()
@Controller('api/tracking')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('dashboard')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir le tableau de bord de suivi' })
  @ApiResponse({ status: 200, description: 'Données du tableau de bord de suivi' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getTrackingDashboard() {
    return await this.trackingService.getTrackingDashboard();
  }

  @Get('metrics')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les métriques de suivi avec filtres' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Type d\'entité', enum: ['member', 'patron'] })
  @ApiQuery({ name: 'entityId', required: false, description: 'ID de l\'entité', example: 'uuid-123' })
  @ApiQuery({ name: 'entityEmail', required: false, description: 'Email de l\'entité', example: 'jean@example.com' })
  @ApiQuery({ name: 'metricType', required: false, description: 'Type de métrique', example: 'engagement' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Date de début', example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Date de fin', example: '2026-03-31' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de résultats', example: '100' })
  @ApiResponse({ status: 200, description: 'Liste des métriques de suivi' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getTrackingMetrics(
    @Query('entityType') entityType?: 'member' | 'patron',
    @Query('entityId') entityId?: string,
    @Query('entityEmail') entityEmail?: string,
    @Query('metricType') metricType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const options: Record<string, string | number | boolean> = {};
    if (entityType) options.entityType = entityType;
    if (entityId) options.entityId = entityId;
    if (entityEmail) options.entityEmail = entityEmail;
    if (metricType) options.metricType = metricType;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (limit) options.limit = parseInt(limit, 10);
    return await this.trackingService.getTrackingMetrics(options);
  }

  @Post('metrics')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer une métrique de suivi' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        entityType: { type: 'string', enum: ['member', 'patron'], example: 'member' },
        entityId: { type: 'string', example: 'uuid-123' },
        entityEmail: { type: 'string', format: 'email', example: 'jean@example.com' },
        metricType: { type: 'string', example: 'engagement' },
        value: { type: 'number', example: 85 },
        notes: { type: 'string', example: 'Score d\'engagement élevé' }
      },
      required: ['entityType', 'metricType', 'value']
    }
  })
  @ApiResponse({ status: 201, description: 'Métrique créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createTrackingMetric(
    @Body() body: unknown,
    @Req() req: Request,
    @User() user: { email: string },
  ) {
    const resolvedBody = resolveRequestBody(body, req);
    return await this.trackingService.createTrackingMetric(resolvedBody, user.email);
  }

  @Get('alerts')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les alertes de suivi avec filtres' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Type d\'entité', enum: ['member', 'patron'] })
  @ApiQuery({ name: 'entityId', required: false, description: 'ID de l\'entité', example: 'uuid-123' })
  @ApiQuery({ name: 'isRead', required: false, description: 'Filtrer par statut de lecture', example: 'false' })
  @ApiQuery({ name: 'isResolved', required: false, description: 'Filtrer par statut de résolution', example: 'false' })
  @ApiQuery({ name: 'severity', required: false, description: 'Niveau de sévérité', enum: ['low', 'medium', 'high', 'critical'] })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de résultats', example: '50' })
  @ApiResponse({ status: 200, description: 'Liste des alertes de suivi' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getTrackingAlerts(
    @Query('entityType') entityType?: 'member' | 'patron',
    @Query('entityId') entityId?: string,
    @Query('isRead') isRead?: string,
    @Query('isResolved') isResolved?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: string,
  ) {
    const options: Record<string, string | number | boolean> = {};
    if (entityType) options.entityType = entityType;
    if (entityId) options.entityId = entityId;
    if (isRead !== undefined) options.isRead = isRead === 'true';
    if (isResolved !== undefined) options.isResolved = isResolved === 'true';
    if (severity) options.severity = severity;
    if (limit) options.limit = parseInt(limit, 10);
    return await this.trackingService.getTrackingAlerts(options);
  }

  @Post('alerts')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer une alerte de suivi' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        entityType: { type: 'string', enum: ['member', 'patron'], example: 'member' },
        entityId: { type: 'string', example: 'uuid-123' },
        title: { type: 'string', example: 'Baisse d\'engagement détectée' },
        message: { type: 'string', example: 'Le membre n\'a pas participé depuis 3 mois' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'medium' }
      },
      required: ['entityType', 'title', 'message', 'severity']
    }
  })
  @ApiResponse({ status: 201, description: 'Alerte créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createTrackingAlert(
    @Body() body: unknown,
    @Req() req: Request,
    @User() user: { email: string },
  ) {
    const resolvedBody = resolveRequestBody(body, req);
    return await this.trackingService.createTrackingAlert(resolvedBody, user.email);
  }

  @Put('alerts/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour une alerte de suivi' })
  @ApiParam({ name: 'id', description: 'ID de l\'alerte', example: 'uuid-alert-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isRead: { type: 'boolean', example: true },
        isResolved: { type: 'boolean', example: false },
        resolutionNotes: { type: 'string', example: 'En cours de traitement' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Alerte mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Alerte non trouvée' })
  async updateTrackingAlert(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @User() user: { email: string },
  ) {
    const resolvedBody = resolveRequestBody(body, req);
    return await this.trackingService.updateTrackingAlert(id, resolvedBody, user.email);
  }

  @Post('alerts/generate')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Générer automatiquement les alertes de suivi' })
  @ApiResponse({ status: 201, description: 'Alertes générées avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async generateTrackingAlerts() {
    return await this.trackingService.generateTrackingAlerts();
  }
}
