import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PatronsService } from './patrons.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';

/**
 * Controller Patrons - Routes mécènes publiques
 */
@ApiTags('patrons')
@Controller('api/patrons')
export class PatronsController {
  constructor(private readonly patronsService: PatronsService) {}

  @Post('propose')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Proposer un nouveau mécène' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Marie' },
        lastName: { type: 'string', example: 'Durand' },
        email: { type: 'string', format: 'email', example: 'marie.durand@entreprise.com' },
        company: { type: 'string', example: 'Entreprise XYZ' },
        phone: { type: 'string', example: '+33612345678' },
        role: { type: 'string', example: 'Directrice Générale' },
        notes: { type: 'string', example: 'Rencontrée lors du salon' }
      },
      required: ['firstName', 'lastName', 'email']
    }
  })
  @ApiResponse({ status: 201, description: 'Mécène proposé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async proposePatron(
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.patronsService.proposePatron(body, user?.email);
  }
}

/**
 * Controller Admin Patrons - Routes admin pour la gestion des mécènes
 */
@ApiTags('patrons')
@ApiBearerAuth()
@Controller(['api/patrons', 'api/admin/patrons'])
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminPatronsController {
  constructor(private readonly patronsService: PatronsService) {}

  @Get()
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Obtenir la liste des mécènes avec filtres et pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre de mécènes par page', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut', enum: ['active', 'proposed'] })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche par nom ou email', example: 'durand' })
  @ApiResponse({ status: 200, description: 'Liste des mécènes avec pagination' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getPatrons(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return await this.patronsService.getPatrons(pageNum, limitNum, status, search);
  }

  @Get('search/email')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Rechercher un mécène par email' })
  @ApiQuery({ name: 'email', required: true, description: 'Email du mécène', example: 'marie@entreprise.com' })
  @ApiResponse({ status: 200, description: 'Mécène trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async searchPatronByEmail(@Query('email') email: string) {
    return await this.patronsService.searchPatronByEmail(email);
  }

  @Get(':id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Obtenir un mécène par ID' })
  @ApiParam({ name: 'id', description: 'ID du mécène', example: 'uuid-patron-123' })
  @ApiResponse({ status: 200, description: 'Détails du mécène' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async getPatronById(@Param('id') id: string) {
    return await this.patronsService.getPatronById(id);
  }

  @Post()
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer un nouveau mécène' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Marie' },
        lastName: { type: 'string', example: 'Durand' },
        email: { type: 'string', format: 'email', example: 'marie.durand@entreprise.com' },
        company: { type: 'string', example: 'Entreprise XYZ' },
        phone: { type: 'string', example: '+33612345678' },
        role: { type: 'string', example: 'Directrice Générale' },
        notes: { type: 'string', example: 'Notes sur le mécène' },
        referrerId: { type: 'string', example: 'uuid-member-123', description: 'ID du membre prescripteur' }
      },
      required: ['firstName', 'lastName', 'email']
    }
  })
  @ApiResponse({ status: 201, description: 'Mécène créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createPatron(
    @Body() body: unknown,
    @User() user: { email: string },
  ) {
    return await this.patronsService.createPatron(body, user.email);
  }

  @Patch(':id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour un mécène' })
  @ApiParam({ name: 'id', description: 'ID du mécène', example: 'uuid-patron-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        company: { type: 'string' },
        phone: { type: 'string' },
        role: { type: 'string' },
        notes: { type: 'string' },
        status: { type: 'string', enum: ['active', 'proposed'] }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Mécène mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async updatePatron(
    @Param('id') id: string,
    @Body() body: unknown,
    @User() user: { email: string },
  ) {
    return await this.patronsService.updatePatron(id, body, user.email);
  }

  @Delete(':id')
  @Permissions('admin.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un mécène' })
  @ApiParam({ name: 'id', description: 'ID du mécène', example: 'uuid-patron-123' })
  @ApiResponse({ status: 204, description: 'Mécène supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async deletePatron(@Param('id') id: string) {
    await this.patronsService.deletePatron(id);
  }

  // ===== Routes admin - Donations =====

  @Post(':id/donations')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Enregistrer un don d\'un mécène' })
  @ApiParam({ name: 'id', description: 'ID du mécène', example: 'uuid-patron-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amountInCents: { type: 'number', example: 100000, description: 'Montant en centimes' },
        donatedAt: { type: 'string', format: 'date-time', example: '2026-01-15T10:00:00Z' },
        occasion: { type: 'string', example: 'Soirée de gala annuelle' }
      },
      required: ['amountInCents', 'donatedAt', 'occasion']
    }
  })
  @ApiResponse({ status: 201, description: 'Don enregistré avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async createPatronDonation(
    @Param('id') patronId: string,
    @Body() body: unknown,
    @User() user: { email: string },
  ) {
    return await this.patronsService.createPatronDonation(patronId, body, user.email);
  }

  @Get(':id/donations')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Obtenir l\'historique des dons d\'un mécène' })
  @ApiParam({ name: 'id', description: 'ID du mécène', example: 'uuid-patron-123' })
  @ApiResponse({ status: 200, description: 'Liste des dons du mécène' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async getPatronDonations(@Param('id') patronId: string) {
    return await this.patronsService.getPatronDonations(patronId);
  }

  // ===== Routes admin - Proposals =====

  @Get(':id/proposals')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Obtenir les propositions idées-mécène' })
  @ApiParam({ name: 'id', description: 'ID du mécène', example: 'uuid-patron-123' })
  @ApiResponse({ status: 200, description: 'Liste des propositions du mécène' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async getPatronProposals(@Param('id') patronId: string) {
    return await this.patronsService.getPatronProposals(patronId);
  }

  // ===== Routes admin - Updates =====

  @Post(':id/updates')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer une actualité/contact avec un mécène' })
  @ApiParam({ name: 'id', description: 'ID du mécène', example: 'uuid-patron-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['meeting', 'email', 'call', 'lunch', 'event'], example: 'meeting' },
        subject: { type: 'string', example: 'Réunion de présentation' },
        date: { type: 'string', format: 'date', example: '2026-01-20' },
        startTime: { type: 'string', example: '14:00' },
        duration: { type: 'number', example: 60, description: 'Durée en minutes' },
        description: { type: 'string', example: 'Présentation du projet annuel' },
        notes: { type: 'string', example: 'Très intéressé par le projet' }
      },
      required: ['type', 'subject', 'date', 'description']
    }
  })
  @ApiResponse({ status: 201, description: 'Actualité créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async createPatronUpdate(
    @Param('id') patronId: string,
    @Body() body: unknown,
    @User() user: { email: string },
  ) {
    return await this.patronsService.createPatronUpdate(patronId, body, user.email);
  }

  @Get(':id/updates')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Obtenir l\'historique des contacts avec un mécène' })
  @ApiParam({ name: 'id', description: 'ID du mécène', example: 'uuid-patron-123' })
  @ApiResponse({ status: 200, description: 'Liste des actualités du mécène' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async getPatronUpdates(@Param('id') patronId: string) {
    return await this.patronsService.getPatronUpdates(patronId);
  }

  // ===== Routes admin - Sponsorships =====

  @Post(':patronId/sponsorships')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer un sponsoring pour un mécène' })
  @ApiParam({ name: 'patronId', description: 'ID du mécène', example: 'uuid-patron-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', example: 'uuid-event-123' },
        amountInCents: { type: 'number', example: 200000, description: 'Montant en centimes' },
        type: { type: 'string', example: 'gold', description: 'Type de sponsoring' },
        notes: { type: 'string', example: 'Sponsor principal de la soirée' }
      },
      required: ['eventId', 'amountInCents']
    }
  })
  @ApiResponse({ status: 201, description: 'Sponsoring créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async createPatronSponsorship(
    @Param('patronId') patronId: string,
    @Body() body: unknown,
    @User() user: { email: string },
  ) {
    return await this.patronsService.createPatronSponsorship(patronId, body, user.email);
  }

  @Get(':patronId/sponsorships')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les sponsorings d\'un mécène' })
  @ApiParam({ name: 'patronId', description: 'ID du mécène', example: 'uuid-patron-123' })
  @ApiResponse({ status: 200, description: 'Liste des sponsorings du mécène' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Mécène non trouvé' })
  async getPatronSponsorships(@Param('patronId') patronId: string) {
    return await this.patronsService.getPatronSponsorships(patronId);
  }
}

/**
 * Controller Admin Donations - Routes admin pour la gestion globale des dons
 */
@ApiTags('patrons')
@ApiBearerAuth()
@Controller('api/donations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminDonationsController {
  constructor(private readonly patronsService: PatronsService) {}

  @Get()
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Obtenir tous les dons de tous les mécènes' })
  @ApiResponse({ status: 200, description: 'Liste de tous les dons' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getAllDonations() {
    return await this.patronsService.getAllDonations();
  }

  @Patch(':id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour un don' })
  @ApiParam({ name: 'id', description: 'ID du don', example: 'uuid-donation-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amountInCents: { type: 'number', example: 150000 },
        occasion: { type: 'string', example: 'Événement modifié' },
        donatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Don mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Don non trouvé' })
  async updatePatronDonation(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return await this.patronsService.updatePatronDonation(id, body);
  }

  @Delete(':id')
  @Permissions('admin.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un don' })
  @ApiParam({ name: 'id', description: 'ID du don', example: 'uuid-donation-123' })
  @ApiResponse({ status: 204, description: 'Don supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Don non trouvé' })
  async deletePatronDonation(@Param('id') id: string) {
    await this.patronsService.deletePatronDonation(id);
  }
}

/**
 * Controller Admin Proposals - Routes admin pour la gestion globale des propositions
 */
@ApiTags('patrons')
@ApiBearerAuth()
@Controller('api/proposals')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminProposalsController {
  constructor(private readonly patronsService: PatronsService) {}

  @Patch(':id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour une proposition idée-mécène' })
  @ApiParam({ name: 'id', description: 'ID de la proposition', example: 'uuid-proposal-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['proposed', 'contacted', 'declined', 'converted'], example: 'contacted' },
        comments: { type: 'string', example: 'Contact effectué, en attente de réponse' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Proposition mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Proposition non trouvée' })
  async updateIdeaPatronProposal(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return await this.patronsService.updateIdeaPatronProposal(id, body);
  }

  @Delete(':id')
  @Permissions('admin.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une proposition idée-mécène' })
  @ApiParam({ name: 'id', description: 'ID de la proposition', example: 'uuid-proposal-123' })
  @ApiResponse({ status: 204, description: 'Proposition supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Proposition non trouvée' })
  async deleteIdeaPatronProposal(@Param('id') id: string) {
    await this.patronsService.deleteIdeaPatronProposal(id);
  }
}

/**
 * Controller Admin Patron Updates - Routes admin pour la gestion globale des actualités
 */
@ApiTags('patrons')
@ApiBearerAuth()
@Controller('api/patron-updates')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminPatronUpdatesController {
  constructor(private readonly patronsService: PatronsService) {}

  @Patch(':id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour une actualité mécène' })
  @ApiParam({ name: 'id', description: 'ID de l\'actualité', example: 'uuid-update-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['meeting', 'email', 'call', 'lunch', 'event'] },
        subject: { type: 'string' },
        date: { type: 'string', format: 'date' },
        startTime: { type: 'string' },
        duration: { type: 'number' },
        description: { type: 'string' },
        notes: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Actualité mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Actualité non trouvée' })
  async updatePatronUpdate(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return await this.patronsService.updatePatronUpdate(id, body);
  }

  @Delete(':id')
  @Permissions('admin.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une actualité mécène' })
  @ApiParam({ name: 'id', description: 'ID de l\'actualité', example: 'uuid-update-123' })
  @ApiResponse({ status: 204, description: 'Actualité supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Actualité non trouvée' })
  async deletePatronUpdate(@Param('id') id: string) {
    await this.patronsService.deletePatronUpdate(id);
  }
}

/**
 * Controller Admin Sponsorships - Routes admin pour la gestion globale des sponsorings
 */
@ApiTags('patrons')
@ApiBearerAuth()
@Controller('api/sponsorships')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminSponsorshipsController {
  constructor(private readonly patronsService: PatronsService) {}

  @Get()
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir tous les sponsorings' })
  @ApiResponse({ status: 200, description: 'Liste de tous les sponsorings' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getAllSponsorships() {
    return await this.patronsService.getAllSponsorships();
  }

  @Get('stats')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les statistiques des sponsorings' })
  @ApiResponse({ status: 200, description: 'Statistiques des sponsorings (total, par type, par période)' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getSponsorshipStats() {
    return await this.patronsService.getSponsorshipStats();
  }

  @Patch(':id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Mettre à jour un sponsoring' })
  @ApiParam({ name: 'id', description: 'ID du sponsoring', example: 'uuid-sponsorship-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amountInCents: { type: 'number', example: 250000 },
        type: { type: 'string', example: 'platinum' },
        notes: { type: 'string', example: 'Notes mises à jour' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Sponsoring mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Sponsoring non trouvé' })
  async updateEventSponsorship(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return await this.patronsService.updateEventSponsorship(id, body);
  }

  @Delete(':id')
  @Permissions('admin.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un sponsoring' })
  @ApiParam({ name: 'id', description: 'ID du sponsoring', example: 'uuid-sponsorship-123' })
  @ApiResponse({ status: 204, description: 'Sponsoring supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Sponsoring non trouvé' })
  async deleteEventSponsorship(@Param('id') id: string) {
    await this.patronsService.deleteEventSponsorship(id);
  }
}
