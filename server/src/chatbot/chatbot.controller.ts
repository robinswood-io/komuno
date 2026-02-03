import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('chatbot')
@ApiBearerAuth()
@Controller('api/admin/chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('query')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('admin.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Interroger le chatbot IA (SQL naturel)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        question: { type: 'string', example: 'Combien d\'idées ont été approuvées ce mois ?' },
        context: { type: 'string', example: 'dashboard' }
      },
      required: ['question']
    }
  })
  @ApiResponse({ status: 200, description: 'Réponse du chatbot avec données SQL', schema: { type: 'object', properties: { success: { type: 'boolean' }, answer: { type: 'string' }, sql: { type: 'string' }, data: { type: 'array' } } } })
  @ApiResponse({ status: 400, description: 'Question manquante ou invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  async query(@Body() body: { question?: string; context?: string }) {
    const { question, context } = body;

    if (!question || typeof question !== 'string') {
      throw new BadRequestException('La question est requise');
    }

    const response = await this.chatbotService.query(question, context);

    if (response.error) {
      return {
        success: false,
        error: response.error,
        answer: response.answer
      };
    }

    return {
      success: true,
      answer: response.answer,
      sql: response.sql,
      data: response.data
    };
  }
}
