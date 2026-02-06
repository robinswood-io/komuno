import { Module } from '@nestjs/common';
import { ToolsController, AdminToolsController } from './tools.controller';
import { ToolsService } from './tools.service';
import { StorageModule } from '../common/storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [StorageModule, AuthModule, ThrottlerModule],
  controllers: [ToolsController, AdminToolsController],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
