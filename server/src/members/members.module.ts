import { Module } from '@nestjs/common';
import {
  MembersController,
  AdminMembersController,
  AdminMemberTagsController,
  AdminMemberTasksController,
  AdminMemberRelationsController,
  AdminMemberContactsController,
  AdminMemberGroupsController,
} from './members.controller';
import { MembersService } from './members.service';
import { StorageModule } from '../common/storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [StorageModule, AuthModule, IntegrationsModule],
  controllers: [
    MembersController,
    AdminMembersController,
    AdminMemberTagsController,
    AdminMemberTasksController,
    AdminMemberRelationsController,
    AdminMemberContactsController,
    AdminMemberGroupsController,
  ],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}

