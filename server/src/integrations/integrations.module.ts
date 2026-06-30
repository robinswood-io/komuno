import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsController, IntegrationWebhooksController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [AuditModule],
  controllers: [IntegrationsController, IntegrationWebhooksController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
