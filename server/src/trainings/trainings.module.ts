import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AutomationsModule } from '../automations/automations.module';
import { FederationModule } from '../federation/federation.module';
import { FederatedTrainingsController, TrainingsController, PublicTrainingsController } from './trainings.controller';
import { TrainingsService } from './trainings.service';

@Module({
  imports: [AuthModule, AuditModule, AutomationsModule, FederationModule],
  controllers: [TrainingsController, PublicTrainingsController, FederatedTrainingsController],
  providers: [TrainingsService],
  exports: [TrainingsService],
})
export class TrainingsModule {}
