import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGeneratorService } from '../notifications/notifications-generator.service';
import { InsertNotification } from '../../../shared/schema';

interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  body: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
}

interface CreateBulkNotificationDto {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
}

@ApiTags('admin-notifications')
@ApiBearerAuth()
@Controller('api/admin/notifications')
@UseGuards(JwtAuthGuard)
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGenerator: NotificationsGeneratorService,
  ) {}

  /**
   * POST /api/admin/notifications
   * Créer une notification pour un utilisateur (admin only)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une notification pour un utilisateur' })
  @ApiResponse({ status: 201, description: 'Notification créée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé (admin requis)' })
  @ApiBody({
    description: 'Données de la notification',
    examples: {
      task_reminder: {
        summary: 'Rappel de tâche',
        value: {
          userId: 'user-123',
          type: 'task_reminder',
          title: 'Tâche à effectuer',
          body: 'Vous avez une tâche à compléter avant demain',
          icon: '⏰',
          metadata: { taskId: 'task-456', priority: 'high' },
          entityType: 'task',
          entityId: 'task-456',
        },
      },
      member_subscription: {
        summary: 'Échéance cotisation',
        value: {
          userId: 'user-123',
          type: 'member_update',
          title: 'Cotisation à renouveler',
          body: 'La cotisation de Jean Dupont expire dans 7 jours',
          icon: '💳',
          metadata: { memberEmail: 'jean@example.com', daysRemaining: 7 },
          entityType: 'member',
          entityId: 'jean@example.com',
        },
      },
    },
  })
  async createNotification(@Body() data: CreateNotificationDto) {
    const notificationData: InsertNotification = {
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      icon: data.icon,
      isRead: false,
      metadata: data.metadata || {},
      entityType: data.entityType,
      entityId: data.entityId,
    };

    const notification = await this.notificationsService.createNotification(notificationData);
    return { success: true, notification };
  }

  /**
   * POST /api/admin/notifications/bulk
   * Créer des notifications en masse pour plusieurs utilisateurs
   */
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer des notifications en masse pour plusieurs utilisateurs' })
  @ApiResponse({ status: 201, description: 'Notifications créées' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé (admin requis)' })
  @ApiBody({
    description: 'Données des notifications en masse',
    examples: {
      event_reminder: {
        summary: 'Rappel événement',
        value: {
          userIds: ['user-123', 'user-456', 'user-789'],
          type: 'event_update',
          title: 'Événement demain',
          body: 'N\'oubliez pas l\'événement de networking demain à 18h',
          icon: '📅',
          metadata: { eventId: 'event-123' },
          entityType: 'event',
          entityId: 'event-123',
        },
      },
    },
  })
  async createBulkNotifications(@Body() data: CreateBulkNotificationDto) {
    const notifications = await Promise.all(
      data.userIds.map(async (userId) => {
        const notificationData: InsertNotification = {
          userId,
          type: data.type,
          title: data.title,
          body: data.body,
          icon: data.icon,
          isRead: false,
          metadata: data.metadata || {},
          entityType: data.entityType,
          entityId: data.entityId,
        };

        return this.notificationsService.createNotification(notificationData);
      })
    );

    return {
      success: true,
      created: notifications.length,
      notifications,
    };
  }

  /**
   * POST /api/admin/notifications/generate-reminders
   * Générer automatiquement des notifications de rappel
   */
  @Post('generate-reminders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Générer des notifications de rappel automatiques' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Type de rappel (subscriptions, events, tasks, all)',
    example: 'all'
  })
  @ApiResponse({ status: 200, description: 'Rappels générés' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé (admin requis)' })
  async generateReminders(@Query('type') type: string = 'all') {
    let result: Record<string, number>;

    switch (type) {
      case 'subscriptions':
        const subscriptions = await this.notificationsGenerator.generateMemberSubscriptionReminders();
        result = { subscriptions, total: subscriptions };
        break;

      case 'events':
        const events = await this.notificationsGenerator.generateUpcomingEventReminders();
        result = { events, total: events };
        break;

      case 'tasks':
        const upcomingTasks = await this.notificationsGenerator.generateUpcomingTaskReminders();
        const overdueTasks = await this.notificationsGenerator.generateOverdueTaskReminders();
        result = { upcomingTasks, overdueTasks, total: upcomingTasks + overdueTasks };
        break;

      case 'all':
      default:
        result = await this.notificationsGenerator.generateAllNotifications();
        break;
    }

    return {
      success: true,
      type,
      ...result,
      message: `${result.total} notification(s) de rappel générée(s)`,
    };
  }

  /**
   * GET /api/admin/notifications/stats
   * Obtenir des statistiques sur les notifications
   */
  @Get('stats')
  @ApiOperation({ summary: 'Obtenir des statistiques sur les notifications' })
  @ApiResponse({ status: 200, description: 'Statistiques des notifications' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non autorisé (admin requis)' })
  async getNotificationStats() {
    const stats = await this.notificationsService.getStatistics();

    return {
      success: true,
      stats,
    };
  }
}
