import { Module } from '@nestjs/common';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';
import { StorageModule } from '../common/storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { MinIOModule } from '../integrations/minio/minio.module';

@Module({
  imports: [StorageModule, AuthModule, MinIOModule],
  controllers: [BrandingController],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}


