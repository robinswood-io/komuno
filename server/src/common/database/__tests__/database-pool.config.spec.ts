import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type PoolStatus = 'healthy' | 'warning' | 'critical';

interface TestPoolStats {
  totalCount: number;
  idleCount: number;
  activeCount: number;
  waitingCount: number;
  provider: 'neon' | 'standard';
  minConnections: number;
  maxConnections: number;
  utilization: {
    percent: number;
    status: PoolStatus;
  };
  availableConnections: number;
  availableFromIdle: number;
  warning: {
    threshold: number;
    current: number;
    breached: boolean;
  };
  critical: {
    threshold: number;
    current: number;
    breached: boolean;
  };
}

type PoolStatsOverrides = Omit<
  Partial<TestPoolStats>,
  'utilization' | 'warning' | 'critical'
> & {
  utilization?: Partial<TestPoolStats['utilization']>;
  warning?: Partial<TestPoolStats['warning']>;
  critical?: Partial<TestPoolStats['critical']>;
};

const getPoolStatsMock = vi.hoisted(() => vi.fn<() => TestPoolStats>());
const loggerSpies = vi.hoisted(() => ({
  error: vi.fn<(message: string, payload?: unknown) => void>(),
  warn: vi.fn<(message: string, payload?: unknown) => void>(),
  info: vi.fn<(message: string, payload?: unknown) => void>(),
  debug: vi.fn<(message: string, payload?: unknown) => void>(),
}));

vi.mock('../../../../db.js', () => ({
  getPoolStats: getPoolStatsMock,
}));

vi.mock('../../../../lib/logger.js', () => ({
  logger: loggerSpies,
}));

import { getPoolStats } from '../../../../db.js';
import {
  checkPoolHealth,
  enrichContextWithPoolStats,
  getAdditionalTimeout,
  getAvailableConnections,
  getPoolMetrics,
  getPoolSummary,
  getPoolUtilizationPercent,
  isPoolCritical,
  isPoolHealthy,
  isPoolWarning,
  startPoolMonitoring,
  suggestTimeout,
} from '../../../../utils/database-config.utils.ts';

const createPoolStats = (overrides: PoolStatsOverrides = {}): TestPoolStats => {
  const base: TestPoolStats = {
    totalCount: 5,
    idleCount: 2,
    activeCount: 3,
    waitingCount: 0,
    provider: 'standard',
    minConnections: 2,
    maxConnections: 10,
    utilization: {
      percent: 30,
      status: 'healthy',
    },
    availableConnections: 5,
    availableFromIdle: 2,
    warning: {
      threshold: 7,
      current: 3,
      breached: false,
    },
    critical: {
      threshold: 9,
      current: 3,
      breached: false,
    },
  };

  return {
    ...base,
    ...overrides,
    utilization: {
      ...base.utilization,
      ...overrides.utilization,
    },
    warning: {
      ...base.warning,
      ...overrides.warning,
    },
    critical: {
      ...base.critical,
      ...overrides.critical,
    },
  };
};

describe('Database Pool Configuration', () => {
  const mockedGetPoolStats = vi.mocked(getPoolStats);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockedGetPoolStats.mockReturnValue(createPoolStats());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkPoolHealth()', () => {
    it('returns critical alert and logs error when critical threshold is breached', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          waitingCount: 4,
          warning: { breached: true },
          critical: { breached: true },
          utilization: { percent: 95, status: 'critical' },
        })
      );

      const alert = checkPoolHealth();

      expect(alert).not.toBeNull();
      expect(alert?.severity).toBe('critical');
      expect(alert?.waitingRequests).toBe(4);
      expect(loggerSpies.error).toHaveBeenCalledTimes(1);
      expect(loggerSpies.warn).not.toHaveBeenCalled();
      expect(loggerSpies.info).not.toHaveBeenCalled();
    });

    it('returns warning alert and logs warning when warning threshold is breached', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          warning: { breached: true },
          critical: { breached: false },
          utilization: { percent: 80, status: 'warning' },
        })
      );

      const alert = checkPoolHealth();

      expect(alert).not.toBeNull();
      expect(alert?.severity).toBe('warning');
      expect(loggerSpies.warn).toHaveBeenCalledTimes(1);
      expect(loggerSpies.error).not.toHaveBeenCalled();
      expect(loggerSpies.info).not.toHaveBeenCalled();
    });

    it('returns info alert and logs info when requests are waiting', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          waitingCount: 2,
          warning: { breached: false },
          critical: { breached: false },
        })
      );

      const alert = checkPoolHealth();

      expect(alert).toEqual(
        expect.objectContaining({
          severity: 'info',
          waitingRequests: 2,
        })
      );
      expect(loggerSpies.info).toHaveBeenCalledTimes(1);
      expect(loggerSpies.warn).not.toHaveBeenCalled();
      expect(loggerSpies.error).not.toHaveBeenCalled();
    });

    it('returns null when pool has no warning, critical, or waiting signal', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          waitingCount: 0,
          warning: { breached: false },
          critical: { breached: false },
        })
      );

      const alert = checkPoolHealth();

      expect(alert).toBeNull();
      expect(loggerSpies.info).not.toHaveBeenCalled();
      expect(loggerSpies.warn).not.toHaveBeenCalled();
      expect(loggerSpies.error).not.toHaveBeenCalled();
    });
  });

  describe('formatted helpers', () => {
    it('builds summary with active/max utilization, idle and waiting', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          activeCount: 6,
          maxConnections: 12,
          idleCount: 4,
          waitingCount: 1,
          utilization: { percent: 50 },
        })
      );

      expect(getPoolSummary()).toBe('Pool 6/12 (50%) | 4 idle, 1 waiting');
    });

    it('maps pool metrics fields and formats utilization as percentage string', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          totalCount: 8,
          activeCount: 7,
          idleCount: 1,
          waitingCount: 3,
          minConnections: 2,
          maxConnections: 12,
          availableConnections: 4,
          utilization: { percent: 58.5, status: 'warning' },
        })
      );

      expect(getPoolMetrics()).toEqual({
        total: 8,
        active: 7,
        idle: 1,
        waiting: 3,
        max: 12,
        min: 2,
        utilization: '58.5%',
        status: 'warning',
        available: 4,
      });
    });
  });

  describe('state helpers', () => {
    it('isPoolCritical mirrors critical breach flag', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({ critical: { breached: true } })
      );
      expect(isPoolCritical()).toBe(true);

      mockedGetPoolStats.mockReturnValue(
        createPoolStats({ critical: { breached: false } })
      );
      expect(isPoolCritical()).toBe(false);
    });

    it('isPoolWarning is true only when warning is breached and critical is not breached', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          warning: { breached: true },
          critical: { breached: false },
        })
      );
      expect(isPoolWarning()).toBe(true);

      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          warning: { breached: true },
          critical: { breached: true },
        })
      );
      expect(isPoolWarning()).toBe(false);
    });

    it('isPoolHealthy returns false when warning is breached, true otherwise', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({ warning: { breached: false } })
      );
      expect(isPoolHealthy()).toBe(true);

      mockedGetPoolStats.mockReturnValue(
        createPoolStats({ warning: { breached: true } })
      );
      expect(isPoolHealthy()).toBe(false);
    });
  });

  describe('simple accessors', () => {
    it('returns available connections', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({ availableConnections: 7 })
      );

      expect(getAvailableConnections()).toBe(7);
    });

    it('returns pool utilization percent', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({ utilization: { percent: 42.4 } })
      );

      expect(getPoolUtilizationPercent()).toBe(42.4);
    });
  });

  describe('timeout helpers', () => {
    it('getAdditionalTimeout returns 3000 when utilization is above 80', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({ utilization: { percent: 81 } })
      );

      expect(getAdditionalTimeout()).toBe(3000);
    });

    it('getAdditionalTimeout returns 1000 when utilization is above 60 and at most 80', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({ utilization: { percent: 61 } })
      );

      expect(getAdditionalTimeout()).toBe(1000);
    });

    it('getAdditionalTimeout returns 0 when utilization is 60 or less', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({ utilization: { percent: 60 } })
      );

      expect(getAdditionalTimeout()).toBe(0);
    });

    it('suggestTimeout adds adaptive timeout to each profile base timeout', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({ utilization: { percent: 85 } })
      );

      expect(suggestTimeout('quick')).toBe(5000);
      expect(suggestTimeout('normal')).toBe(8000);
      expect(suggestTimeout('complex')).toBe(13000);
      expect(suggestTimeout('background')).toBe(18000);
    });
  });

  describe('context and monitoring', () => {
    it('enriches context with poolStats field while preserving original fields', () => {
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          totalCount: 9,
          activeCount: 6,
          idleCount: 3,
          waitingCount: 2,
          minConnections: 1,
          maxConnections: 10,
          availableConnections: 1,
          utilization: { percent: 60, status: 'warning' },
        })
      );

      const context = enrichContextWithPoolStats({
        requestId: 'req-123',
        scope: 'unit-test',
      });

      expect(context.requestId).toBe('req-123');
      expect(context.scope).toBe('unit-test');
      expect(context.poolStats).toEqual({
        total: 9,
        active: 6,
        idle: 3,
        waiting: 2,
        max: 10,
        min: 1,
        utilization: '60%',
        status: 'warning',
        available: 1,
      });
    });

    it('startPoolMonitoring logs debug metrics when there is no alert', () => {
      vi.useFakeTimers();
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          warning: { breached: false },
          critical: { breached: false },
          waitingCount: 0,
        })
      );

      const timer = startPoolMonitoring(1000);
      vi.advanceTimersByTime(1000);

      expect(loggerSpies.debug).toHaveBeenCalledTimes(1);
      clearInterval(timer);
    });

    it('startPoolMonitoring does not log debug metrics when an alert is emitted', () => {
      vi.useFakeTimers();
      mockedGetPoolStats.mockReturnValue(
        createPoolStats({
          critical: { breached: true },
          warning: { breached: true },
          utilization: { percent: 97, status: 'critical' },
        })
      );

      const timer = startPoolMonitoring(1000);
      vi.advanceTimersByTime(1000);

      expect(loggerSpies.error).toHaveBeenCalledTimes(1);
      expect(loggerSpies.debug).not.toHaveBeenCalled();
      clearInterval(timer);
    });
  });
});
