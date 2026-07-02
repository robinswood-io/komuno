import { Module } from '@nestjs/common';
import { FormsController, PublicFormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  imports: [AuthModule, AuditModule, IntegrationsModule, AutomationsModule],
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
