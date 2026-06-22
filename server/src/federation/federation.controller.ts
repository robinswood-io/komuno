import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
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
  async createRelation(@Body() body: unknown) {
    return await this.federationService.createRelation(body);
  }

  @Patch('relations/:id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Modifier un lien entre organisations' })
  async updateRelation(@Param('id') id: string, @Body() body: unknown) {
    return await this.federationService.updateRelation(id, body);
  }

  @Get('syndications')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Lister les propositions / publications d’événements fédérés' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'direction', required: false })
  async getSyndications(
    @Query('status') status?: string,
    @Query('direction') direction?: string,
  ) {
    return await this.federationService.getSyndications({ status, direction });
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
}
