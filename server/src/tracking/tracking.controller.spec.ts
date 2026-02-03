import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

describe('TrackingController', () => {
  let controller: TrackingController;
  let service: TrackingService;

  beforeEach(() => {
    service = {
      getTrackingDashboard: vi.fn(),
      getTrackingMetrics: vi.fn(),
      createTrackingMetric: vi.fn(),
      getTrackingAlerts: vi.fn(),
      createTrackingAlert: vi.fn(),
      updateTrackingAlert: vi.fn(),
      generateTrackingAlerts: vi.fn(),
    } as unknown as TrackingService;

    controller = new TrackingController(service);
  });

  const createMockRequest = (): Partial<typeof import('express').Request> => ({
    user: { email: 'test@example.com' },
  });

  describe('getTrackingDashboard', () => {
    it('should call service and return dashboard data', async () => {
      const mockDashboard = {
        success: true,
        data: {
          totalMetrics: 150,
          totalAlerts: 45,
          criticalAlerts: 5,
        },
      };

      vi.mocked(service.getTrackingDashboard).mockResolvedValueOnce(mockDashboard);

      const result = await controller.getTrackingDashboard();

      expect(result).toEqual(mockDashboard);
      expect(service.getTrackingDashboard).toHaveBeenCalledOnce();
    });
  });

  describe('getTrackingMetrics', () => {
    it('should call service with all provided filters', async () => {
      const mockMetrics = {
        success: true,
        data: [
          {
            id: 'metric-1',
            entityType: 'member',
            entityId: 'member-123',
            entityEmail: 'john@example.com',
            metricType: 'engagement',
            metricValue: 85,
            recordedAt: new Date(),
          },
        ],
      };

      vi.mocked(service.getTrackingMetrics).mockResolvedValueOnce(mockMetrics);

      const result = await controller.getTrackingMetrics(
        'member',
        'member-123',
        'john@example.com',
        'engagement',
        '2026-01-01',
        '2026-03-31',
        '100'
      );

      expect(result).toEqual(mockMetrics);

      expect(service.getTrackingMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'member',
          entityId: 'member-123',
          entityEmail: 'john@example.com',
          metricType: 'engagement',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
          limit: 100,
        })
      );
    });

    it('should call service with only provided filters', async () => {
      const mockMetrics = {
        success: true,
        data: [],
      };

      vi.mocked(service.getTrackingMetrics).mockResolvedValueOnce(mockMetrics);

      await controller.getTrackingMetrics('member', undefined, undefined, undefined, undefined, undefined, undefined);

      expect(service.getTrackingMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'member',
        })
      );

      expect(service.getTrackingMetrics).toHaveBeenCalledWith(
        expect.not.objectContaining({
          entityId: expect.anything(),
        })
      );
    });

    it('should parse limit string to number', async () => {
      const mockMetrics = {
        success: true,
        data: [],
      };

      vi.mocked(service.getTrackingMetrics).mockResolvedValueOnce(mockMetrics);

      await controller.getTrackingMetrics(undefined, undefined, undefined, undefined, undefined, undefined, '50');

      expect(service.getTrackingMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
        })
      );
    });

    it('should handle undefined query parameters gracefully', async () => {
      const mockMetrics = {
        success: true,
        data: [],
      };

      vi.mocked(service.getTrackingMetrics).mockResolvedValueOnce(mockMetrics);

      await controller.getTrackingMetrics(undefined, undefined, undefined, undefined, undefined, undefined, undefined);

      expect(service.getTrackingMetrics).toHaveBeenCalledWith({});
    });
  });

  describe('createTrackingMetric', () => {
    it('should create metric with user email from decorator', async () => {
      const requestBody = {
        entityType: 'member',
        entityId: 'member-456',
        entityEmail: 'jane@example.com',
        metricType: 'conversion',
        metricValue: 100,
      };

      const mockCreatedMetric = {
        success: true,
        data: {
          id: 'metric-2',
          ...requestBody,
          recordedBy: 'admin@example.com',
          recordedAt: new Date(),
        },
      };

      const user = { email: 'admin@example.com' };
      const req = createMockRequest() as never;

      vi.mocked(service.createTrackingMetric).mockResolvedValueOnce(mockCreatedMetric);

      const result = await controller.createTrackingMetric(requestBody, req, user);

      expect(result).toEqual(mockCreatedMetric);

      expect(service.createTrackingMetric).toHaveBeenCalledWith(requestBody, 'admin@example.com');
    });

    it('should pass request body as-is to service', async () => {
      const requestBody = {
        entityType: 'patron',
        entityId: 'patron-789',
        entityEmail: 'patron@example.com',
        alertType: 'conversion_opportunity',
        metricType: 'activity',
        description: 'High activity level',
      };

      const user = { email: 'admin@example.com' };
      const req = createMockRequest() as never;

      vi.mocked(service.createTrackingMetric).mockResolvedValueOnce({
        success: true,
        data: {} as never,
      });

      await controller.createTrackingMetric(requestBody, req, user);

      expect(service.createTrackingMetric).toHaveBeenCalledWith(requestBody, user.email);
    });
  });

  describe('getTrackingAlerts', () => {
    it('should call service with all provided filters', async () => {
      const mockAlerts = {
        success: true,
        data: [
          {
            id: 'alert-1',
            entityType: 'member',
            entityId: 'member-123',
            entityEmail: 'john@example.com',
            alertType: 'stale',
            severity: 'high',
            title: 'No engagement',
            message: 'Member has not engaged in 90 days',
            isRead: false,
            isResolved: false,
            createdAt: new Date(),
          },
        ],
      };

      vi.mocked(service.getTrackingAlerts).mockResolvedValueOnce(mockAlerts);

      const result = await controller.getTrackingAlerts(
        'member',
        'member-123',
        'false',
        'true',
        'high',
        '25'
      );

      expect(result).toEqual(mockAlerts);

      expect(service.getTrackingAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'member',
          entityId: 'member-123',
          isRead: false,
          isResolved: true,
          severity: 'high',
          limit: 25,
        })
      );
    });

    it('should parse boolean query strings correctly', async () => {
      const mockAlerts = {
        success: true,
        data: [],
      };

      vi.mocked(service.getTrackingAlerts).mockResolvedValueOnce(mockAlerts);

      await controller.getTrackingAlerts(undefined, undefined, 'true', 'false', undefined, undefined);

      expect(service.getTrackingAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          isRead: true,
          isResolved: false,
        })
      );
    });

    it('should skip isRead/isResolved filters when undefined', async () => {
      const mockAlerts = {
        success: true,
        data: [],
      };

      vi.mocked(service.getTrackingAlerts).mockResolvedValueOnce(mockAlerts);

      await controller.getTrackingAlerts(undefined, undefined, undefined, undefined, undefined, undefined);

      expect(service.getTrackingAlerts).toHaveBeenCalledWith({});
    });

    it('should parse limit string to number', async () => {
      const mockAlerts = {
        success: true,
        data: [],
      };

      vi.mocked(service.getTrackingAlerts).mockResolvedValueOnce(mockAlerts);

      await controller.getTrackingAlerts(undefined, undefined, undefined, undefined, undefined, '50');

      expect(service.getTrackingAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
        })
      );
    });

    it('should handle partial filters', async () => {
      const mockAlerts = {
        success: true,
        data: [],
      };

      vi.mocked(service.getTrackingAlerts).mockResolvedValueOnce(mockAlerts);

      await controller.getTrackingAlerts('patron', undefined, undefined, undefined, 'critical', undefined);

      expect(service.getTrackingAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'patron',
          severity: 'critical',
        })
      );
    });
  });

  describe('createTrackingAlert', () => {
    it('should create alert with user email from decorator', async () => {
      const requestBody = {
        entityType: 'member',
        entityId: 'member-123',
        entityEmail: 'john@example.com',
        alertType: 'needs_followup',
        severity: 'medium',
        title: 'Needs follow-up',
        message: 'Contact member about participation',
      };

      const mockCreatedAlert = {
        success: true,
        data: {
          id: 'alert-2',
          ...requestBody,
          isRead: false,
          isResolved: false,
          createdBy: 'admin@example.com',
          createdAt: new Date(),
        },
      };

      const user = { email: 'admin@example.com' };
      const req = createMockRequest() as never;

      vi.mocked(service.createTrackingAlert).mockResolvedValueOnce(mockCreatedAlert);

      const result = await controller.createTrackingAlert(requestBody, req, user);

      expect(result).toEqual(mockCreatedAlert);

      expect(service.createTrackingAlert).toHaveBeenCalledWith(requestBody, 'admin@example.com');
    });

    it('should pass request body as-is to service', async () => {
      const requestBody = {
        entityType: 'patron',
        entityId: 'patron-789',
        entityEmail: 'patron@example.com',
        alertType: 'conversion_opportunity',
        title: 'High potential',
        message: 'This patron has high engagement',
      };

      const user = { email: 'manager@example.com' };
      const req = createMockRequest() as never;

      vi.mocked(service.createTrackingAlert).mockResolvedValueOnce({
        success: true,
        data: {} as never,
      });

      await controller.createTrackingAlert(requestBody, req, user);

      expect(service.createTrackingAlert).toHaveBeenCalledWith(requestBody, 'manager@example.com');
    });
  });

  describe('updateTrackingAlert', () => {
    it('should update alert with correct id and user email', async () => {
      const alertId = 'alert-1';
      const requestBody = {
        isRead: true,
        isResolved: false,
      };

      const mockUpdatedAlert = {
        success: true,
        data: {
          id: alertId,
          entityType: 'member',
          entityId: 'member-123',
          entityEmail: 'john@example.com',
          alertType: 'stale',
          severity: 'high',
          title: 'No engagement',
          message: 'Member has not engaged',
          isRead: true,
          isResolved: false,
          createdAt: new Date(),
        },
      };

      const user = { email: 'admin@example.com' };
      const req = createMockRequest() as never;

      vi.mocked(service.updateTrackingAlert).mockResolvedValueOnce(mockUpdatedAlert);

      const result = await controller.updateTrackingAlert(alertId, requestBody, req, user);

      expect(result).toEqual(mockUpdatedAlert);

      expect(service.updateTrackingAlert).toHaveBeenCalledWith(alertId, requestBody, 'admin@example.com');
    });

    it('should pass request body as-is to service', async () => {
      const alertId = 'alert-2';
      const requestBody = {
        isResolved: true,
        resolutionNotes: 'Contacted member successfully',
      };

      const user = { email: 'manager@example.com' };
      const req = createMockRequest() as never;

      vi.mocked(service.updateTrackingAlert).mockResolvedValueOnce({
        success: true,
        data: {} as never,
      });

      await controller.updateTrackingAlert(alertId, requestBody, req, user);

      expect(service.updateTrackingAlert).toHaveBeenCalledWith(alertId, requestBody, user.email);
    });

    it('should handle partial updates', async () => {
      const alertId = 'alert-3';
      const requestBody = {
        isRead: true,
      };

      const user = { email: 'admin@example.com' };
      const req = createMockRequest() as never;

      vi.mocked(service.updateTrackingAlert).mockResolvedValueOnce({
        success: true,
        data: {} as never,
      });

      await controller.updateTrackingAlert(alertId, requestBody, req, user);

      expect(service.updateTrackingAlert).toHaveBeenCalledWith(alertId, requestBody, 'admin@example.com');
    });
  });

  describe('generateTrackingAlerts', () => {
    it('should call service to generate alerts', async () => {
      const mockGenerationResult = {
        success: true,
        data: {
          created: 12,
          errors: 0,
        },
        message: '12 alertes créées, 0 erreurs',
      };

      vi.mocked(service.generateTrackingAlerts).mockResolvedValueOnce(mockGenerationResult);

      const result = await controller.generateTrackingAlerts();

      expect(result).toEqual(mockGenerationResult);

      expect(service.generateTrackingAlerts).toHaveBeenCalledOnce();
    });

    it('should handle generation with errors', async () => {
      const mockGenerationResult = {
        success: true,
        data: {
          created: 8,
          errors: 2,
        },
        message: '8 alertes créées, 2 erreurs',
      };

      vi.mocked(service.generateTrackingAlerts).mockResolvedValueOnce(mockGenerationResult);

      const result = await controller.generateTrackingAlerts();

      expect(result.data.created).toBe(8);
      expect(result.data.errors).toBe(2);
      expect(result.message).toContain('2 erreurs');
    });

    it('should handle generation with no alerts', async () => {
      const mockGenerationResult = {
        success: true,
        data: {
          created: 0,
          errors: 0,
        },
        message: '0 alertes créées, 0 erreurs',
      };

      vi.mocked(service.generateTrackingAlerts).mockResolvedValueOnce(mockGenerationResult);

      const result = await controller.generateTrackingAlerts();

      expect(result.data.created).toBe(0);
    });
  });

  describe('CRUD operations integration', () => {
    it('should create, read, and update metrics', async () => {
      // Create
      const createMetricBody = {
        entityType: 'member',
        entityId: 'member-123',
        entityEmail: 'john@example.com',
        metricType: 'engagement',
        metricValue: 75,
      };

      const createdMetric = {
        success: true,
        data: {
          id: 'metric-1',
          ...createMetricBody,
          recordedBy: 'admin@example.com',
          recordedAt: new Date(),
        },
      };

      vi.mocked(service.createTrackingMetric).mockResolvedValueOnce(createdMetric);

      const user = { email: 'admin@example.com' };
      const req = createMockRequest() as never;
      const createResult = await controller.createTrackingMetric(createMetricBody, req, user);

      expect(createResult.success).toBe(true);
      expect(createResult.data.id).toBe('metric-1');

      // Read
      const getMetricsBody = {
        entityType: 'member',
        entityId: 'member-123',
      };

      const mockMetrics = {
        success: true,
        data: [createdMetric.data],
      };

      vi.mocked(service.getTrackingMetrics).mockResolvedValueOnce(mockMetrics);

      const readResult = await controller.getTrackingMetrics(
        'member',
        'member-123',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );

      expect(readResult.data).toHaveLength(1);
      expect(readResult.data[0].id).toBe('metric-1');
    });

    it('should create and update alerts', async () => {
      // Create
      const createAlertBody = {
        entityType: 'member',
        entityId: 'member-123',
        entityEmail: 'john@example.com',
        alertType: 'stale',
        severity: 'high',
        title: 'No engagement',
        message: 'Member inactive',
      };

      const createdAlert = {
        success: true,
        data: {
          id: 'alert-1',
          ...createAlertBody,
          isRead: false,
          isResolved: false,
          createdBy: 'admin@example.com',
          createdAt: new Date(),
        },
      };

      const user = { email: 'admin@example.com' };
      const req = createMockRequest() as never;

      vi.mocked(service.createTrackingAlert).mockResolvedValueOnce(createdAlert);

      const createResult = await controller.createTrackingAlert(createAlertBody, req, user);

      expect(createResult.success).toBe(true);
      expect(createResult.data.id).toBe('alert-1');
      expect(createResult.data.isRead).toBe(false);

      // Update
      const updateAlertBody = {
        isRead: true,
      };

      const updatedAlert = {
        success: true,
        data: {
          ...createdAlert.data,
          isRead: true,
        },
      };

      vi.mocked(service.updateTrackingAlert).mockResolvedValueOnce(updatedAlert);

      const updateResult = await controller.updateTrackingAlert('alert-1', updateAlertBody, req, user);

      expect(updateResult.success).toBe(true);
      expect(updateResult.data.isRead).toBe(true);
    });
  });
});
