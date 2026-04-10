import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';

// Mock DATABASE_URL in environment before module import
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock all database dependencies
vi.mock('../../db', () => {
  const mockBuilder = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
  };

  return {
    db: {
      select: vi.fn().mockReturnValue(mockBuilder),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
      update: vi.fn().mockReturnValue(mockBuilder),
    },
  };
});

vi.mock('../../../shared/schema', () => ({
  featureConfig: {
    featureKey: 'featureKey',
    enabled: 'enabled',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ a, b })),
}));

import { FeaturesService, FeatureConfigDto } from './features.service';
import { db } from '../../db';
import { featureConfig } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('FeaturesService', () => {
  let service: FeaturesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeaturesService();
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllFeatures', () => {
    it('should return features from database', async () => {
      const mockFeatures: FeatureConfigDto[] = [
        { featureKey: 'ideas', enabled: true },
        { featureKey: 'events', enabled: true },
        { featureKey: 'loan', enabled: false },
      ];

      const mockBuilder = {
        from: vi.fn().mockResolvedValue(mockFeatures),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      const result = await service.getAllFeatures();
      const byKey = new Map(result.map((feature) => [feature.featureKey, feature.enabled]));

      expect(result).toHaveLength(8);
      expect(byKey.get('ideas')).toBe(true);
      expect(byKey.get('events')).toBe(true);
      expect(byKey.get('loan')).toBe(false);
      expect(byKey.get('patrons')).toBe(true);
      expect(byKey.get('financial')).toBe(true);
      expect(byKey.get('tracking')).toBe(true);
      expect(byKey.get('members')).toBe(true);
      expect(byKey.get('crm')).toBe(false);
      expect(db.select).toHaveBeenCalled();
    });

    it('should return default features when database is empty', async () => {
      const mockBuilder = {
        from: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      const result = await service.getAllFeatures();

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(f => f.featureKey === 'ideas')).toBe(true);
      expect(result.some(f => f.featureKey === 'events')).toBe(true);
      expect(result.some(f => f.featureKey === 'loan')).toBe(true);
      expect(result.some(f => f.featureKey === 'patrons')).toBe(true);
      expect(result.some(f => f.featureKey === 'financial')).toBe(true);
      expect(result.some(f => f.featureKey === 'tracking')).toBe(true);
      expect(result.some(f => f.featureKey === 'members')).toBe(true);
    });

    it('should return default features on database error', async () => {
      const mockBuilder = {
        from: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      const result = await service.getAllFeatures();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].featureKey).toBe('ideas');
      expect(result[0].enabled).toBe(true);
    });

    it('should return all 8 default features when database is empty', async () => {
      const mockBuilder = {
        from: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      const result = await service.getAllFeatures();

      expect(result).toHaveLength(8);
      expect(result.map(f => f.featureKey)).toEqual([
        'ideas',
        'events',
        'loan',
        'patrons',
        'financial',
        'tracking',
        'members',
        'crm',
      ]);
    });
  });

  describe('getFeature', () => {
    it('should return a feature by key', async () => {
      const mockFeature: FeatureConfigDto = { featureKey: 'ideas', enabled: true };

      const mockBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockFeature]),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      const result = await service.getFeature('ideas');

      expect(result).toEqual(mockFeature);
      expect(result?.featureKey).toBe('ideas');
      expect(result?.enabled).toBe(true);
    });

    it('should return default feature when not in database', async () => {
      const mockBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      const result = await service.getFeature('ideas');

      expect(result).not.toBeNull();
      expect(result?.featureKey).toBe('ideas');
      expect(result?.enabled).toBe(true);
    });

    it('should return null for unknown feature key', async () => {
      const mockBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      const result = await service.getFeature('unknownFeature');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      const mockBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Database error')),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      const result = await service.getFeature('ideas');

      expect(result).toBeNull();
    });

    it('should query correct feature key', async () => {
      const mockBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      await service.getFeature('loan');

      expect(mockBuilder.where).toHaveBeenCalled();
      expect(mockBuilder.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('updateFeature', () => {
    it('should update existing feature', async () => {
      const mockBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureKey: 'ideas', enabled: true }]),
        set: vi.fn().mockReturnThis(),
      };

      vi.mocked(db.select).mockReturnValue(mockBuilder as any);
      vi.mocked(db.update).mockReturnValue(mockBuilder as any);

      const result = await service.updateFeature('ideas', false, 'admin@example.com');

      expect(result?.featureKey).toBe('ideas');
      expect(result?.enabled).toBe(false);
      expect(db.update).toHaveBeenCalledWith(featureConfig);
    });

    it('should insert new feature if not exists', async () => {
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const insertBuilder = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.insert).mockReturnValue(insertBuilder as any);

      const result = await service.updateFeature('newFeature', true, 'admin@example.com');

      expect(result?.featureKey).toBe('newFeature');
      expect(result?.enabled).toBe(true);
      expect(db.insert).toHaveBeenCalledWith(featureConfig);
    });

    it('should persist feature enabled state to false', async () => {
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureKey: 'loan', enabled: true }]),
      };

      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.update).mockReturnValue(updateBuilder as any);

      await service.updateFeature('loan', false, 'admin@test.com');

      expect(updateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          updatedBy: 'admin@test.com',
        })
      );
    });

    it('should record updatedBy metadata', async () => {
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureKey: 'events', enabled: true }]),
      };

      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.update).mockReturnValue(updateBuilder as any);

      await service.updateFeature('events', true, 'manager@example.com');

      const callArgs = updateBuilder.set.mock.calls[0][0];
      expect(callArgs.updatedBy).toBe('manager@example.com');
      expect(callArgs.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error on update failure', async () => {
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureKey: 'ideas', enabled: true }]),
      };

      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockRejectedValue(new Error('Update failed')),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.update).mockReturnValue(updateBuilder as any);

      await expect(
        service.updateFeature('ideas', false, 'admin@example.com')
      ).rejects.toThrow('Update failed');
    });

    it('should toggle feature off', async () => {
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureKey: 'patrons', enabled: true }]),
      };

      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.update).mockReturnValue(updateBuilder as any);

      const result = await service.updateFeature('patrons', false, 'admin@example.com');

      expect(result?.featureKey).toBe('patrons');
      expect(result?.enabled).toBe(false);
    });

    it('should toggle feature on', async () => {
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureKey: 'financial', enabled: false }]),
      };

      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.update).mockReturnValue(updateBuilder as any);

      const result = await service.updateFeature('financial', true, 'admin@example.com');

      expect(result?.featureKey).toBe('financial');
      expect(result?.enabled).toBe(true);
    });
  });

  describe('initializeDefaultFeatures', () => {
    it('should initialize default features on empty database', async () => {
      const selectBuilder = {
        from: vi.fn().mockResolvedValue([]),
      };

      const insertBuilder = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.insert).mockReturnValue(insertBuilder as any);

      await service.initializeDefaultFeatures();

      expect(db.insert).toHaveBeenCalledWith(featureConfig);
      expect(insertBuilder.values).toHaveBeenCalledTimes(8);
    });

    it('should not initialize when features exist', async () => {
      const selectBuilder = {
        from: vi.fn().mockResolvedValue([{ featureKey: 'ideas', enabled: true }]),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);

      await service.initializeDefaultFeatures();

      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should insert all 8 default features', async () => {
      const selectBuilder = {
        from: vi.fn().mockResolvedValue([]),
      };

      const insertBuilder = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.insert).mockReturnValue(insertBuilder as any);

      await service.initializeDefaultFeatures();

      expect(insertBuilder.values).toHaveBeenCalledTimes(8);

      const calls = insertBuilder.values.mock.calls;
      const insertedFeatures = calls.map(call => call[0].featureKey);

      expect(insertedFeatures).toContain('ideas');
      expect(insertedFeatures).toContain('events');
      expect(insertedFeatures).toContain('loan');
      expect(insertedFeatures).toContain('patrons');
      expect(insertedFeatures).toContain('financial');
      expect(insertedFeatures).toContain('tracking');
      expect(insertedFeatures).toContain('members');
      expect(insertedFeatures).toContain('crm');
    });

    it('should set system as updatedBy', async () => {
      const selectBuilder = {
        from: vi.fn().mockResolvedValue([]),
      };

      const insertBuilder = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.insert).mockReturnValue(insertBuilder as any);

      await service.initializeDefaultFeatures();

      const calls = insertBuilder.values.mock.calls;
      calls.forEach(call => {
        expect(call[0].updatedBy).toBe('system');
      });
    });

    it('should set timestamp on initialization', async () => {
      const selectBuilder = {
        from: vi.fn().mockResolvedValue([]),
      };

      const insertBuilder = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.insert).mockReturnValue(insertBuilder as any);

      await service.initializeDefaultFeatures();

      const calls = insertBuilder.values.mock.calls;
      calls.forEach(call => {
        expect(call[0].updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should handle initialization error gracefully', async () => {
      const selectBuilder = {
        from: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);

      await expect(service.initializeDefaultFeatures()).resolves.not.toThrow();
    });

    it('should apply expected enabled state for each default feature', async () => {
      const selectBuilder = {
        from: vi.fn().mockResolvedValue([]),
      };

      const insertBuilder = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.insert).mockReturnValue(insertBuilder as any);

      await service.initializeDefaultFeatures();

      const calls = insertBuilder.values.mock.calls;
      const enabledByFeature = new Map(calls.map((call) => [call[0].featureKey, call[0].enabled]));

      expect(enabledByFeature.get('ideas')).toBe(true);
      expect(enabledByFeature.get('events')).toBe(true);
      expect(enabledByFeature.get('loan')).toBe(true);
      expect(enabledByFeature.get('patrons')).toBe(true);
      expect(enabledByFeature.get('financial')).toBe(true);
      expect(enabledByFeature.get('tracking')).toBe(true);
      expect(enabledByFeature.get('members')).toBe(true);
      expect(enabledByFeature.get('crm')).toBe(false);
    });
  });

  describe('Feature Toggle - Integration', () => {
    it('should handle rapid toggle changes', async () => {
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureKey: 'ideas', enabled: true }]),
      };

      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.update).mockReturnValue(updateBuilder as any);

      await service.updateFeature('ideas', false, 'admin@example.com');
      await service.updateFeature('ideas', true, 'admin@example.com');
      await service.updateFeature('ideas', false, 'admin@example.com');

      expect(updateBuilder.set).toHaveBeenCalledTimes(3);
    });

    it('should track who updated', async () => {
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureKey: 'events', enabled: true }]),
      };

      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.update).mockReturnValue(updateBuilder as any);

      await service.updateFeature('events', false, 'manager@company.com');

      const callArgs = updateBuilder.set.mock.calls[0][0];
      expect(callArgs.updatedBy).toBe('manager@company.com');
    });

    it('should verify consistency after update', async () => {
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureKey: 'loan', enabled: false }]),
      };

      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.update).mockReturnValue(updateBuilder as any);

      const updatedFeature = await service.updateFeature('loan', true, 'admin@example.com');

      expect(updatedFeature?.featureKey).toBe('loan');
      expect(updatedFeature?.enabled).toBe(true);
    });
  });

  describe('Feature Status', () => {
    it('should return status for all features', async () => {
      const mockFeatures: FeatureConfigDto[] = [
        { featureKey: 'ideas', enabled: true },
        { featureKey: 'events', enabled: false },
        { featureKey: 'loan', enabled: true },
      ];

      const mockBuilder = {
        from: vi.fn().mockResolvedValue(mockFeatures),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      const result = await service.getAllFeatures();

      const byKey = new Map(result.map((feature) => [feature.featureKey, feature.enabled]));

      expect(result).toHaveLength(8);
      expect(byKey.get('ideas')).toBe(true);
      expect(byKey.get('events')).toBe(false);
      expect(byKey.get('loan')).toBe(true);
      expect(byKey.get('crm')).toBe(false);
    });

    it('should return consistent status across calls', async () => {
      const mockFeature: FeatureConfigDto = { featureKey: 'ideas', enabled: true };

      const mockBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockFeature]),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      const result1 = await service.getFeature('ideas');
      const result2 = await service.getFeature('ideas');

      expect(result1?.enabled).toBe(result2?.enabled);
      expect(result1?.featureKey).toBe(result2?.featureKey);
    });
  });

  describe('Persistence', () => {
    it('should persist to database on update', async () => {
      const selectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureKey: 'tracking', enabled: true }]),
      };

      const updateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(selectBuilder as any);
      vi.mocked(db.update).mockReturnValue(updateBuilder as any);

      await service.updateFeature('tracking', false, 'admin@example.com');

      expect(updateBuilder.where).toHaveBeenCalled();
    });

    it('should use correct table schema', async () => {
      const mockBuilder = {
        from: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(db.select).mockReturnValue(mockBuilder as any);

      await service.getAllFeatures();

      expect(mockBuilder.from).toHaveBeenCalledWith(featureConfig);
    });
  });
});
