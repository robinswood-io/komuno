import { Module } from '@nestjs/common';
import { EventsController, InscriptionsController, UnsubscriptionsController } from './events.controller';
import { EventsService } from './events.service';
import { StorageModule } from '../common/storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { FederationModule } from '../federation/federation.module';

@Module({
  imports: [StorageModule, AuthModule, FederationModule],
  controllers: [EventsController, InscriptionsController, UnsubscriptionsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}


