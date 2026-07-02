import { Module } from '@nestjs/common';
import { EventsController, InscriptionsController, PublicEventsController, UnsubscriptionsController } from './events.controller';
import { EventsService } from './events.service';
import { StorageModule } from '../common/storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { FederationModule } from '../federation/federation.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  imports: [StorageModule, AuthModule, FederationModule, IntegrationsModule, AutomationsModule],
  controllers: [EventsController, PublicEventsController, InscriptionsController, UnsubscriptionsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}


