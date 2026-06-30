import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('api/admin/audit')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Lister les journaux d’audit métier' })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'actorEmail', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'Date ISO min incluse' })
  @ApiQuery({ name: 'to', required: false, description: 'Date ISO max incluse' })
  @ApiQuery({ name: 'limit', required: false })
  async listAuditLogs(
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.auditService.list({
      action,
      entityType,
      entityId,
      actorEmail,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
