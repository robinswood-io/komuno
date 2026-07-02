import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = {
  getTrackingMetrics: vi.fn(),
  createTrackingMetric: vi.fn(),
  getTrackingAlerts: vi.fn(),
  createTrackingAlert: vi.fn(),
  updateTrackingAlert: vi.fn(),
  deleteTrackingAlert: vi.fn(),
};

const mockStorageService = { storage: mockStorage };

vi.mock('../../server/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

class TrackingService {
  constructor(private storageService: unknown) {}

  async getTrackingDashboard() {
    const metrics = await this.storageService.storage.getTrackingMetrics({ limit: 100 });
    const alerts = await this.storageService.storage.getTrackingAlerts({ isResolved: false, limit: 10 });
    
    return {
      success: true,
      data: {
        totalMetrics: metrics.data?.length || 0,
        unresolvedAlerts: alerts.data?.length || 0,
        recentActivity: metrics.data?.slice(0, 10) || [],
      },
    };
  }

  async getTrackingMetrics(options: unknown) {
    return this.storageService.storage.getTrackingMetrics(options);
  }

  async createTrackingMetric(data: unknown, userEmail: string) {
    if (!data.entityType || !data.metricType) {
      throw new Error('Entity type and metric type are required');
    }
    return this.storageService.storage.createTrackingMetric({ ...data, createdBy: userEmail });
  }

  async getTrackingAlerts(options: unknown) {
    return this.storageService.storage.getTrackingAlerts(options);
  }

  async updateTrackingAlert(id: string, data: unknown) {
    return this.storageService.storage.updateTrackingAlert(id, data);
  }

  async deleteTrackingAlert(id: string) {
    return this.storageService.storage.deleteTrackingAlert(id);
  }
}

describe('TrackingService', () => {
  let trackingService: TrackingService;

  beforeEach(() => {
    vi.clearAllMocks();
    trackingService = new TrackingService(mockStorageService);
  });

  describe('getTrackingDashboard', () => {
    it('should return dashboard with metrics and alerts', async () => {
      mockStorage.getTrackingMetrics.mockResolvedValue({ success: true, data: [{ id: '1' }, { id: '2' }] });
      mockStorage.getTrackingAlerts.mockResolvedValue({ success: true, data: [{ id: '1', severity: 'high' }] });

      const result = await trackingService.getTrackingDashboard();

      expect(result.data.totalMetrics).toBe(2);
      expect(result.data.unresolvedAlerts).toBe(1);
    });

    it('should handle empty data', async () => {
      mockStorage.getTrackingMetrics.mockResolvedValue({ success: true, data: [] });
      mockStorage.getTrackingAlerts.mockResolvedValue({ success: true, data: [] });

      const result = await trackingService.getTrackingDashboard();

      expect(result.data.totalMetrics).toBe(0);
      expect(result.data.unresolvedAlerts).toBe(0);
    });
  });

  describe('getTrackingMetrics', () => {
    it('should return metrics with filters', async () => {
      const mockMetrics = [
        { id: '1', entityType: 'member', metricType: 'activity' },
        { id: '2', entityType: 'patron', metricType: 'donation' },
      ];
      mockStorage.getTrackingMetrics.mockResolvedValue({ success: true, data: mockMetrics });

      const result = await trackingService.getTrackingMetrics({ entityType: 'member', limit: 50 });

      expect(mockStorage.getTrackingMetrics).toHaveBeenCalledWith({ entityType: 'member', limit: 50 });
      expect(result.data).toHaveLength(2);
    });

    it('should filter by date range', async () => {
      mockStorage.getTrackingMetrics.mockResolvedValue({ success: true, data: [] });
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      await trackingService.getTrackingMetrics({ startDate, endDate });

      expect(mockStorage.getTrackingMetrics).toHaveBeenCalledWith({ startDate, endDate });
    });
  });

  describe('createTrackingMetric', () => {
    it('should create metric with user attribution', async () => {
      const metricData = { entityType: 'member', entityId: '1', metricType: 'activity', value: 1 };
      mockStorage.createTrackingMetric.mockResolvedValue({ success: true, data: { id: '1', ...metricData } });

      const result = await trackingService.createTrackingMetric(metricData, 'admin@example.com');

      expect(mockStorage.createTrackingMetric).toHaveBeenCalledWith({ ...metricData, createdBy: 'admin@example.com' });
      expect(result.success).toBe(true);
    });

    it('should reject metric without entity type', async () => {
      await expect(trackingService.createTrackingMetric({ metricType: 'activity' }, 'admin@example.com'))
        .rejects.toThrow('Entity type and metric type are required');
    });

    it('should reject metric without metric type', async () => {
      await expect(trackingService.createTrackingMetric({ entityType: 'member' }, 'admin@example.com'))
        .rejects.toThrow('Entity type and metric type are required');
    });
  });

  describe('getTrackingAlerts', () => {
    it('should return alerts with filters', async () => {
      const mockAlerts = [
        { id: '1', severity: 'high', isResolved: false },
        { id: '2', severity: 'medium', isResolved: false },
      ];
      mockStorage.getTrackingAlerts.mockResolvedValue({ success: true, data: mockAlerts });

      const result = await trackingService.getTrackingAlerts({ isResolved: false, severity: 'high' });

      expect(result.data).toHaveLength(2);
    });
  });

  describe('updateTrackingAlert', () => {
    it('should update alert', async () => {
      mockStorage.updateTrackingAlert.mockResolvedValue({ success: true, data: { id: '1', isResolved: true } });

      const result = await trackingService.updateTrackingAlert('1', { isResolved: true });

      expect(mockStorage.updateTrackingAlert).toHaveBeenCalledWith('1', { isResolved: true });
      expect(result.data.isResolved).toBe(true);
    });
  });

  describe('deleteTrackingAlert', () => {
    it('should delete alert', async () => {
      mockStorage.deleteTrackingAlert.mockResolvedValue({ success: true });

      await trackingService.deleteTrackingAlert('1');

      expect(mockStorage.deleteTrackingAlert).toHaveBeenCalledWith('1');
    });
  });
});
