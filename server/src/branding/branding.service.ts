import { Injectable, BadRequestException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class BrandingService {
  constructor(private readonly storageService: StorageService) {}

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
}

