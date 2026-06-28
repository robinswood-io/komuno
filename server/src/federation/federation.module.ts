import { Module } from '@nestjs/common';
import { AdminFederationController, PublicFederationController } from './federation.controller';
import { FederationService } from './federation.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminFederationController, PublicFederationController],
  providers: [FederationService],
  exports: [FederationService],
})
export class FederationModule {}
