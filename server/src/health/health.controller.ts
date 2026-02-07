import { Controller, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@SkipThrottle() // Exclure les healthchecks du rate limiting
@ApiTags('health')
@Controller('api/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /api/health - Health check global
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check global' })
  @ApiResponse({ status: 200, description: 'Application en bonne santé' })
  async getHealth() {
    if (!this.healthService) {
      // Fallback minimal pour éviter les erreurs si l'injection échoue
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
      };
    }
    return this.healthService.getHealthCheck();
  }

  /**
   * GET /api/health/db - Database health check
   */
  @Get('db')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check de la base de données' })
  @ApiResponse({ status: 200, description: 'Statut de la connexion à la base de données' })
  async getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }

  /**
   * GET /api/health/detailed - Health check détaillé (ADMIN only)
   */
  @Get('detailed')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Health check détaillé (nécessite authentification)' })
  @ApiResponse({ status: 200, description: 'Informations de santé détaillées' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getDetailedHealth() {
    return this.healthService.getDetailedHealth();
  }

  /**
   * GET /api/health/ready - Readiness probe
   */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe Kubernetes' })
  @ApiResponse({ status: 200, description: 'Application prête à recevoir du trafic' })
  async getReadiness() {
    return this.healthService.getReadiness();
  }

  /**
   * GET /api/health/live - Liveness probe
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe Kubernetes' })
  @ApiResponse({ status: 200, description: 'Application en vie' })
  getLiveness() {
    return this.healthService.getLiveness();
  }
}

@SkipThrottle() // Exclure status/version du rate limiting
@ApiTags('health')
@Controller('api')
export class StatusController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /api/version - Version de l'application
   */
  @Get('version')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtenir la version de l\'application' })
  @ApiResponse({ status: 200, description: 'Version et informations de build' })
  getVersion() {
    return this.healthService.getVersion();
  }

  /**
   * GET /api/status/all - Centralisation de tous les checks
   */
  @Get('status/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtenir le statut complet de tous les services' })
  @ApiResponse({ status: 200, description: 'Statut de tous les composants' })
  async getAllStatus() {
    return this.healthService.getAllStatus();
  }
}
