import { Body, Controller, Get, Header, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TrainingsService } from './trainings.service';

type RequestWithUser = {
  user?: {
    email?: string;
    role?: string;
  };
};

function actorFromRequest(req: RequestWithUser) {
  return req.user?.email || req.user?.role || 'admin';
}

@Controller('api/trainings')
export class PublicTrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Get('public')
  async listPublic() {
    return { success: true, data: await this.trainingsService.listPublicPrograms() };
  }

  @Post('interests')
  async submitInterest(@Body() body: unknown) {
    return { success: true, data: await this.trainingsService.submitInterest(body) };
  }
}

@Controller('api/federation/trainings')
export class FederatedTrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Post('catalog/ingest')
  async ingestCatalog(@Body() body: unknown, @Req() req: any) {
    const tokenHeader = req.headers?.['x-komuno-federation-token'];
    const authorization = req.headers?.authorization;
    const bearerToken = typeof authorization === 'string' ? authorization.match(/^Bearer\s+(.+)$/i)?.[1] : undefined;
    const token = typeof tokenHeader === 'string' ? tokenHeader : bearerToken;
    return await this.trainingsService.ingestFederatedCatalog(body, token);
  }

  @Post('interests/ingest')
  async ingestInterest(@Body() body: unknown, @Req() req: any) {
    const tokenHeader = req.headers?.['x-komuno-federation-token'];
    const authorization = req.headers?.authorization;
    const bearerToken = typeof authorization === 'string' ? authorization.match(/^Bearer\s+(.+)$/i)?.[1] : undefined;
    const token = typeof tokenHeader === 'string' ? tokenHeader : bearerToken;
    return await this.trainingsService.ingestFederatedInterest(body, token);
  }
}

@Controller('api/admin/trainings')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Get()
  @Permissions('trainings.view')
  async list(@Query('status') status?: string, @Query('search') search?: string, @Query('includeArchived') includeArchived?: string) {
    return { success: true, data: await this.trainingsService.listPrograms({ status, search, includeArchived: includeArchived === 'true' }) };
  }

  @Post()
  @Permissions('trainings.write')
  async create(@Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.trainingsService.createProgram(body, actorFromRequest(req)) };
  }

  @Get('interests')
  @Permissions('trainings.view')
  async interests(
    @Query('trainingId') trainingId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('status') status?: string,
    @Query('sourceOrganizationId') sourceOrganizationId?: string,
    @Query('limit') limit?: string,
  ) {
    return { success: true, data: await this.trainingsService.listInterests({ trainingId, sessionId, status, sourceOrganizationId, limit: limit ? Number(limit) : undefined }) };
  }

  @Get('interests/export.csv')
  @Permissions('trainings.export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportInterests(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Query('trainingId') trainingId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('status') status?: string,
    @Query('sourceOrganizationId') sourceOrganizationId?: string,
  ) {
    const csv = await this.trainingsService.exportInterestsCsv({ trainingId, sessionId, status, sourceOrganizationId }, actorFromRequest(req));
    res.setHeader('Content-Disposition', `attachment; filename="training-interests-${new Date().toISOString().slice(0, 10)}.csv"`);
    return csv;
  }

  @Post('interests/:id/sync-upward')
  @Permissions('trainings.manage')
  async syncInterestUpward(@Param('id') id: string, @Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.trainingsService.syncInterestUpward(id, body, actorFromRequest(req)) };
  }

  @Patch('interests/:id/status')
  @Permissions('trainings.write')
  async updateInterestStatus(@Param('id') id: string, @Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.trainingsService.updateInterestStatus(id, body, actorFromRequest(req)) };
  }

  @Get('sync-runs')
  @Permissions('trainings.view')
  async syncRuns(@Query('limit') limit?: string) {
    return { success: true, data: await this.trainingsService.listSyncRuns(limit ? Number(limit) : undefined) };
  }

  @Post('sync-runs')
  @Permissions('trainings.manage')
  async recordSyncRun(@Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.trainingsService.recordLocalSyncRun(body, actorFromRequest(req)) };
  }

  @Patch('sessions/:sessionId')
  @Permissions('trainings.write')
  async updateSession(@Param('sessionId') sessionId: string, @Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.trainingsService.updateSession(sessionId, body, actorFromRequest(req)) };
  }

  @Get(':id')
  @Permissions('trainings.view')
  async get(@Param('id') id: string) {
    return { success: true, data: await this.trainingsService.getProgram(id) };
  }

  @Put(':id')
  @Permissions('trainings.write')
  async update(@Param('id') id: string, @Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.trainingsService.updateProgram(id, body, actorFromRequest(req)) };
  }

  @Post(':id/publish')
  @Permissions('trainings.manage')
  async publish(@Param('id') id: string, @Req() req: RequestWithUser) {
    return { success: true, data: await this.trainingsService.publishProgram(id, actorFromRequest(req)) };
  }

  @Post(':id/archive')
  @Permissions('trainings.manage')
  async archive(@Param('id') id: string, @Req() req: RequestWithUser) {
    return { success: true, data: await this.trainingsService.archiveProgram(id, actorFromRequest(req)) };
  }

  @Post(':id/sync-downward')
  @Permissions('trainings.manage')
  async syncCatalogDownward(@Param('id') id: string, @Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.trainingsService.syncCatalogDownward(id, body, actorFromRequest(req)) };
  }

  @Post(':id/sessions')
  @Permissions('trainings.write')
  async createSession(@Param('id') id: string, @Body() body: unknown, @Req() req: RequestWithUser) {
    return { success: true, data: await this.trainingsService.createSession(id, body, actorFromRequest(req)) };
  }
}
