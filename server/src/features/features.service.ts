import { Injectable, Logger } from '@nestjs/common';
import { db } from '../../db';
import { featureConfig } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export interface FeatureConfigDto {
  featureKey: string;
  enabled: boolean;
}

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);

  // Default features if none exist in DB
  private readonly defaultFeatures: FeatureConfigDto[] = [
    { featureKey: 'ideas', enabled: true },
    { featureKey: 'events', enabled: true },
    { featureKey: 'loan', enabled: true },
    { featureKey: 'patrons', enabled: true },
    { featureKey: 'financial', enabled: true },
    { featureKey: 'tracking', enabled: true },
    { featureKey: 'members', enabled: true },
    { featureKey: 'crm', enabled: false },
  ];

  async getAllFeatures(): Promise<FeatureConfigDto[]> {
    try {
      const features = await db.select({
        featureKey: featureConfig.featureKey,
        enabled: featureConfig.enabled,
      }).from(featureConfig);

      // If no features in DB, return defaults
      if (features.length === 0) {
        this.logger.log('No features in DB, returning defaults');
        return this.defaultFeatures;
      }

      // Merge: DB values take precedence, defaults fill gaps for new features
      const dbMap = new Map(features.map(f => [f.featureKey, f]));
      return this.defaultFeatures.map(def => dbMap.get(def.featureKey) ?? def);
    } catch (error) {
      this.logger.error('Error fetching features:', error);
      // Return defaults on error
      return this.defaultFeatures;
    }
  }

  async getFeature(featureKey: string): Promise<FeatureConfigDto | null> {
    try {
      const [feature] = await db.select({
        featureKey: featureConfig.featureKey,
        enabled: featureConfig.enabled,
      })
        .from(featureConfig)
        .where(eq(featureConfig.featureKey, featureKey))
        .limit(1);

      if (!feature) {
        // Return default if not in DB
        const defaultFeature = this.defaultFeatures.find(f => f.featureKey === featureKey);
        return defaultFeature || null;
      }

      return feature;
    } catch (error) {
      this.logger.error(`Error fetching feature ${featureKey}:`, error);
      return null;
    }
  }

  async updateFeature(featureKey: string, enabled: boolean, updatedBy: string): Promise<FeatureConfigDto | null> {
    try {
      // Try to update existing
      const [existing] = await db.select()
        .from(featureConfig)
        .where(eq(featureConfig.featureKey, featureKey))
        .limit(1);

      if (existing) {
        // Update
        await db.update(featureConfig)
          .set({
            enabled,
            updatedBy,
            updatedAt: new Date(),
          } as any)
          .where(eq(featureConfig.featureKey, featureKey));
      } else {
        // Insert new
        await db.insert(featureConfig).values({
          featureKey,
          enabled,
          updatedBy,
          updatedAt: new Date(),
        } as any);
      }

      this.logger.log(`Feature ${featureKey} updated to ${enabled} by ${updatedBy}`);
      return { featureKey, enabled };
    } catch (error) {
      this.logger.error(`Error updating feature ${featureKey}:`, error);
      throw error;
    }
  }

  async initializeDefaultFeatures(): Promise<void> {
    try {
      const existing = await db.select().from(featureConfig);

      if (existing.length === 0) {
        this.logger.log('Initializing default features...');
        for (const feature of this.defaultFeatures) {
          await db.insert(featureConfig).values({
            featureKey: feature.featureKey,
            enabled: feature.enabled,
            updatedBy: 'system',
            updatedAt: new Date(),
          } as any);
        }
        this.logger.log(`Initialized ${this.defaultFeatures.length} default features`);
      }
    } catch (error) {
      this.logger.error('Error initializing default features:', error);
    }
  }
}
