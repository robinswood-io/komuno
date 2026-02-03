import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Controller Loans - Routes prêts publiques
 */
@ApiTags('loans')
@Controller('api/loan-items')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  @ApiOperation({ summary: 'Obtenir la liste des objets disponibles en prêt' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre d\'éléments par page', example: 20 })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche par nom', example: 'vidéo' })
  @ApiResponse({ status: 200, description: 'Liste des objets de prêt avec pagination' })
  async getLoanItems(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return await this.loansService.getLoanItems(pageNum, limitNum, search);
  }

  @Post()
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Créer une demande de prêt (publique, rate-limited)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Projecteur vidéo' },
        description: { type: 'string', example: 'Pour conférence' },
        borrowerEmail: { type: 'string', format: 'email', example: 'user@example.com' }
      },
      required: ['name', 'borrowerEmail']
    }
  })
  @ApiResponse({ status: 201, description: 'Demande de prêt créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 429, description: 'Trop de requêtes (rate limit)' })
  async createLoanItem(@Body() body: unknown) {
    return await this.loansService.createLoanItem(body);
  }
}

/**
 * Controller Admin Loans - Routes admin pour la gestion des prêts
 */
@ApiTags('loans')
@ApiBearerAuth()
@Controller('api/admin/loan-items')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminLoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  @Permissions('admin.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir tous les objets de prêt (admin)' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre d\'éléments par page', example: 20 })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche par nom', example: 'projecteur' })
  @ApiResponse({ status: 200, description: 'Liste complète des objets de prêt' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async getAllLoanItems(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    return await this.loansService.getAllLoanItems(pageNum, limitNum, search);
  }

  @Get(':id')
  @Permissions('admin.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir un objet de prêt par ID' })
  @ApiParam({ name: 'id', description: 'ID de l\'objet', example: 'uuid-123' })
  @ApiResponse({ status: 200, description: 'Détails de l\'objet de prêt' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Objet non trouvé' })
  async getLoanItem(@Param('id') id: string) {
    return await this.loansService.getLoanItem(id);
  }

  @Put(':id')
  @Permissions('admin.edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un objet de prêt (nécessite permission admin.edit)' })
  @ApiParam({ name: 'id', description: 'ID de l\'objet', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        quantity: { type: 'number' },
        location: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Objet mis à jour avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Objet non trouvé' })
  async updateLoanItem(@Param('id') id: string, @Body() body: unknown) {
    return await this.loansService.updateLoanItem(id, body);
  }

  @Patch(':id/status')
  @Permissions('admin.edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour le statut d\'un objet de prêt' })
  @ApiParam({ name: 'id', description: 'ID de l\'objet', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['available', 'borrowed', 'maintenance', 'unavailable'], example: 'borrowed' }
      },
      required: ['status']
    }
  })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Objet non trouvé' })
  async updateLoanItemStatus(
    @Param('id') id: string,
    @Body() body: { status: unknown },
    @User() user: { email?: string },
  ) {
    await this.loansService.updateLoanItemStatus(id, body.status, user.email);
    return { success: true };
  }

  @Delete(':id')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un objet de prêt' })
  @ApiParam({ name: 'id', description: 'ID de l\'objet', example: 'uuid-123' })
  @ApiResponse({ status: 204, description: 'Objet supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 404, description: 'Objet non trouvé' })
  async deleteLoanItem(@Param('id') id: string) {
    await this.loansService.deleteLoanItem(id);
  }

  @Post(':id/photo')
  @Permissions('admin.edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Uploader une photo pour un objet de prêt' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID de l\'objet', example: 'uuid-123' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: { type: 'string', format: 'binary', description: 'Fichier image (JPG, PNG, WebP, max 5MB)' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Photo uploadée avec succès' })
  @ApiResponse({ status: 400, description: 'Fichier invalide ou manquant' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        const ext = file.originalname.split('.').pop()?.toLowerCase();

        if (!allowedMimes.includes(file.mimetype)) {
          return cb(new BadRequestException('Format de fichier non autorisé. Formats acceptés: JPG, PNG, WebP'), false);
        }

        if (!ext || !allowedExtensions.includes(ext)) {
          return cb(new BadRequestException('Extension de fichier non autorisée. Extensions acceptées: .jpg, .jpeg, .png, .webp'), false);
        }

        cb(null, true);
      },
    }),
  )
  async uploadLoanItemPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    return await this.loansService.uploadLoanItemPhoto(id, file);
  }
}
