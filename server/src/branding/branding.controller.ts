import { Controller, Get, Put, Delete, Body, UseGuards, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { BrandingService } from './branding.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';
import type { Admin } from '@shared/schema';

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

  @Put()
  @SkipThrottle()
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
  @SkipThrottle()
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
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('admin.manage')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader le logo de l\'application (nécessite permission admin.manage)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Fichier image du logo (PNG, JPG, SVG)'
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
          url: { type: 'string', example: 'http://localhost:9000/assets/logo-1234567890.png' }
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

    // Valider le type de fichier
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé. Formats acceptés: PNG, JPG, SVG, WebP');
    }

    // Valider la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Fichier trop volumineux. Taille maximale: 5MB');
    }

    const data = await this.brandingService.uploadLogo(file, user.email);
    return { success: true, data };
  }
}
