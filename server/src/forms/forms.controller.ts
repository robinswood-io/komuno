import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { FormsService } from './forms.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('forms')
@ApiBearerAuth()
@Controller('api/admin/forms')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  @Permissions('forms.view')
  @ApiOperation({ summary: 'Lister les formulaires / sondages' })
  @ApiQuery({ name: 'status', required: false })
  async listForms(@Query('status') status?: string) {
    return await this.formsService.listForms({ status });
  }

  @Post()
  @Permissions('forms.write')
  @ApiOperation({ summary: 'Créer un formulaire / sondage' })
  async createForm(@Body() body: unknown, @User() user: { email?: string }) {
    return await this.formsService.createForm(body, user.email);
  }

  @Post('maintenance/run')
  @Permissions('forms.manage')
  @ApiOperation({ summary: 'Lancer la maintenance formulaires (expiration / rétention)' })
  async runMaintenance() {
    return await this.formsService.runMaintenance();
  }

  @Get(':id')
  @Permissions('forms.view')
  @ApiOperation({ summary: 'Détail d’un formulaire / sondage' })
  @ApiParam({ name: 'id' })
  async getForm(@Param('id') id: string) {
    return await this.formsService.getForm(id);
  }

  @Put(':id')
  @Permissions('forms.write')
  @ApiOperation({ summary: 'Modifier un formulaire / sondage' })
  @ApiParam({ name: 'id' })
  async updateForm(@Param('id') id: string, @Body() body: unknown) {
    return await this.formsService.updateForm(id, body);
  }

  @Post(':id/duplicate')
  @Permissions('forms.write')
  @ApiOperation({ summary: 'Dupliquer un formulaire en brouillon' })
  @ApiParam({ name: 'id' })
  async duplicateForm(@Param('id') id: string, @User() user: { email?: string }) {
    return await this.formsService.duplicateForm(id, user.email);
  }

  @Delete(':id')
  @Permissions('forms.delete')
  @ApiOperation({ summary: 'Supprimer un formulaire / sondage et ses réponses' })
  @ApiParam({ name: 'id' })
  async deleteForm(@Param('id') id: string) {
    return await this.formsService.deleteForm(id);
  }

  @Get(':id/responses.csv')
  @Permissions('forms.export')
  @ApiOperation({ summary: 'Exporter les réponses d’un formulaire en CSV' })
  @ApiParam({ name: 'id' })
  async exportResponsesCsv(@Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    const result = await this.formsService.getResponsesCsv(id);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
    return result.data.content;
  }

  @Get(':id/responses')
  @Permissions('forms.view')
  @ApiOperation({ summary: 'Lister les réponses structurées d’un formulaire' })
  @ApiParam({ name: 'id' })
  async getResponses(@Param('id') id: string) {
    return await this.formsService.getResponses(id);
  }

  @Delete(':id/responses/:responseId')
  @Permissions('forms.delete')
  @ApiOperation({ summary: 'Supprimer une réponse de formulaire' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'responseId' })
  async deleteResponse(@Param('id') id: string, @Param('responseId') responseId: string) {
    return await this.formsService.deleteResponse(id, responseId);
  }

  @Get(':id/stats')
  @Permissions('forms.view')
  @ApiOperation({ summary: 'Statistiques et agrégations graphiques d’un formulaire' })
  @ApiParam({ name: 'id' })
  async getStats(@Param('id') id: string) {
    return await this.formsService.getStats(id);
  }
}

@ApiTags('public-forms')
@Controller('api/forms')
export class PublicFormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get(':slug')
  @SkipThrottle()
  @ApiOperation({ summary: 'Lire un formulaire publié par slug' })
  @ApiParam({ name: 'slug' })
  async getPublicForm(@Param('slug') slug: string) {
    return await this.formsService.getPublicForm(slug);
  }

  @Post(':slug/responses')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Soumettre une réponse à un formulaire publié' })
  @ApiParam({ name: 'slug' })
  async submitResponse(@Param('slug') slug: string, @Body() body: unknown) {
    return await this.formsService.submitResponse(slug, body);
  }
}
