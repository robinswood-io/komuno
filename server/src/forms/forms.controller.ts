import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
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
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Lister les formulaires / sondages' })
  @ApiQuery({ name: 'status', required: false })
  async listForms(@Query('status') status?: string) {
    return await this.formsService.listForms({ status });
  }

  @Post()
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Créer un formulaire / sondage' })
  async createForm(@Body() body: unknown, @User() user: { email?: string }) {
    return await this.formsService.createForm(body, user.email);
  }

  @Get(':id')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Détail d’un formulaire / sondage' })
  @ApiParam({ name: 'id' })
  async getForm(@Param('id') id: string) {
    return await this.formsService.getForm(id);
  }

  @Put(':id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Modifier un formulaire / sondage' })
  @ApiParam({ name: 'id' })
  async updateForm(@Param('id') id: string, @Body() body: unknown) {
    return await this.formsService.updateForm(id, body);
  }

  @Delete(':id')
  @Permissions('admin.manage')
  @ApiOperation({ summary: 'Supprimer un formulaire / sondage et ses réponses' })
  @ApiParam({ name: 'id' })
  async deleteForm(@Param('id') id: string) {
    return await this.formsService.deleteForm(id);
  }

  @Get(':id/responses')
  @Permissions('admin.view')
  @ApiOperation({ summary: 'Lister les réponses structurées d’un formulaire' })
  @ApiParam({ name: 'id' })
  async getResponses(@Param('id') id: string) {
    return await this.formsService.getResponses(id);
  }

  @Get(':id/stats')
  @Permissions('admin.view')
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
