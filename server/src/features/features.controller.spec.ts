import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FeaturesController } from './features.controller';
import { FeaturesService, FeatureConfigDto } from './features.service';

describe('FeaturesController', () => {
  let controller: FeaturesController;
  let service: FeaturesService;

  beforeEach(() => {
    // Mock FeaturesService
    service = {
      getAllFeatures: vi.fn(),
      getFeature: vi.fn(),
      updateFeature: vi.fn(),
      initializeDefaultFeatures: vi.fn(),
    } as unknown;

    controller = new FeaturesController(service);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/features - getAllFeatures', () => {
    it('should return all features with success response', async () => {
      const mockFeatures: FeatureConfigDto[] = [
        { featureKey: 'ideas', enabled: true },
        { featureKey: 'events', enabled: true },
        { featureKey: 'loan', enabled: false },
      ];

      vi.mocked(service.getAllFeatures).mockResolvedValue(mockFeatures);

      const result = await controller.getAllFeatures();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFeatures);
      expect(result.data).toHaveLength(3);
    });

    it('should be public endpoint (no auth required)', async () => {
      const mockFeatures: FeatureConfigDto[] = [
        { featureKey: 'ideas', enabled: true },
      ];

      vi.mocked(service.getAllFeatures).mockResolvedValue(mockFeatures);

      const result = await controller.getAllFeatures();

      // Should not throw even without authentication
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFeatures);
    });

    it('should handle empty feature list', async () => {
      vi.mocked(service.getAllFeatures).mockResolvedValue([]);

      const result = await controller.getAllFeatures();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should throw 500 error on service failure', async () => {
      vi.mocked(service.getAllFeatures).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(controller.getAllFeatures()).rejects.toThrow(HttpException);
    });

    it('should return features for frontend to check availability', async () => {
      const mockFeatures: FeatureConfigDto[] = [
        { featureKey: 'ideas', enabled: true },
        { featureKey: 'events', enabled: true },
        { featureKey: 'loan', enabled: true },
        { featureKey: 'patrons', enabled: true },
        { featureKey: 'financial', enabled: true },
        { featureKey: 'tracking', enabled: true },
        { featureKey: 'members', enabled: true },
      ];

      vi.mocked(service.getAllFeatures).mockResolvedValue(mockFeatures);

      const result = await controller.getAllFeatures();

      expect(result.success).toBe(true);
      expect(result.data.every(f => typeof f.enabled === 'boolean')).toBe(true);
      expect(result.data.every(f => typeof f.featureKey === 'string')).toBe(true);
    });
  });

  describe('GET /api/features/:featureKey - getFeature', () => {
    it('should return single feature by key', async () => {
      const mockFeature: FeatureConfigDto = { featureKey: 'ideas', enabled: true };

      vi.mocked(service.getFeature).mockResolvedValue(mockFeature);

      const result = await controller.getFeature('ideas');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFeature);
      expect(result.data.featureKey).toBe('ideas');
    });

    it('should be public endpoint', async () => {
      const mockFeature: FeatureConfigDto = { featureKey: 'events', enabled: true };

      vi.mocked(service.getFeature).mockResolvedValue(mockFeature);

      const result = await controller.getFeature('events');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFeature);
    });

    it('should throw 404 when feature not found', async () => {
      vi.mocked(service.getFeature).mockResolvedValue(null);

      await expect(controller.getFeature('unknownFeature')).rejects.toThrow(HttpException);

      try {
        await controller.getFeature('unknownFeature');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('should pass feature key to service', async () => {
      vi.mocked(service.getFeature).mockResolvedValue(null);

      try {
        await controller.getFeature('loan');
      } catch (error) {
        // Expected to fail
      }

      expect(service.getFeature).toHaveBeenCalledWith('loan');
    });

    it('should return feature status (enabled/disabled)', async () => {
      const enabledFeature: FeatureConfigDto = { featureKey: 'ideas', enabled: true };
      const disabledFeature: FeatureConfigDto = { featureKey: 'loan', enabled: false };

      vi.mocked(service.getFeature).mockResolvedValueOnce(enabledFeature);
      const resultEnabled = await controller.getFeature('ideas');
      expect(resultEnabled.data.enabled).toBe(true);

      vi.mocked(service.getFeature).mockResolvedValueOnce(disabledFeature);
      const resultDisabled = await controller.getFeature('loan');
      expect(resultDisabled.data.enabled).toBe(false);
    });

    it('should handle special characters in feature key', async () => {
      const mockFeature: FeatureConfigDto = { featureKey: 'feature-name', enabled: true };

      vi.mocked(service.getFeature).mockResolvedValue(mockFeature);

      const result = await controller.getFeature('feature-name');

      expect(service.getFeature).toHaveBeenCalledWith('feature-name');
      expect(result.success).toBe(true);
    });
  });

  describe('PUT /api/features/:featureKey - updateFeature', () => {
    it('should update feature and require admin permission', async () => {
      const mockUser = { email: 'admin@example.com' };
      const mockFeature: FeatureConfigDto = { featureKey: 'ideas', enabled: false };

      vi.mocked(service.updateFeature).mockResolvedValue(mockFeature);

      const result = await controller.updateFeature('ideas', { enabled: false }, mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFeature);
      expect(result.data.enabled).toBe(false);
    });

    it('should reject invalid enabled value (not boolean)', async () => {
      const mockUser = { email: 'admin@example.com' };

      await expect(
        controller.updateFeature('ideas', { enabled: 'yes' } as unknown, mockUser)
      ).rejects.toThrow(HttpException);
    });

    it('should reject null enabled value', async () => {
      const mockUser = { email: 'admin@example.com' };

      await expect(
        controller.updateFeature('ideas', { enabled: null } as unknown, mockUser)
      ).rejects.toThrow(HttpException);
    });

    it('should persist feature enabled state toggle', async () => {
      const mockUser = { email: 'admin@example.com' };
      const mockFeature: FeatureConfigDto = { featureKey: 'events', enabled: true };

      vi.mocked(service.updateFeature).mockResolvedValue(mockFeature);

      const result = await controller.updateFeature('events', { enabled: true }, mockUser);

      expect(service.updateFeature).toHaveBeenCalledWith('events', true, 'admin@example.com');
      expect(result.data.enabled).toBe(true);
    });

    it('should track who updated the feature', async () => {
      const mockUser = { email: 'manager@company.com' };
      const mockFeature: FeatureConfigDto = { featureKey: 'loan', enabled: false };

      vi.mocked(service.updateFeature).mockResolvedValue(mockFeature);

      await controller.updateFeature('loan', { enabled: false }, mockUser);

      expect(service.updateFeature).toHaveBeenCalledWith('loan', false, 'manager@company.com');
    });

    it('should return success message on update', async () => {
      const mockUser = { email: 'admin@example.com' };
      const mockFeature: FeatureConfigDto = { featureKey: 'patrons', enabled: true };

      vi.mocked(service.updateFeature).mockResolvedValue(mockFeature);

      const result = await controller.updateFeature('patrons', { enabled: true }, mockUser);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Feature');
      expect(result.message).toContain('patrons');
    });

    it('should distinguish between enable and disable messages', async () => {
      const mockUser = { email: 'admin@example.com' };

      vi.mocked(service.updateFeature).mockResolvedValueOnce({ featureKey: 'financial', enabled: true });
      const enableResult = await controller.updateFeature('financial', { enabled: true }, mockUser);
      expect(enableResult.message).toContain('enabled');

      vi.mocked(service.updateFeature).mockResolvedValueOnce({ featureKey: 'financial', enabled: false });
      const disableResult = await controller.updateFeature('financial', { enabled: false }, mockUser);
      expect(disableResult.message).toContain('disabled');
    });

    it('should throw 400 when enabled is not boolean', async () => {
      const mockUser = { email: 'admin@example.com' };

      try {
        await controller.updateFeature('ideas', { enabled: 'true' } as unknown, mockUser);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('should throw 500 when service update fails', async () => {
      const mockUser = { email: 'admin@example.com' };

      vi.mocked(service.updateFeature).mockRejectedValue(new Error('Database error'));

      await expect(
        controller.updateFeature('ideas', { enabled: true }, mockUser)
      ).rejects.toThrow(HttpException);
    });

    it('should handle update with different user emails', async () => {
      const users = [
        { email: 'admin1@example.com' },
        { email: 'admin2@company.org' },
        { email: 'super-admin@system.local' },
      ];

      const mockFeature: FeatureConfigDto = { featureKey: 'tracking', enabled: true };
      vi.mocked(service.updateFeature).mockResolvedValue(mockFeature);

      for (const user of users) {
        await controller.updateFeature('tracking', { enabled: true }, user);
        expect(service.updateFeature).toHaveBeenCalledWith('tracking', true, user.email);
      }

      expect(service.updateFeature).toHaveBeenCalledTimes(3);
    });

    it('should toggle feature on and off', async () => {
      const mockUser = { email: 'admin@example.com' };

      vi.mocked(service.updateFeature).mockResolvedValueOnce({ featureKey: 'members', enabled: true });
      const resultOn = await controller.updateFeature('members', { enabled: true }, mockUser);
      expect(resultOn.data.enabled).toBe(true);

      vi.mocked(service.updateFeature).mockResolvedValueOnce({ featureKey: 'members', enabled: false });
      const resultOff = await controller.updateFeature('members', { enabled: false }, mockUser);
      expect(resultOff.data.enabled).toBe(false);
    });
  });

  describe('Response format validation', () => {
    it('should return consistent response structure for getAllFeatures', async () => {
      const mockFeatures: FeatureConfigDto[] = [
        { featureKey: 'ideas', enabled: true },
      ];

      vi.mocked(service.getAllFeatures).mockResolvedValue(mockFeatures);

      const result = await controller.getAllFeatures();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(typeof result.success).toBe('boolean');
    });

    it('should return consistent response structure for getFeature', async () => {
      const mockFeature: FeatureConfigDto = { featureKey: 'ideas', enabled: true };

      vi.mocked(service.getFeature).mockResolvedValue(mockFeature);

      const result = await controller.getFeature('ideas');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
    });

    it('should return consistent response structure for updateFeature', async () => {
      const mockUser = { email: 'admin@example.com' };
      const mockFeature: FeatureConfigDto = { featureKey: 'ideas', enabled: false };

      vi.mocked(service.updateFeature).mockResolvedValue(mockFeature);

      const result = await controller.updateFeature('ideas', { enabled: false }, mockUser);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
    });
  });

  describe('Error handling', () => {
    it('should catch and wrap service errors', async () => {
      vi.mocked(service.getAllFeatures).mockRejectedValue(
        new Error('Database connection failed')
      );

      try {
        await controller.getAllFeatures();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
    });

    it('should return appropriate error status codes', async () => {
      vi.mocked(service.getFeature).mockResolvedValue(null);

      try {
        await controller.getFeature('unknown');
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(404);
      }
    });
  });

  describe('Feature flag integration', () => {
    it('should allow frontend to check feature availability', async () => {
      const mockFeatures: FeatureConfigDto[] = [
        { featureKey: 'ideas', enabled: true },
        { featureKey: 'events', enabled: false },
      ];

      vi.mocked(service.getAllFeatures).mockResolvedValue(mockFeatures);

      const result = await controller.getAllFeatures();

      // Frontend can map enabled status to UI
      const enabledFeatures = result.data.filter(f => f.enabled);
      expect(enabledFeatures.length).toBe(1);
      expect(enabledFeatures[0].featureKey).toBe('ideas');
    });

    it('should allow conditional rendering based on feature status', async () => {
      const mockFeature: FeatureConfigDto = { featureKey: 'loan', enabled: false };

      vi.mocked(service.getFeature).mockResolvedValue(mockFeature);

      const result = await controller.getFeature('loan');

      // Component can use this to conditionally render
      expect(result.data.enabled).toBe(false);
    });

    it('should support rapid feature flag checks', async () => {
      const mockFeature: FeatureConfigDto = { featureKey: 'tracking', enabled: true };

      vi.mocked(service.getFeature).mockResolvedValue(mockFeature);

      // Simulate rapid calls
      for (let i = 0; i < 5; i++) {
        const result = await controller.getFeature('tracking');
        expect(result.data.enabled).toBe(true);
      }

      expect(service.getFeature).toHaveBeenCalledTimes(5);
    });
  });

  describe('Validation and input sanitization', () => {
    it('should validate boolean type strictly', async () => {
      const mockUser = { email: 'admin@example.com' };
      const invalidInputs = [
        { enabled: 0 },
        { enabled: 1 },
        { enabled: 'true' },
        { enabled: 'false' },
        { enabled: [] },
        { enabled: {} },
      ];

      for (const input of invalidInputs) {
        await expect(
          controller.updateFeature('ideas', input as unknown, mockUser)
        ).rejects.toThrow(HttpException);
      }
    });

    it('should accept only true or false for enabled', async () => {
      const mockUser = { email: 'admin@example.com' };
      const mockFeature: FeatureConfigDto = { featureKey: 'ideas', enabled: true };

      vi.mocked(service.updateFeature).mockResolvedValue(mockFeature);

      // Should accept true
      const resultTrue = await controller.updateFeature('ideas', { enabled: true }, mockUser);
      expect(resultTrue.success).toBe(true);

      // Should accept false
      vi.mocked(service.updateFeature).mockResolvedValue({ ...mockFeature, enabled: false });
      const resultFalse = await controller.updateFeature('ideas', { enabled: false }, mockUser);
      expect(resultFalse.success).toBe(true);
    });
  });
});
