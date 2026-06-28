import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FederationService } from './federation.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('federation')
@ApiBearerAuth()
@Controller('api/admin/federation')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminFederationController {
  constructor(private readonly federationService: FederationService) {}

  @Get('overview')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Vue d’ensemble du module Fédération' })
  async getOverview() {
    return await this.federationService.getOverview();
  }

  @Get('networks')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Lister les réseaux / fédérations' })
  async getNetworks() {
    return await this.federationService.getNetworks();
  }

  @Post('networks')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer un réseau / une fédération' })
  async createNetwork(@Body() body: unknown) {
    return await this.federationService.createNetwork(body);
  }

  @Patch('networks/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Modifier un réseau / une fédération' })
  async updateNetwork(@Param('id') id: string, @Body() body: unknown) {
    return await this.federationService.updateNetwork(id, body);
  }

  @Get('organizations')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Lister les organisations fédérées' })
  async getOrganizations() {
    return await this.federationService.getOrganizations();
  }

  @Post('organizations')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer une organisation fédérée' })
  async createOrganization(@Body() body: unknown) {
    return await this.federationService.createOrganization(body);
  }

  @Patch('organizations/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Modifier une organisation fédérée' })
  async updateOrganization(@Param('id') id: string, @Body() body: unknown) {
    return await this.federationService.updateOrganization(id, body);
  }

  @Get('relations')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Lister les liens mère-fille / partenaires' })
  async getRelations() {
    return await this.federationService.getRelations();
  }

  @Post('relations')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer un lien entre organisations' })
  async createRelation(@Body() body: unknown, @User() user: { email?: string }) {
    return await this.federationService.createRelation(body, user.email);
  }

  @Patch('relations/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Modifier un lien entre organisations' })
  async updateRelation(@Param('id') id: string, @Body() body: unknown, @User() user: { email?: string }) {
    return await this.federationService.updateRelation(id, body, user.email);
  }

  @Post('relations/:id/rotate-token')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Remplacer le jeton de fédération de la relation (stocké chiffré, jamais ré-affiché)' })
  async rotateRelationToken(@Param('id') id: string, @Body() body: unknown, @User() user: { email?: string }) {
    return await this.federationService.rotateRelationToken(id, body, user.email);
  }

  @Get('settings')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Lire les paramètres de fédération de cette instance' })
  async getFederationSettings() {
    return await this.federationService.getFederationSettings();
  }

  @Put('settings')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour les paramètres de fédération de cette instance' })
  async updateFederationSettings(@Body() body: unknown, @User() user: { email?: string }) {
    return await this.federationService.updateFederationSettings(body, user.email);
  }

  @Post('sync')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Déclencher la synchronisation inter-instance des relations et syndications' })
  @ApiQuery({ name: 'autoShareBackfill', required: false, description: 'Créer aussi les remontées automatiques pour les événements locaux existants' })
  async syncFederationNow(@Query('autoShareBackfill') autoShareBackfill?: string, @User() user?: { email?: string }) {
    return await this.federationService.syncFederationNow({ autoShareBackfill: autoShareBackfill === 'true', actorEmail: user?.email });
  }

  @Get('syndications')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Lister les propositions / publications d’événements fédérés' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'direction', required: false })
  @ApiQuery({ name: 'sourceOrganizationId', required: false })
  @ApiQuery({ name: 'targetOrganizationId', required: false })
  @ApiQuery({ name: 'syncStatus', required: false })
  @ApiQuery({ name: 'includeInAgenda', required: false })
  async getSyndications(
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('sourceOrganizationId') sourceOrganizationId?: string,
    @Query('targetOrganizationId') targetOrganizationId?: string,
    @Query('syncStatus') syncStatus?: string,
    @Query('includeInAgenda') includeInAgenda?: string,
  ) {
    return await this.federationService.getSyndications({ status, direction, sourceOrganizationId, targetOrganizationId, syncStatus, includeInAgenda });
  }

  @Get('forms/syndications')
  @Permissions('forms.view')
  @ApiOperation({ summary: 'Lister les propositions / publications de formulaires fédérés' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'direction', required: false })
  @ApiQuery({ name: 'sourceOrganizationId', required: false })
  @ApiQuery({ name: 'targetOrganizationId', required: false })
  @ApiQuery({ name: 'syncStatus', required: false })
  async getFormSyndications(
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('sourceOrganizationId') sourceOrganizationId?: string,
    @Query('targetOrganizationId') targetOrganizationId?: string,
    @Query('syncStatus') syncStatus?: string,
  ) {
    return await this.federationService.getFormSyndications({ status, direction, sourceOrganizationId, targetOrganizationId, syncStatus });
  }

  @Get('forms/:formId/responses-summary')
  @Permissions('forms.view')
  @ApiOperation({ summary: 'Consolidation agrégée des réponses fédérées par section' })
  async getFederatedFormResponseSummary(@Param('formId') formId: string) {
    return await this.federationService.getFederatedFormResponseSummary(formId);
  }

  @Post('forms/:formId/propose-upward')
  @Permissions('forms.write')
  @ApiOperation({ summary: 'Proposer un formulaire de section à la région' })
  async proposeFormUpward(
    @Param('formId') formId: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.federationService.proposeFormUpward(formId, body, user.email);
  }

  @Post('forms/:formId/publish-downward')
  @Permissions('forms.write')
  @ApiOperation({ summary: 'Publier un formulaire régional vers une ou plusieurs sections' })
  async publishFormDownward(
    @Param('formId') formId: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.federationService.publishFormDownward(formId, body, user.email);
  }

  @Patch('forms/syndications/:id')
  @Permissions('forms.write')
  @ApiOperation({ summary: 'Accepter / refuser / modifier une syndication de formulaire' })
  async updateFormSyndication(
    @Param('id') id: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.federationService.updateFormSyndication(id, body, user.email);
  }

  @Post('forms/syndications/:id/sync')
  @Permissions('forms.write')
  @ApiOperation({ summary: 'Relancer la synchronisation inter-instance d’une syndication de formulaire' })
  async syncFormSyndication(@Param('id') id: string) {
    return await this.federationService.syncFormSyndication(id);
  }

  @Post('forms/syndications/:id/revoke')
  @Permissions('forms.write')
  @ApiOperation({ summary: 'Révoquer une syndication de formulaire' })
  async revokeFormSyndication(
    @Param('id') id: string,
    @User() user: { email?: string },
  ) {
    return await this.federationService.revokeFormSyndication(id, user.email);
  }

  @Post('events/:eventId/propose-upward')
  @Permissions('events.write')
  @ApiOperation({ summary: 'Proposer un événement de section à la région' })
  async proposeEventUpward(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.federationService.proposeEventUpward(eventId, body, user.email);
  }

  @Post('events/:eventId/publish-downward')
  @Permissions('events.write')
  @ApiOperation({ summary: 'Publier un événement régional vers une ou plusieurs sections' })
  async publishEventDownward(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.federationService.publishEventDownward(eventId, body, user.email);
  }

  @Patch('syndications/:id')
  @Permissions('events.write')
  @ApiOperation({ summary: 'Accepter / refuser / modifier une syndication d’événement' })
  async updateSyndication(
    @Param('id') id: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.federationService.updateSyndication(id, body, user.email);
  }

  @Post('syndications/:id/sync')
  @Permissions('events.write')
  @ApiOperation({ summary: 'Relancer la synchronisation inter-instance d’une syndication' })
  async syncSyndication(@Param('id') id: string) {
    return await this.federationService.syncSyndication(id);
  }

  @Post('syndications/:id/revoke')
  @Permissions('events.write')
  @ApiOperation({ summary: 'Révoquer une syndication d’événement' })
  async revokeSyndication(
    @Param('id') id: string,
    @User() user: { email?: string },
  ) {
    return await this.federationService.revokeSyndication(id, user.email);
  }

  @Get('agenda')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Agenda fédéré accepté pour une organisation ou tout le réseau' })
  @ApiQuery({ name: 'organizationId', required: false })
  async getFederatedAgenda(@Query('organizationId') organizationId?: string) {
    return await this.federationService.getFederatedAgenda(organizationId);
  }
}

@ApiTags('federation-public')
@Controller('api/federation')
export class PublicFederationController {
  constructor(private readonly federationService: FederationService) {}

  @Post('relations/handshake')
  @ApiOperation({ summary: 'Valider le lien de fédération avec une autre instance Komuno' })
  async handshakeFederationRelation(
    @Headers('x-komuno-federation-token') token: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    return await this.federationService.handshakeFederationRelation(body, token || bearerToken);
  }

  @Post('events/ingest')
  @ApiOperation({ summary: 'Recevoir un événement fédéré depuis une autre instance Komuno' })
  async ingestFederatedEvent(
    @Headers('x-komuno-federation-token') token: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    return await this.federationService.ingestFederatedEvent(body, token || bearerToken);
  }

  @Post('forms/ingest')
  @ApiOperation({ summary: 'Recevoir un formulaire fédéré depuis une autre instance Komuno' })
  async ingestFederatedForm(
    @Headers('x-komuno-federation-token') token: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    return await this.federationService.ingestFederatedForm(body, token || bearerToken);
  }
}
