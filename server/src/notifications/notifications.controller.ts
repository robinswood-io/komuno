import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';
import {
  Notification,
  InsertNotification,
  UpdateNotification,
} from '../../../shared/schema';

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('api/notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /api/notifications
   * Get all notifications for authenticated user
   */
  @Get()
  @ApiOperation({ summary: 'Obtenir toutes les notifications de l\'utilisateur' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre de notifications à récupérer (max 100)', example: 20 })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset pour la pagination', example: 0 })
  @ApiResponse({ status: 200, description: 'Liste des notifications' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getNotifications(
    @Req() req: AuthRequest,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    const result = await this.notificationsService.searchNotifications(userId, {
      limit: Math.min(limit, 100),
      offset: Math.max(offset, 0),
    });

    return result;
  }

  /**
   * GET /api/notifications/grouped?by=project|offer
   * Get grouped notifications (by project, offer, or entity)
   */
  @Get('grouped')
  @ApiOperation({ summary: 'Obtenir les notifications groupées par projet, offre ou entité' })
  @ApiQuery({ name: 'by', required: false, description: 'Critère de regroupement (project, offer, entity)', example: 'project' })
  @ApiResponse({ status: 200, description: 'Notifications groupées' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getGroupedNotifications(
    @Req() req: AuthRequest,
    @Query('by') groupBy: 'project' | 'offer' | 'entity' = 'project'
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    const grouped = await this.notificationsService.getGroupedNotifications(
      userId,
      groupBy
    );

    // Transform to frontend-friendly format
    const result = Object.entries(grouped).map(([groupId, notifs]) => ({
      groupId,
      count: notifs.length,
      unreadCount: notifs.filter((n) => !n.isRead).length,
      notifications: notifs,
    }));

    return result;
  }

  /**
   * GET /api/notifications/unread
   * Get unread notification count
   */
  @Get('unread')
  async getUnreadCount(@Req() req: AuthRequest) {
    const userId = req.user?.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount };
  }

  /**
   * GET /api/notifications/project/:projectId
   * Get notifications for a specific project
   */
  @Get('project/:projectId')
  async getProjectNotifications(
    @Req() req: AuthRequest,
    @Param('projectId') projectId: string
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    const notifs =
      await this.notificationsService.getNotificationsByProject(
        userId,
        projectId
      );
    const unreadCount =
      await this.notificationsService.getUnreadCountByProject(
        userId,
        projectId
      );

    return {
      projectId,
      notifications: notifs,
      unreadCount,
    };
  }

  /**
   * GET /api/notifications/offer/:offerId
   * Get notifications for a specific offer
   */
  @Get('offer/:offerId')
  async getOfferNotifications(
    @Req() req: AuthRequest,
    @Param('offerId') offerId: string
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    const notifs = await this.notificationsService.getNotificationsByOffer(
      userId,
      offerId
    );
    const unreadCount =
      await this.notificationsService.getUnreadCountByOffer(userId, offerId);

    return {
      offerId,
      notifications: notifs,
      unreadCount,
    };
  }

  /**
   * GET /api/notifications/search?type=idea_update&isRead=false&projectId=...
   * Search notifications with filters
   */
  @Get('search')
  async searchNotifications(
    @Req() req: AuthRequest,
    @Query('type') type?: string,
    @Query('isRead') isRead?: string,
    @Query('projectId') projectId?: string,
    @Query('offerId') offerId?: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    const result = await this.notificationsService.searchNotifications(userId, {
      type,
      isRead: isRead ? isRead === 'true' : undefined,
      projectId,
      offerId,
      entityType,
      limit: Math.min(limit, 100),
      offset: Math.max(offset, 0),
    });

    return result;
  }

  /**
   * POST /api/notifications
   * Create a new notification (admin only)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createNotification(@Body() data: Partial<InsertNotification>) {
    // In production, validate admin role
    if (!data.userId || !data.type || !data.title || !data.body) {
      return { error: 'Missing required fields' };
    }

    const notification = await this.notificationsService.createNotification(
      data as InsertNotification
    );
    return notification;
  }

  /**
   * PUT /api/notifications/:id
   * Update notification (mark as read, etc.)
   */
  @Put(':id')
  async updateNotification(
    @Param('id') id: string,
    @Body() data: UpdateNotification
  ) {
    const notification = await this.notificationsService.updateNotification(
      id,
      data
    );
    return notification;
  }

  /**
   * PUT /api/notifications/:id/read
   * Mark notification as read
   */
  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(id);
    return notification;
  }

  /**
   * POST /api/notifications/read-all
   * Mark all notifications as read for user
   */
  @Post('read-all')
  async markAllAsRead(@Req() req: AuthRequest) {
    const userId = req.user?.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    const count = await this.notificationsService.markAllAsRead(userId);
    return { marked: count };
  }

  /**
   * POST /api/notifications/read-bulk
   * Mark multiple notifications as read
   */
  @Post('read-bulk')
  async markMultipleAsRead(@Body() { ids }: { ids: string[] }) {
    if (!ids || !Array.isArray(ids)) {
      return { error: 'Invalid IDs' };
    }

    const count = await this.notificationsService.markMultipleAsRead(ids);
    return { marked: count };
  }

  /**
   * PUT /api/notifications/project/:projectId/read
   * Mark all project notifications as read
   */
  @Put('project/:projectId/read')
  async markProjectAsRead(
    @Req() req: AuthRequest,
    @Param('projectId') projectId: string
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    const count = await this.notificationsService.markProjectAsRead(
      userId,
      projectId
    );
    return { marked: count };
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(@Param('id') id: string) {
    await this.notificationsService.deleteNotification(id);
  }

  /**
   * POST /api/notifications/cleanup
   * Delete old notifications (admin only)
   */
  @Post('cleanup')
  async cleanupOldNotifications(@Query('days') days: number = 30) {
    const count = await this.notificationsService.deleteOldNotifications(days);
    return { deleted: count };
  }
}
