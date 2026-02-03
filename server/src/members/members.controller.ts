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
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';

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
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return await this.membersService.getMembers(pageNum, limitNum, status, search, score, activity);
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
        phone: { type: 'string', example: '+33612345678' },
        role: { type: 'string', example: 'Directeur' },
        notes: { type: 'string', example: 'Notes additionnelles' },
        status: { type: 'string', enum: ['active', 'proposed'], default: 'active' }
      },
      required: ['firstName', 'lastName', 'email']
    }
  })
  @ApiResponse({ status: 201, description: 'Membre créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 409, description: 'Le membre existe déjà' })
  async createMember(@Body() body: unknown) {
    return await this.membersService.createMember(body);
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

  @Patch(':email')
  @Permissions('admin.view')
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
    return await this.membersService.createMemberTask((body as any)?.memberEmail, body, user.email);
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
    return await this.membersService.createMemberRelation((body as any)?.memberEmail, body, user.email);
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

