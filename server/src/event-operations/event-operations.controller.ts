import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { EventOperationsService } from './event-operations.service';

type RequestWithUser = { user?: { email?: string; role?: string } };
type EntityKind = 'workstreams' | 'suppliers' | 'quotes' | 'commitments' | 'objectives' | 'budget-lines';

function actorFromRequest(req: RequestWithUser) {
  return req.user?.email || req.user?.role || 'admin';
}

@Controller('api/admin/events/:eventId/operations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class EventOperationsController {
  constructor(private readonly eventOperationsService: EventOperationsService) {}

  @Get()
  @Permissions('event_ops.view')
  async getOperations(@Param('eventId') eventId: string) {
    return { success: true, data: await this.eventOperationsService.getOperations(eventId) };
  }

  @Get('summary')
  @Permissions('event_ops.view')
  async getSummary(@Param('eventId') eventId: string) {
    return { success: true, data: await this.eventOperationsService.getSummary(eventId) };
  }

  @Get('export.csv')
  @Permissions('event_ops.export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(@Param('eventId') eventId: string, @Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const csv = await this.eventOperationsService.exportCsv(eventId, actorFromRequest(req));
    res.setHeader('Content-Disposition', `attachment; filename="event-operations-${eventId}-${new Date().toISOString().slice(0, 10)}.csv"`);
    return csv;
  }

  @Put('plan')
  @Permissions('event_ops.write')
  async upsertPlan(@Param('eventId') eventId: string, @Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.eventOperationsService.upsertPlan(eventId, body, actorFromRequest(req)) };
  }

  @Post(':kind')
  @Permissions('event_ops.write')
  async createEntity(@Param('eventId') eventId: string, @Param('kind') kind: EntityKind, @Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.eventOperationsService.createEntity(eventId, kind, body, actorFromRequest(req)) };
  }

  @Patch(':kind/:id')
  @Permissions('event_ops.write')
  async updateEntity(@Param('eventId') eventId: string, @Param('kind') kind: EntityKind, @Param('id') id: string, @Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.eventOperationsService.updateEntity(eventId, kind, id, body, actorFromRequest(req)) };
  }

  @Delete(':kind/:id')
  @Permissions('event_ops.manage')
  async deleteEntity(@Param('eventId') eventId: string, @Param('kind') kind: EntityKind, @Param('id') id: string, @Req() req: RequestWithUser) {
    return { success: true, data: await this.eventOperationsService.deleteEntity(eventId, kind, id, actorFromRequest(req)) };
  }
}
