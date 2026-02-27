import { Module } from '@nestjs/common';
import { TaskReminderService } from './task-reminder.service';
import { EmailModule } from '../email/email.module';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [EmailModule],
  providers: [TaskReminderService],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
