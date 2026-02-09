import { Module } from '@nestjs/common';
import { MemberStatusesController } from './member-statuses.controller';
import { MemberStatusesService } from './member-statuses.service';
import { StorageModule } from '../common/storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [StorageModule, AuthModule],
  controllers: [MemberStatusesController],
  providers: [MemberStatusesService],
  exports: [MemberStatusesService],
})
export class MemberStatusesModule {}
