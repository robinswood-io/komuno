import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGeneratorService } from './notifications-generator.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { DatabaseModule } from '../common/database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ScheduleModule.forRoot(), // Active le système de scheduling
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGeneratorService,
    NotificationsScheduler,
  ],
  exports: [NotificationsService, NotificationsGeneratorService], // Export pour utilisation par d'autres modules
})
export class NotificationsModule {}
