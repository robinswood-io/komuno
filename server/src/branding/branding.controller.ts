import { Controller, Get, Put, Delete, Body, UseGuards, Post, UseInterceptors, UploadedFile, BadRequestException, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { BrandingService } from './branding.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';
import type { Admin } from '@shared/schema';

const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

@ApiTags('branding')
@Controller('api/admin/branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Obtenir la configuration branding (publique)' })
  @ApiResponse({ status: 200, description: 'Configuration branding actuelle' })
  async getBranding() {
    const data = await this.brandingService.getBrandingConfig();
    return { success: true, data };
  }

  @Get('logo/:filename')
  @SkipThrottle()
  @ApiOperation({ summary: 'Servir un logo uploadé depuis MinIO (public)' })
  @ApiResponse({ status: 200, description: 'Flux image du logo' })
  @ApiResponse({ status: 404, description: 'Logo introuvable' })
  async getLogoByFilename(@Param('filename') filename: string, @Res() res: Response) {
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new BadRequestException('Nom de fichier invalide');
    }

    try {
      const stream = await this.brandingService.getLogoStream(filename);
      res.setHeader('Content-Type', this.getContentTypeFromFilename(filename));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      stream.pipe(res);
    } catch {
      throw new NotFoundException('Logo introuvable');
    }
  }

  @Put()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('admin.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour la configuration branding (nécessite permission admin.manage)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        config: { type: 'string', description: 'Configuration JSON stringifiée', example: '{"colors": {"primary": "#3B82F6"}}' }
      },
      required: ['config']
    }
  })
  @ApiResponse({ status: 200, description: 'Configuration mise à jour avec succès' })
  @ApiResponse({ status: 400, description: 'Configuration invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async updateBranding(@Body() body: { config: string }, @User() user: Admin) {
    const data = await this.brandingService.updateBrandingConfig(body.config, user.email);
    return { success: true, data };
  }

  @Delete()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('admin.manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Réinitialiser la configuration branding (valeurs par défaut)' })
  @ApiResponse({ status: 200, description: 'Configuration réinitialisée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async resetBranding() {
    const data = await this.brandingService.resetBrandingConfig();
    return { success: true, data };
  }

  @Post('logo')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('admin.manage')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('logo', {
    limits: {
      fileSize: MAX_LOGO_SIZE_BYTES,
      files: 1,
      fields: 0,
      parts: 1,
      fieldNameSize: 32,
      fieldSize: 0,
    },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
        callback(new BadRequestException('Type de fichier non autorisé. Formats acceptés: PNG, JPG, WebP'), false);
        return;
      }
      callback(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader le logo de l\'application (nécessite permission admin.manage)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Fichier image du logo (PNG, JPG, WebP)'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Logo uploadé avec succès', schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          filename: { type: 'string', example: 'logo-1234567890.png' },
          url: { type: 'string', example: '/api/admin/branding/logo/logo-1234567890.png' }
        }
      }
    }
  }})
  @ApiResponse({ status: 400, description: 'Fichier invalide ou manquant' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async uploadLogo(@UploadedFile() file: Express.Multer.File, @User() user: Admin) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Valider le type de fichier (MIME client, puis signature côté service)
    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé. Formats acceptés: PNG, JPG, WebP');
    }

    // Valider la taille (max 5MB)
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      throw new BadRequestException('Fichier trop volumineux. Taille maximale: 5MB');
    }

    const data = await this.brandingService.uploadLogo(file, user.email);
    return { success: true, data };
  }

  private getContentTypeFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      default:
        return 'application/octet-stream';
    }
  }
}
