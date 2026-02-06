import { Injectable, BadRequestException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import { MinIOService } from '../integrations/minio/minio.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BrandingService {
  constructor(
    private readonly storageService: StorageService,
    private readonly minioService: MinIOService,
    private readonly configService: ConfigService,
  ) {}

  async getBrandingConfig() {
    const result = await this.storageService.instance.getBrandingConfig();
    
    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }
    
    if (!result.data) {
      const { brandingCore } = await import('../../../lib/config/branding-core');
      return {
        config: JSON.stringify(brandingCore),
        isDefault: true
      };
    }
    
    return {
      ...result.data,
      isDefault: false
    };
  }

  async updateBrandingConfig(config: string, userEmail: string) {
    if (!config) {
      throw new BadRequestException("Configuration manquante");
    }
    
    const result = await this.storageService.instance.updateBrandingConfig(config, userEmail);
    
    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }
    
    return result.data;
  }

  async resetBrandingConfig() {
    const result = await this.storageService.instance.deleteBrandingConfig();

    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }

    const { brandingCore } = await import('../../../lib/config/branding-core');
    return {
      config: JSON.stringify(brandingCore),
      isDefault: true,
    };
  }

  async uploadLogo(file: Express.Multer.File, userEmail: string) {
    try {
      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const extension = file.originalname.split('.').pop();
      const filename = `logo-${timestamp}.${extension}`;

      // Upload vers MinIO dans le bucket 'assets'
      await this.minioService.uploadFile(
        'assets',
        filename,
        file.buffer,
        file.mimetype
      );

      // Construire l'URL du logo
      const minioEndpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost:9000');
      const minioUseSsl = this.configService.get<string>('MINIO_USE_SSL') === 'true';
      const protocol = minioUseSsl ? 'https' : 'http';
      const logoUrl = `${protocol}://${minioEndpoint}/assets/${filename}`;

      // Récupérer la config actuelle
      const currentConfig = await this.getBrandingConfig();
      const config = currentConfig.isDefault
        ? { logoFilename: filename }
        : { ...JSON.parse(currentConfig.config), logoFilename: filename };

      // Sauvegarder la config avec le nouveau logo
      await this.updateBrandingConfig(JSON.stringify(config), userEmail);

      return {
        filename,
        url: logoUrl,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Erreur lors de l'upload du logo: ${errorMessage}`);
    }
  }
}

