import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AutomationsService } from './automations.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('automations')
@ApiBearerAuth()
@Controller('api/admin/automations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  @Permissions('automations.view')
  @ApiOperation({ summary: 'Lister les workflows automations' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'triggerType', required: false })
  async listWorkflows(@Query('status') status?: string, @Query('triggerType') triggerType?: string) {
    return await this.automationsService.listWorkflows({ status, triggerType });
  }

  @Post()
  @Permissions('automations.write')
  @ApiOperation({ summary: 'Créer un workflow automation brouillon' })
  async createWorkflow(@Body() body: unknown, @User() user: { email?: string }) {
    return await this.automationsService.createWorkflow(body, user.email);
  }

  @Get('runs')
  @Permissions('automations.view')
  @ApiOperation({ summary: 'Lister les derniers runs automations' })
  @ApiQuery({ name: 'workflowId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listRuns(@Query('workflowId') workflowId?: string, @Query('status') status?: string, @Query('limit') limit?: string) {
    return await this.automationsService.listRuns({ workflowId, status, limit: limit ? Number(limit) : undefined });
  }

  @Post('run-due')
  @Permissions('automations.write')
  @ApiOperation({ summary: 'Exécuter les runs automations arrivés à échéance' })
  async runDue(@Query('limit') limit?: string) {
    return await this.automationsService.runDue(limit ? Number(limit) : undefined);
  }

  @Get('runs/:id')
  @Permissions('automations.view')
  @ApiOperation({ summary: 'Lire un run automation et ses steps' })
  @ApiParam({ name: 'id' })
  async getRun(@Param('id') id: string) {
    return await this.automationsService.getRun(id);
  }

  @Get(':id')
  @Permissions('automations.view')
  @ApiOperation({ summary: 'Lire un workflow automation' })
  @ApiParam({ name: 'id' })
  async getWorkflow(@Param('id') id: string) {
    return await this.automationsService.getWorkflow(id);
  }

  @Put(':id')
  @Permissions('automations.write')
  @ApiOperation({ summary: 'Modifier le brouillon d’un workflow automation' })
  @ApiParam({ name: 'id' })
  async updateWorkflow(@Param('id') id: string, @Body() body: unknown, @User() user: { email?: string }) {
    return await this.automationsService.updateWorkflow(id, body, user.email);
  }

  @Post(':id/publish')
  @Permissions('automations.write')
  @ApiOperation({ summary: 'Publier une version immuable du workflow automation' })
  @ApiParam({ name: 'id' })
  async publishWorkflow(@Param('id') id: string, @Body() body: unknown, @User() user: { email?: string }) {
    return await this.automationsService.publishWorkflow(id, body, user.email);
  }

  @Post(':id/status')
  @Permissions('automations.manage')
  @ApiOperation({ summary: 'Activer, mettre en pause ou archiver un workflow automation' })
  @ApiParam({ name: 'id' })
  async updateStatus(@Param('id') id: string, @Body() body: unknown, @User() user: { email?: string }) {
    return await this.automationsService.updateWorkflowStatus(id, body, user.email);
  }

  @Post(':id/test')
  @Permissions('automations.write')
  @ApiOperation({ summary: 'Tester un workflow automation publié avec un payload manuel' })
  @ApiParam({ name: 'id' })
  async testWorkflow(@Param('id') id: string, @Body() body: unknown, @User() user: { email?: string }) {
    return await this.automationsService.testWorkflow(id, body, user.email);
  }
}
