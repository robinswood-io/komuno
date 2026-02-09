import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { MemberStatusesService } from './member-statuses.service';
import { AdminGuard } from '../auth/admin.guard';

/**
 * Contrôleur Member Statuses - Gestion des statuts personnalisables
 */
@ApiTags('Admin - Member Statuses')
@Controller('api/admin/member-statuses')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class MemberStatusesController {
  constructor(private readonly memberStatusesService: MemberStatusesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister tous les statuts membres',
    description: 'Récupère la liste de tous les statuts (membres + prospects) avec filtres optionnels',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['member', 'prospect'],
    description: 'Filtrer par catégorie',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: 'boolean',
    description: 'Filtrer par statut actif/inactif',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des statuts',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              code: { type: 'string', example: 'active' },
              label: { type: 'string', example: 'Actif' },
              category: { type: 'string', enum: ['member', 'prospect'], example: 'member' },
              color: { type: 'string', example: 'green' },
              description: { type: 'string', example: 'Membre actif' },
              isSystem: { type: 'boolean', example: true },
              displayOrder: { type: 'number', example: 1 },
              isActive: { type: 'boolean', example: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async listStatuses(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters: { category?: string; isActive?: boolean } = {};

    if (category) {
      filters.category = category;
    }

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    return this.memberStatusesService.listStatuses(filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtenir un statut par ID',
    description: 'Récupère les détails d\'un statut spécifique',
  })
  @ApiParam({
    name: 'id',
    description: 'ID du statut',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Détails du statut',
  })
  @ApiResponse({
    status: 404,
    description: 'Statut non trouvé',
  })
  async getStatus(@Param('id') id: string) {
    return this.memberStatusesService.getStatusById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Créer un nouveau statut personnalisé',
    description: 'Ajoute un statut personnalisé (non-système) à la liste',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code', 'label', 'category', 'color'],
      properties: {
        code: {
          type: 'string',
          example: 'vip',
          description: 'Code technique unique (lettres minuscules, chiffres, underscores)',
        },
        label: {
          type: 'string',
          example: 'VIP',
          description: 'Libellé affiché dans l\'interface',
        },
        category: {
          type: 'string',
          enum: ['member', 'prospect'],
          example: 'member',
          description: 'Catégorie: membre ou prospect',
        },
        color: {
          type: 'string',
          example: 'pink',
          description: 'Couleur du badge (green, red, blue, yellow, purple, cyan, pink, indigo, gray, orange)',
        },
        description: {
          type: 'string',
          example: 'Membre VIP prioritaire',
          description: 'Description du statut',
        },
        displayOrder: {
          type: 'number',
          example: 4,
          description: 'Ordre d\'affichage (optionnel, généré automatiquement si absent)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Statut créé avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: 409,
    description: 'Un statut avec ce code existe déjà',
  })
  async createStatus(@Body() body: any) {
    return this.memberStatusesService.createStatus(body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un statut',
    description: 'Modifie un statut existant. Les statuts système ne peuvent changer que label et color.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID du statut à modifier',
    type: 'string',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          example: 'Actif Premium',
          description: 'Nouveau libellé',
        },
        color: {
          type: 'string',
          example: 'blue',
          description: 'Nouvelle couleur',
        },
        description: {
          type: 'string',
          example: 'Membre avec accès premium',
          description: 'Nouvelle description',
        },
        displayOrder: {
          type: 'number',
          example: 2,
          description: 'Nouvel ordre d\'affichage (interdit pour statuts système)',
        },
        isActive: {
          type: 'boolean',
          example: false,
          description: 'Activer/désactiver le statut (interdit pour statuts système)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Statut mis à jour',
  })
  @ApiResponse({
    status: 400,
    description: 'Modification interdite (statut système)',
  })
  @ApiResponse({
    status: 404,
    description: 'Statut non trouvé',
  })
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.memberStatusesService.updateStatus(id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un statut',
    description: 'Supprime un statut personnalisé. Interdit pour les statuts système ou utilisés par des membres.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID du statut à supprimer',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut supprimé avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Suppression interdite (statut système ou utilisé)',
  })
  @ApiResponse({
    status: 404,
    description: 'Statut non trouvé',
  })
  async deleteStatus(@Param('id') id: string) {
    return this.memberStatusesService.deleteStatus(id);
  }

  @Patch('reorder/batch')
  @ApiOperation({
    summary: 'Réordonner les statuts',
    description: 'Met à jour l\'ordre d\'affichage de plusieurs statuts en une seule opération',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['statuses'],
      properties: {
        statuses: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'displayOrder'],
            properties: {
              id: { type: 'string', example: 'uuid' },
              displayOrder: { type: 'number', example: 1 },
            },
          },
          example: [
            { id: 'uuid-1', displayOrder: 1 },
            { id: 'uuid-2', displayOrder: 2 },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Ordre des statuts mis à jour',
  })
  async reorderStatuses(@Body('statuses') statuses: { id: string; displayOrder: number }[]) {
    return this.memberStatusesService.reorderStatuses(statuses);
  }
}
