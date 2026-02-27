import { Module } from '@nestjs/common';
import {
  MembersController,
  AdminMembersController,
  AdminMemberTagsController,
  AdminMemberTasksController,
  AdminMemberRelationsController,
  AdminMemberContactsController,
} from './members.controller';
import { MembersService } from './members.service';
import { StorageModule } from '../common/storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [StorageModule, AuthModule],
  controllers: [
    MembersController,
    AdminMembersController,
    AdminMemberTagsController,
    AdminMemberTasksController,
    AdminMemberRelationsController,
    AdminMemberContactsController,
  ],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}

