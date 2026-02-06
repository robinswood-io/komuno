import { Module } from '@nestjs/common';
import { AdminController, LogsController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminNotificationsController } from './admin-notifications.controller';
import { StorageModule } from '../common/storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { IdeasModule } from '../ideas/ideas.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [StorageModule, AuthModule, IdeasModule, EventsModule, NotificationsModule],
  controllers: [AdminController, LogsController, AdminNotificationsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

