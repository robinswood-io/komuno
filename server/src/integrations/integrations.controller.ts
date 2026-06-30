import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('api/admin/integrations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('providers')
  @Permissions('integrations.view')
  @ApiOperation({ summary: 'Lister les fournisseurs d’intégration disponibles' })
  getProviderCatalog() {
    return this.integrationsService.getProviderCatalog();
  }

  @Get('accounts')
  @Permissions('integrations.view')
  @ApiOperation({ summary: 'Lister les comptes d’intégration configurés' })
  @ApiQuery({ name: 'provider', required: false })
  async listAccounts(@Query('provider') provider?: string) {
    return await this.integrationsService.listAccounts({ provider });
  }

  @Post('accounts')
  @Permissions('integrations.write')
  @ApiOperation({ summary: 'Créer un compte d’intégration' })
  async createAccount(@Body() body: unknown, @User() user: { email?: string }) {
    return await this.integrationsService.createAccount(body, user.email);
  }

  @Put('accounts/:id')
  @Permissions('integrations.write')
  @ApiOperation({ summary: 'Modifier un compte d’intégration' })
  @ApiParam({ name: 'id' })
  async updateAccount(@Param('id') id: string, @Body() body: unknown, @User() user: { email?: string }) {
    return await this.integrationsService.updateAccount(id, body, user.email);
  }

  @Delete('accounts/:id')
  @Permissions('integrations.manage')
  @ApiOperation({ summary: 'Supprimer un compte d’intégration' })
  @ApiParam({ name: 'id' })
  async deleteAccount(@Param('id') id: string, @User() user: { email?: string }) {
    return await this.integrationsService.deleteAccount(id, user.email);
  }

  @Post('accounts/:id/test')
  @Permissions('integrations.write')
  @ApiOperation({ summary: 'Tester une configuration d’intégration sans exposer les secrets' })
  @ApiParam({ name: 'id' })
  async testAccount(@Param('id') id: string, @User() user: { email?: string }) {
    return await this.integrationsService.testAccount(id, user.email);
  }

  @Get('sync-runs')
  @Permissions('integrations.view')
  @ApiOperation({ summary: 'Lister les derniers runs de synchronisation intégrations' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'provider', required: false })
  async listSyncRuns(@Query('accountId') accountId?: string, @Query('provider') provider?: string) {
    return await this.integrationsService.listSyncRuns({ accountId, provider });
  }
}

@ApiTags('integration-webhooks')
@Controller('api/integrations')
export class IntegrationWebhooksController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post(':provider/webhooks')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Recevoir un webhook fournisseur de manière idempotente' })
  @ApiParam({ name: 'provider' })
  async receiveWebhook(
    @Param('provider') provider: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, unknown>,
  ) {
    return await this.integrationsService.recordWebhook(provider, body, headers);
  }
}
