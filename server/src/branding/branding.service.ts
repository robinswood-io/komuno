import { Injectable, BadRequestException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import { MinIOService } from '../integrations/minio/minio.service';

@Injectable()
export class BrandingService {
  private static readonly LOGO_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

  constructor(
    private readonly storageService: StorageService,
    private readonly minioService: MinIOService,
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
    
    const normalization = this.normalizeBrandingConfig(result.data.config);
    let persistedConfig = result.data.config;

    if (normalization.changed) {
      persistedConfig = normalization.config;
      // Best effort: ne pas bloquer la lecture si la normalisation ne peut pas être persistée
      try {
        await this.storageService.instance.updateBrandingConfig(
          persistedConfig,
          result.data.updatedBy ?? 'system@branding.local',
        );
      } catch {
        // no-op
      }
    }

    return {
      ...result.data,
      config: persistedConfig,
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

      // Utiliser une URL applicative stable (évite les endpoints MinIO internes).
      const logoUrl = `/api/admin/branding/logo/${encodeURIComponent(filename)}`;

      // Récupérer la config actuelle
      const currentConfig = await this.getBrandingConfig();
      const config = currentConfig.isDefault
        ? { logoFilename: filename, logoUrl }
        : { ...JSON.parse(currentConfig.config), logoFilename: filename, logoUrl };

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

  async getLogoStream(filename: string): Promise<NodeJS.ReadableStream> {
    return this.minioService.getObjectStream(this.minioService.assetsBucket, filename);
  }

  private normalizeBrandingConfig(configString: string): { config: string; changed: boolean } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configString);
    } catch {
      return { config: configString, changed: false };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { config: configString, changed: false };
    }

    const config = parsed as Record<string, unknown>;
    const currentLogoFilename = this.extractLogoFilename(config.logoFilename);
    const currentLogoUrl = typeof config.logoUrl === 'string' ? config.logoUrl : undefined;
    let nextLogoFilename = currentLogoFilename;
    let changed = false;

    if (!nextLogoFilename && currentLogoUrl) {
      nextLogoFilename = this.extractLogoFilenameFromUrl(currentLogoUrl);
      if (nextLogoFilename) {
        config.logoFilename = nextLogoFilename;
        changed = true;
      }
    }

    if (nextLogoFilename) {
      const normalizedLogoUrl = this.buildInternalLogoUrl(nextLogoFilename);
      if (config.logoUrl !== normalizedLogoUrl) {
        config.logoUrl = normalizedLogoUrl;
        changed = true;
      }
    } else if (typeof currentLogoUrl === 'string' && this.isAbsoluteUrl(currentLogoUrl)) {
      // Nettoyer les URLs absolues legacy non compatibles navigateur
      delete config.logoUrl;
      changed = true;
    }

    if (!changed) {
      return { config: configString, changed: false };
    }

    return { config: JSON.stringify(config), changed: true };
  }

  private extractLogoFilename(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed || !BrandingService.LOGO_FILENAME_REGEX.test(trimmed)) {
      return undefined;
    }
    return trimmed;
  }

  private buildInternalLogoUrl(filename: string): string {
    return `/api/admin/branding/logo/${encodeURIComponent(filename)}`;
  }

  private extractLogoFilenameFromUrl(logoUrl: string): string | undefined {
    const trimmed = logoUrl.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsePath = (pathname: string): string | undefined => {
      const logoApiPrefix = '/api/admin/branding/logo/';
      const assetsPrefix = '/assets/';

      if (pathname.startsWith(logoApiPrefix)) {
        return this.extractLogoFilename(
          decodeURIComponent(pathname.slice(logoApiPrefix.length))
        );
      }
      if (pathname.startsWith(assetsPrefix)) {
        return this.extractLogoFilename(
          decodeURIComponent(pathname.slice(assetsPrefix.length))
        );
      }
      return undefined;
    };

    if (trimmed.startsWith('/')) {
      return parsePath(trimmed);
    }

    try {
      const parsedUrl = new URL(trimmed);
      return parsePath(parsedUrl.pathname);
    } catch {
      return undefined;
    }
  }

  private isAbsoluteUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
