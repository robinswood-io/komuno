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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ToolsService } from './tools.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  insertToolCategorySchema,
  updateToolCategorySchema,
  insertToolSchema,
  updateToolSchema,
  InsertToolCategory,
  UpdateToolCategory,
  InsertTool,
  UpdateTool,
} from '../../../shared/schema';

// =====================
// PUBLIC CONTROLLER
// =====================
@ApiTags('Tools (Public)')
@Controller('api/tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Liste des catégories actives' })
  @ApiResponse({ status: 200, description: 'Liste des catégories' })
  async getCategories() {
    return this.toolsService.getAllCategories(false);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Outils mis en avant' })
  @ApiResponse({ status: 200, description: 'Liste des outils featured' })
  async getFeaturedTools() {
    return this.toolsService.getFeaturedTools();
  }

  @Get()
  @ApiOperation({ summary: 'Liste des outils actifs' })
  @ApiResponse({ status: 200, description: 'Liste des outils' })
  async getTools() {
    return this.toolsService.getAllTools(false);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Outils par catégorie' })
  @ApiResponse({ status: 200, description: 'Liste des outils de la catégorie' })
  async getToolsByCategory(@Param('categoryId') categoryId: string) {
    return this.toolsService.getToolsByCategory(categoryId, false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un outil' })
  @ApiResponse({ status: 200, description: 'Détail de l\'outil' })
  @ApiResponse({ status: 404, description: 'Outil non trouvé' })
  async getToolById(@Param('id') id: string) {
    const tool = await this.toolsService.getToolById(id);
    if (!tool) {
      return { error: 'Outil non trouvé' };
    }
    return tool;
  }
}

// =====================
// ADMIN CONTROLLER
// =====================
@ApiTags('Tools (Admin)')
@Controller('api/admin/tools')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  // =====================
  // CATEGORIES
  // =====================

  @Get('categories')
  @ApiOperation({ summary: 'Liste de toutes les catégories (admin)' })
  @ApiResponse({ status: 200, description: 'Liste des catégories incluant inactives' })
  async getCategories(@Query('includeInactive') includeInactive?: string) {
    return this.toolsService.getAllCategories(includeInactive === 'true');
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Détail d\'une catégorie' })
  @ApiResponse({ status: 200, description: 'Détail de la catégorie' })
  async getCategoryById(@Param('id') id: string) {
    const category = await this.toolsService.getCategoryById(id);
    if (!category) {
      return { error: 'Catégorie non trouvée' };
    }
    return category;
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une catégorie' })
  @ApiResponse({ status: 201, description: 'Catégorie créée' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async createCategory(@Body() body: unknown) {
    const parsed = insertToolCategorySchema.safeParse(body);
    if (!parsed.success) {
      return { error: 'Données invalides', details: parsed.error.errors };
    }
    return this.toolsService.createCategory(parsed.data);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Modifier une catégorie' })
  @ApiResponse({ status: 200, description: 'Catégorie modifiée' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  async updateCategory(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateToolCategorySchema.safeParse(body);
    if (!parsed.success) {
      return { error: 'Données invalides', details: parsed.error.errors };
    }
    return this.toolsService.updateCategory(id, parsed.data);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une catégorie' })
  @ApiResponse({ status: 204, description: 'Catégorie supprimée' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  async deleteCategory(@Param('id') id: string) {
    await this.toolsService.deleteCategory(id);
  }

  // =====================
  // TOOLS
  // =====================

  @Get()
  @ApiOperation({ summary: 'Liste de tous les outils (admin)' })
  @ApiResponse({ status: 200, description: 'Liste des outils incluant inactifs' })
  async getTools(@Query('includeInactive') includeInactive?: string) {
    return this.toolsService.getAllTools(includeInactive === 'true');
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des outils' })
  @ApiResponse({ status: 200, description: 'Stats des outils' })
  async getStats() {
    return this.toolsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un outil (admin)' })
  @ApiResponse({ status: 200, description: 'Détail de l\'outil' })
  async getToolById(@Param('id') id: string) {
    const tool = await this.toolsService.getToolById(id);
    if (!tool) {
      return { error: 'Outil non trouvé' };
    }
    return tool;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un outil' })
  @ApiResponse({ status: 201, description: 'Outil créé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async createTool(@Body() body: unknown) {
    const parsed = insertToolSchema.safeParse(body);
    if (!parsed.success) {
      return { error: 'Données invalides', details: parsed.error.errors };
    }
    return this.toolsService.createTool(parsed.data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un outil' })
  @ApiResponse({ status: 200, description: 'Outil modifié' })
  @ApiResponse({ status: 404, description: 'Outil non trouvé' })
  async updateTool(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateToolSchema.safeParse(body);
    if (!parsed.success) {
      return { error: 'Données invalides', details: parsed.error.errors };
    }
    return this.toolsService.updateTool(id, parsed.data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un outil' })
  @ApiResponse({ status: 204, description: 'Outil supprimé' })
  @ApiResponse({ status: 404, description: 'Outil non trouvé' })
  async deleteTool(@Param('id') id: string) {
    await this.toolsService.deleteTool(id);
  }
}
