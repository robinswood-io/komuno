import {
  Controller, Get, Post, Delete, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';
import { NetworkService } from './network.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('network')
@Controller('api/network')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get()
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Obtenir les connexions réseau d\'une entité' })
  @ApiResponse({ status: 200, description: 'Liste des connexions' })
  async getConnections(@Query('email') email: string) {
    return this.networkService.getConnections(email);
  }

  @Post()
  @Permissions('admin.edit')
  @ApiOperation({ summary: 'Créer une connexion réseau' })
  @ApiResponse({ status: 201, description: 'Connexion créée' })
  async createConnection(
    @Body() body: unknown,
    @User() user: { email?: string },
  ) {
    return this.networkService.createConnection(body, user.email);
  }

  @Delete(':id')
  @Permissions('admin.edit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une connexion réseau' })
  @ApiResponse({ status: 204, description: 'Connexion supprimée' })
  async deleteConnection(@Param('id') id: string) {
    return this.networkService.deleteConnection(id);
  }
}
