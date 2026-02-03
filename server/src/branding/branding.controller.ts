import { Controller, Get, Put, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
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
}
