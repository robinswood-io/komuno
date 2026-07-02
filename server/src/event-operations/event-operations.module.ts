import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AutomationsModule } from '../automations/automations.module';
import { EventOperationsController } from './event-operations.controller';
import { EventOperationsService } from './event-operations.service';

@Module({
  imports: [AuthModule, AuditModule, AutomationsModule],
  controllers: [EventOperationsController],
  providers: [EventOperationsService],
  exports: [EventOperationsService],
})
export class EventOperationsModule {}
