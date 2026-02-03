import { Module } from '@nestjs/common';
import { GitHubController } from './github.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [GitHubController],
})
export class GitHubModule {}
