import { Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { TaskReminderService } from './task-reminder.service';

@ApiTags('admin/scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/admin/scheduler')
export class SchedulerController {
  constructor(private readonly taskReminderService: TaskReminderService) {}

  @Post('trigger-reminders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déclenche manuellement les rappels de tâches dues' })
  @ApiResponse({
    status: 200,
    description: 'Rappels envoyés',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        tasksFound: { type: 'number' },
      },
    },
  })
  async triggerReminders(): Promise<{ success: boolean; tasksFound: number }> {
    const result = await this.taskReminderService.triggerManually();
    return { success: true, tasksFound: result.tasksFound };
  }
}
