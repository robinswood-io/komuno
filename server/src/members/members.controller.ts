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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';

function memberEmailFromBody(body: unknown): string {
  if (!body || typeof body !== 'object' || !('memberEmail' in body)) {
    throw new BadRequestException('memberEmail requis');
  }
  const value = (body as { memberEmail?: unknown }).memberEmail;
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException('memberEmail requis');
  }
  return value;
}

/**
 * Controller Members - Routes membres/CRM
 */
@ApiTags('members')
@Controller('api/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // ===== Routes publiques =====

  @Post('propose')
  @ApiOperation({ summary: 'Proposer un nouveau membre (publique)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Jean' },
        lastName: { type: 'string', example: 'Dupont' },
        email: { type: 'string', format: 'email', example: 'jean.dupont@example.com' },
        company: { type: 'string', example: 'Entreprise SAS' },
        phone: { type: 'string', example: '+33612345678' },
        proposedBy: { type: 'string', example: 'Pierre Martin' }
      },
      required: ['firstName', 'lastName', 'email']
    }
  })
  @ApiResponse({ status: 201, description: 'Membre proposé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async proposeMember(@Body() body: unknown) {
    return await this.membersService.proposeMember(body);
  }
}

/**
 * Controller Admin Members - Routes admin pour la gestion des membres
 */
@ApiTags('members')
@ApiBearerAuth()
@Controller('api/admin/members')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminMembersController {
  constructor(private readonly membersService: MembersService) {}

  // ===== Routes admin - Membres =====

  @Get()
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir la liste des membres avec filtres et pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre de membres par page', example: 20 })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut', example: 'active' })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche par nom ou email', example: 'dupont' })
  @ApiQuery({ name: 'score', required: false, description: 'Filtrer par score d\'engagement', enum: ['high', 'medium', 'low'] })
  @ApiQuery({ name: 'activity', required: false, description: 'Filtrer par activité', enum: ['recent', 'inactive'] })
  @ApiQuery({ name: 'prospectionStatus', required: false, description: 'Filtrer par statut de prospection', enum: ['Qualification', 'R1', 'R2', 'Contractualisation', 'Hors cible', 'En réflexion', 'Refusé', 'Signé'] })
  @ApiQuery({ name: 'city', required: false, description: 'Filtrer par ville (partiel)', example: 'Amiens' })
  @ApiQuery({ name: 'department', required: false, description: 'Filtrer par département', example: '80' })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'Filtrer par responsable (email)', example: 'delegue@example.com' })
  @ApiQuery({ name: 'onlyProspects', required: false, description: 'Retourner uniquement les prospects (prospectionStatus != null)', type: 'boolean' })
  @ApiQuery({ name: 'excludeProspects', required: false, description: 'Exclure les prospects (prospectionStatus != null)', type: 'boolean' })
  @ApiResponse({ status: 200, description: 'Liste des membres avec pagination' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getMembers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('score') score?: 'high' | 'medium' | 'low',
    @Query('activity') activity?: 'recent' | 'inactive',
    @Query('prospectionStatus') prospectionStatus?: string,
    @Query('city') city?: string,
    @Query('department') department?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('onlyProspects') onlyProspects?: string,
    @Query('excludeProspects') excludeProspects?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return await this.membersService.getMembers(pageNum, limitNum, status, search, score, activity, prospectionStatus, city, department, assignedTo, onlyProspects === 'true', excludeProspects === 'true');
  }

  @Post()
  @Permissions('admin.manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un nouveau membre' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Jean' },
        lastName: { type: 'string', example: 'Dupont' },
        email: { type: 'string', format: 'email', example: 'jean.dupont@example.com' },
        company: { type: 'string', example: 'Entreprise SAS' },
        department: { type: 'string', example: 'Hauts-de-France' },
        city: { type: 'string', example: 'Amiens' },
        postalCode: { type: 'string', example: '80000' },
        epci: { type: 'string', example: 'CA Amiens Métropole' },
        prospectionStatus: {
          type: 'string',
          enum: ['2027', 'Refusé', 'A contacter', 'RDV prévu', 'Intérêt - à relancer', ''],
          example: 'A contacter'
        },
        firstContactDate: { type: 'string', format: 'date', example: '2026-01-15' },
        meetingDate: { type: 'string', format: 'date', example: '2026-02-20' },
        sector: { type: 'string', example: 'Services aux entreprises' },
        phone: { type: 'string', example: '+33612345678' },
        role: { type: 'string', example: 'Directeur' },
        cjdRole: { type: 'string', example: 'president' },
        notes: { type: 'string', example: 'Notes additionnelles' },
        status: { type: 'string', enum: ['active', 'proposed'], default: 'active' },
        proposedBy: { type: 'string', format: 'email', example: 'parrain@example.com' }
      },
      required: ['firstName', 'lastName', 'email']
    }
  })
  @ApiResponse({ status: 201, description: 'Membre créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 409, description: 'Le membre existe déjà' })
  async createMember(
    @Body() body: unknown,
    @User() user: { email: string },
  ) {
    return await this.membersService.createMember(body, user.email);
  }

  // ===== Routes admin - Opérations en masse (AVANT les routes :email) =====

  @Patch('bulk-status')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Mettre à jour le statut de plusieurs membres en masse' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emails: { type: 'array', items: { type: 'string', format: 'email' }, example: ['a@b.com', 'c@d.com'] },
        status: { type: 'string', example: 'active' }
      },
      required: ['emails', 'status']
    }
  })
  @ApiResponse({ status: 200, description: 'Statuts mis à jour en masse' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async bulkUpdateStatus(@Body() body: { emails: string[]; status: string }) {
    const { emails, status } = body;
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new BadRequestException('emails doit être un tableau non vide');
    }
    return await this.membersService.bulkUpdateStatus(emails, status);
  }

  @Post('bulk-tag')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Assigner un tag à plusieurs membres en masse' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emails: { type: 'array', items: { type: 'string', format: 'email' }, example: ['a@b.com', 'c@d.com'] },
        tagId: { type: 'string', example: 'uuid-tag-123' }
      },
      required: ['emails', 'tagId']
    }
  })
  @ApiResponse({ status: 201, description: 'Tag assigné en masse' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async bulkAssignTag(@Body() body: { emails: string[]; tagId: string }) {
    const { emails, tagId } = body;
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new BadRequestException('emails doit être un tableau non vide');
    }
    return await this.membersService.bulkAssignTag(emails, tagId);
  }

  @Post('bulk-delete')
  @Permissions('admin.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer plusieurs membres en masse' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emails: { type: 'array', items: { type: 'string', format: 'email' }, example: ['a@b.com', 'c@d.com'] },
      },
      required: ['emails'],
    },
  })
  @ApiResponse({ status: 200, description: 'Membres supprimés en masse' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async bulkDelete(@Body() body: { emails: string[] }) {
    const { emails } = body;
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new BadRequestException('emails doit être un tableau non vide');
    }
    return await this.membersService.bulkDelete(emails);
  }

  @Post('bulk-subscription')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Assigner une cotisation à plusieurs membres en masse' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emails: { type: 'array', items: { type: 'string', format: 'email' } },
        subscriptionTypeId: { type: 'string', format: 'uuid' },
        startDate: { type: 'string', format: 'date', example: '2026-01-01' },
        paymentMethod: { type: 'string', example: 'bank_transfer' },
      },
      required: ['emails', 'subscriptionTypeId', 'startDate'],
    },
  })
  @ApiResponse({ status: 201, description: 'Cotisations assignées en masse' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async bulkAssignSubscription(
    @Body() body: { emails: string[]; subscriptionTypeId: string; startDate: string; paymentMethod?: string },
    @User() user: { email: string },
  ) {
    const { emails, subscriptionTypeId, startDate, paymentMethod } = body;
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new BadRequestException('emails doit être un tableau non vide');
    }
    return await this.membersService.bulkAssignSubscription(
      emails,
      subscriptionTypeId,
      startDate,
      paymentMethod,
      user.email,
    );
  }

  @Get(':email')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir un membre par email' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiResponse({ status: 200, description: 'Détails du membre' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async getMemberByEmail(@Param('email') email: string) {
    return await this.membersService.getMemberByEmail(email);
  }

  @Get(':email/activities')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir l\'historique d\'activité d\'un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiResponse({ status: 200, description: 'Liste des activités du membre' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async getMemberActivities(@Param('email') email: string) {
    return await this.membersService.getMemberActivities(email);
  }

  @Get(':email/details')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les détails complets d\'un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiResponse({ status: 200, description: 'Détails complets du membre avec statistiques' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async getMemberDetails(@Param('email') email: string) {
    return await this.membersService.getMemberDetails(email);
  }

  @Get(':email/ownership-history')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Historique des créateurs et responsables d\'un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre' })
  @ApiResponse({ status: 200, description: 'Historique de responsabilité' })
  async getMemberOwnershipHistory(@Param('email') email: string) {
    return await this.membersService.getMemberOwnershipHistory(email);
  }

  @Patch(':email/assign')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Attribuer un membre à un admin responsable' })
  @ApiParam({ name: 'email', description: 'Email du membre' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assignedTo: { type: 'string', format: 'email', example: 'manager@example.com' },
        note: { type: 'string', example: 'Transfert suite à départ' },
      },
      required: ['assignedTo'],
    },
  })
  @ApiResponse({ status: 200, description: 'Attribution mise à jour' })
  async assignMember(
    @Param('email') email: string,
    @Body() body: unknown,
    @User() user: { email: string },
  ) {
    return await this.membersService.assignMember(email, body, user.email);
  }

  @Patch(':email')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Mettre à jour les informations d\'un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Jean' },
        lastName: { type: 'string', example: 'Dupont' },
        company: { type: 'string', example: 'Nouvelle Entreprise SAS' },
        phone: { type: 'string', example: '+33612345678' },
        role: { type: 'string', example: 'Directeur' },
        cjdRole: { type: 'string', example: 'president' },
        notes: { type: 'string', example: 'Notes additionnelles' },
        status: { type: 'string', enum: ['active', 'inactive', 'proposed'] }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Membre mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async updateMember(
    @Param('email') email: string,
    @Body() body: unknown,
    @User() user: { email: string },
  ) {
    return await this.membersService.updateMember(email, body, user.email);
  }

  @Delete(':email')
  @Permissions('admin.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un membre (nécessite permission admin.manage)' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiResponse({ status: 204, description: 'Membre supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async deleteMember(@Param('email') email: string) {
    await this.membersService.deleteMember(email);
  }

  // ===== Routes admin - Subscriptions =====

  @Get(':email/subscriptions')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les souscriptions d\'un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiResponse({ status: 200, description: 'Liste des souscriptions du membre' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async getMemberSubscriptions(@Param('email') email: string) {
    return await this.membersService.getMemberSubscriptions(email);
  }

  @Post(':email/subscriptions')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Créer une souscription pour un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amountInCents: { type: 'number', example: 50000, description: 'Montant en centimes' },
        startDate: { type: 'string', format: 'date', example: '2026-01-01' },
        endDate: { type: 'string', format: 'date', example: '2026-12-31' }
      },
      required: ['amountInCents', 'startDate', 'endDate']
    }
  })
  @ApiResponse({ status: 201, description: 'Souscription créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async createMemberSubscription(
    @Param('email') email: string,
    @Body() body: unknown,
  ) {
    return await this.membersService.createMemberSubscription(email, body);
  }

  // ===== Routes admin - Tags =====

  @Get(':email/tags')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les tags d\'un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiResponse({ status: 200, description: 'Liste des tags du membre' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async getMemberTags(@Param('email') email: string) {
    return await this.membersService.getMemberTags(email);
  }

  @Post(':email/tags')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Assigner un tag à un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tagId: { type: 'string', example: 'uuid-tag-123' }
      },
      required: ['tagId']
    }
  })
  @ApiResponse({ status: 201, description: 'Tag assigné avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre ou tag non trouvé' })
  async assignTagToMember(
    @Param('email') email: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.membersService.assignTagToMember(email, body, user.email);
  }

  @Delete(':email/tags/:tagId')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer un tag d\'un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiParam({ name: 'tagId', description: 'ID du tag', example: 'uuid-tag-123' })
  @ApiResponse({ status: 204, description: 'Tag retiré avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre ou tag non trouvé' })
  async removeTagFromMember(
    @Param('email') email: string,
    @Param('tagId') tagId: string,
  ) {
    await this.membersService.removeTagFromMember(email, tagId);
  }

  // ===== Routes admin - Tasks =====

  @Get(':email/tasks')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les tâches d\'un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiResponse({ status: 200, description: 'Liste des tâches du membre' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async getMemberTasks(@Param('email') email: string) {
    return await this.membersService.getMemberTasks(email);
  }

  @Post(':email/tasks')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Créer une tâche pour un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Appeler le membre' },
        description: { type: 'string', example: 'Prendre des nouvelles et proposer un événement' },
        dueDate: { type: 'string', format: 'date', example: '2026-02-15' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'medium' }
      },
      required: ['title']
    }
  })
  @ApiResponse({ status: 201, description: 'Tâche créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async createMemberTask(
    @Param('email') email: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.membersService.createMemberTask(email, body, user.email);
  }

  // ===== Routes admin - Relations =====

  @Get(':email/relations')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les relations d\'un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiResponse({ status: 200, description: 'Liste des relations du membre' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async getMemberRelations(@Param('email') email: string) {
    return await this.membersService.getMemberRelations(email);
  }

  @Post(':email/relations')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Créer une relation pour un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        relatedMemberEmail: { type: 'string', format: 'email', example: 'pierre.martin@example.com' },
        relationType: { type: 'string', example: 'collegue' },
        notes: { type: 'string', example: 'Travaillent ensemble depuis 2020' }
      },
      required: ['relatedMemberEmail', 'relationType']
    }
  })
  @ApiResponse({ status: 201, description: 'Relation créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async createMemberRelation(
    @Param('email') email: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.membersService.createMemberRelation(email, body, user.email);
  }

  // ===== Routes admin - Contacts membres (historique d'interactions) =====

  @Get(':email/contacts')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir l\'historique des interactions d\'un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiResponse({ status: 200, description: 'Liste des interactions du membre' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Membre non trouvé' })
  async getMemberContacts(@Param('email') email: string) {
    return await this.membersService.getMemberContacts(email);
  }

  @Post(':email/contacts')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une interaction pour un membre' })
  @ApiParam({ name: 'email', description: 'Email du membre', example: 'jean.dupont@example.com' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['meeting', 'email', 'call', 'lunch', 'event'], example: 'call' },
        subject: { type: 'string', example: 'Appel de suivi' },
        date: { type: 'string', format: 'date', example: '2026-02-27' },
        description: { type: 'string', example: 'Discussion sur le renouvellement de cotisation' },
        duration: { type: 'number', example: 30 },
        startTime: { type: 'string', example: '14:30' },
        notes: { type: 'string', example: 'Rappeler dans 2 semaines' },
      },
      required: ['type', 'subject', 'date', 'description']
    }
  })
  @ApiResponse({ status: 201, description: 'Interaction créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createMemberContact(
    @Param('email') email: string,
    @Body() body: unknown,
    @User() user: { email: string },
  ) {
    return await this.membersService.createMemberContact(email, body, user.email);
  }
}

/**
 * Controller Admin Member Tags - Routes admin pour la gestion des tags
 */
@ApiTags('members')
@ApiBearerAuth()
@Controller('api/admin/tags')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminMemberTagsController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir tous les tags disponibles' })
  @ApiResponse({ status: 200, description: 'Liste des tags' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getAllTags() {
    return await this.membersService.getAllTags();
  }

  @Post()
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Créer un nouveau tag' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'VIP' },
        color: { type: 'string', example: '#3b82f6' },
        description: { type: 'string', example: 'Membres VIP du CJD' }
      },
      required: ['name']
    }
  })
  @ApiResponse({ status: 201, description: 'Tag créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createTag(@Body() body: unknown) {
    return await this.membersService.createTag(body);
  }

  @Patch(':id')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Mettre à jour un tag' })
  @ApiParam({ name: 'id', description: 'ID du tag', example: 'uuid-tag-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'VIP Gold' },
        color: { type: 'string', example: '#f59e0b' },
        description: { type: 'string', example: 'Membres VIP Gold' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Tag mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Tag non trouvé' })
  async updateTag(@Param('id') id: string, @Body() body: unknown) {
    return await this.membersService.updateTag(id, body);
  }

  @Delete(':id')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un tag' })
  @ApiParam({ name: 'id', description: 'ID du tag', example: 'uuid-tag-123' })
  @ApiResponse({ status: 204, description: 'Tag supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Tag non trouvé' })
  async deleteTag(@Param('id') id: string) {
    await this.membersService.deleteTag(id);
  }
}

/**
 * Controller Admin Member Tasks - Routes admin pour la gestion des tâches
 */
@ApiTags('members')
@ApiBearerAuth()
@Controller('api/admin/tasks')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminMemberTasksController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir toutes les tâches' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut', example: 'pending' })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'Filtrer par assigné', example: 'user@example.com' })
  @ApiResponse({ status: 200, description: 'Liste des tâches' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getAllTasks(
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return await this.membersService.getAllTasks({
      ...(status && { status }),
      ...(assignedTo && { assignedTo }),
    });
  }

  @Post()
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Créer une nouvelle tâche' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Nouvelle tâche' },
        description: { type: 'string', example: 'Description de la tâche' },
        dueDate: { type: 'string', format: 'date', example: '2026-02-20' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'medium' },
        memberId: { type: 'string', example: 'uuid-member-123' },
        memberEmail: { type: 'string', format: 'email', example: 'member@example.com' }
      },
      required: ['title', 'memberEmail']
    }
  })
  @ApiResponse({ status: 201, description: 'Tâche créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createTask(
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.membersService.createMemberTask(memberEmailFromBody(body), body, user.email);
  }

  @Patch(':id')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Mettre à jour une tâche' })
  @ApiParam({ name: 'id', description: 'ID de la tâche', example: 'uuid-task-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Nouvelle tâche mise à jour' },
        description: { type: 'string', example: 'Description mise à jour' },
        dueDate: { type: 'string', format: 'date', example: '2026-02-20' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Tâche mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Tâche non trouvée' })
  async updateTask(
    @Param('id') id: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.membersService.updateTask(id, body, user.email);
  }

  @Delete(':id')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une tâche' })
  @ApiParam({ name: 'id', description: 'ID de la tâche', example: 'uuid-task-123' })
  @ApiResponse({ status: 204, description: 'Tâche supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Tâche non trouvée' })
  async deleteTask(@Param('id') id: string) {
    await this.membersService.deleteTask(id);
  }
}

/**
 * Controller Admin Member Relations - Routes admin pour la gestion des relations
 */
@ApiTags('members')
@ApiBearerAuth()
@Controller('api/admin/relations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminMemberRelationsController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Récupérer toutes les relations entre membres' })
  @ApiResponse({ status: 200, description: 'Liste de toutes les relations', schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array' } } } })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getAllRelations() {
    return await this.membersService.getAllRelations();
  }

  @Post()
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Créer une nouvelle relation entre membres' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        memberEmail: { type: 'string', format: 'email', example: 'member1@example.com' },
        relatedMemberEmail: { type: 'string', format: 'email', example: 'member2@example.com' },
        relationType: { type: 'string', enum: ['sponsor', 'team', 'custom'], example: 'sponsor' },
        description: { type: 'string', example: 'Description de la relation' }
      },
      required: ['memberEmail', 'relatedMemberEmail', 'relationType']
    }
  })
  @ApiResponse({ status: 201, description: 'Relation créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async createRelation(@Body() body: unknown, @User() user: { email?: string }) {
    return await this.membersService.createMemberRelation(memberEmailFromBody(body), body, user.email);
  }

  @Delete(':id')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une relation entre membres' })
  @ApiParam({ name: 'id', description: 'ID de la relation', example: 'uuid-relation-123' })
  @ApiResponse({ status: 204, description: 'Relation supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Relation non trouvée' })
  async deleteRelation(@Param('id') id: string) {
    await this.membersService.deleteRelation(id);
  }
}

/**
 * Controller Admin Member Contacts - Routes admin pour l'historique d'interactions membres
 */
@ApiTags('members')
@ApiBearerAuth()
@Controller('api/admin/member-contacts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminMemberContactsController {
  constructor(private readonly membersService: MembersService) {}

  @Patch(':id')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Mettre à jour un contact membre' })
  @ApiParam({ name: 'id', description: 'ID du contact', example: 'uuid-contact-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['meeting', 'email', 'call', 'lunch', 'event'] },
        subject: { type: 'string', example: 'Appel de suivi' },
        date: { type: 'string', format: 'date', example: '2026-02-27' },
        description: { type: 'string', example: 'Description de l\'interaction' },
        duration: { type: 'number', example: 30 },
        notes: { type: 'string', example: 'Notes additionnelles' },
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Contact mis à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Contact non trouvé' })
  async updateMemberContact(@Param('id') id: string, @Body() body: unknown) {
    return await this.membersService.updateMemberContact(id, body);
  }

  @Delete(':id')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un contact membre' })
  @ApiParam({ name: 'id', description: 'ID du contact', example: 'uuid-contact-123' })
  @ApiResponse({ status: 204, description: 'Contact supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Contact non trouvé' })
  async deleteMemberContact(@Param('id') id: string) {
    await this.membersService.deleteMemberContact(id);
  }
}

/**
 * Controller Admin Member Groups - Routes admin pour les groupes annuels de membres
 */
@ApiTags('members')
@ApiBearerAuth()
@Controller('api/admin/member-groups')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminMemberGroupsController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Lister les groupes annuels de membres' })
  @ApiQuery({ name: 'year', required: false, example: 2026 })
  @ApiQuery({ name: 'type', required: false, enum: ['copil', 'commission', 'bureau', 'working_group', 'other'] })
  @ApiQuery({ name: 'memberEmail', required: false, example: 'membre@example.com' })
  @ApiQuery({ name: 'search', required: false, example: 'commission' })
  @ApiQuery({ name: 'includeInactive', required: false, type: 'boolean' })
  @ApiResponse({ status: 200, description: 'Groupes annuels avec leurs membres' })
  async getMemberGroups(
    @Query('year') year?: string,
    @Query('type') type?: string,
    @Query('memberEmail') memberEmail?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return await this.membersService.getMemberGroups({
      ...(year ? { year: parseInt(year, 10) } : {}),
      ...(type ? { type } : {}),
      ...(memberEmail ? { memberEmail } : {}),
      ...(search ? { search } : {}),
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('summary')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Vue synthèse: qui est dans quel groupe et fait quoi' })
  @ApiQuery({ name: 'year', required: false, example: 2026 })
  @ApiResponse({ status: 200, description: 'Synthèse des affectations par membre' })
  async getMemberGroupSummary(@Query('year') year?: string) {
    return await this.membersService.getMemberGroupSummary(year ? parseInt(year, 10) : undefined);
  }

  @Get(':id')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir le détail d’un groupe annuel' })
  @ApiParam({ name: 'id', description: 'ID du groupe' })
  @ApiResponse({ status: 200, description: 'Groupe annuel détaillé' })
  @ApiResponse({ status: 404, description: 'Groupe non trouvé' })
  async getMemberGroup(@Param('id') id: string) {
    return await this.membersService.getMemberGroup(id);
  }

  @Post()
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un groupe annuel de membres' })
  @ApiResponse({ status: 201, description: 'Groupe créé' })
  async createMemberGroup(@Body() body: unknown, @User() user: { email?: string }) {
    return await this.membersService.createMemberGroup(body, user.email);
  }

  @Patch(':id')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Mettre à jour un groupe annuel de membres' })
  @ApiParam({ name: 'id', description: 'ID du groupe' })
  @ApiResponse({ status: 200, description: 'Groupe mis à jour' })
  async updateMemberGroup(@Param('id') id: string, @Body() body: unknown) {
    return await this.membersService.updateMemberGroup(id, body);
  }

  @Delete(':id')
  @Permissions('admin.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un groupe annuel et ses affectations' })
  @ApiParam({ name: 'id', description: 'ID du groupe' })
  @ApiResponse({ status: 204, description: 'Groupe supprimé' })
  async deleteMemberGroup(@Param('id') id: string) {
    await this.membersService.deleteMemberGroup(id);
  }

  @Post(':id/duplicate')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Dupliquer un groupe vers une autre année' })
  @ApiParam({ name: 'id', description: 'ID du groupe source' })
  @ApiResponse({ status: 201, description: 'Groupe dupliqué' })
  async duplicateMemberGroup(
    @Param('id') id: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.membersService.duplicateMemberGroup(id, body, user.email);
  }

  @Post(':id/members')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ajouter un membre à un groupe annuel' })
  @ApiParam({ name: 'id', description: 'ID du groupe' })
  @ApiResponse({ status: 201, description: 'Membre ajouté au groupe' })
  async addMemberToGroup(
    @Param('id') id: string,
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return await this.membersService.addMemberToGroup(id, body, user.email);
  }

  @Patch(':id/members/:membershipId')
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Mettre à jour le rôle/la mission d’un membre dans un groupe' })
  @ApiParam({ name: 'id', description: 'ID du groupe' })
  @ApiParam({ name: 'membershipId', description: 'ID de l’affectation' })
  @ApiResponse({ status: 200, description: 'Affectation mise à jour' })
  async updateMemberGroupMembership(
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Body() body: unknown,
  ) {
    return await this.membersService.updateMemberGroupMembership(id, membershipId, body);
  }

  @Delete(':id/members/:membershipId')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer un membre d’un groupe annuel' })
  @ApiParam({ name: 'id', description: 'ID du groupe' })
  @ApiParam({ name: 'membershipId', description: 'ID de l’affectation' })
  @ApiResponse({ status: 204, description: 'Membre retiré du groupe' })
  async removeMemberFromGroup(
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
  ) {
    await this.membersService.removeMemberFromGroup(id, membershipId);
  }
}

