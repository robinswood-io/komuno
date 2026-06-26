import { Module } from '@nestjs/common';
import { FormsController, PublicFormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
