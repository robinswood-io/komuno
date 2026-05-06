import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialController } from '../../server/src/financial/financial.controller';
import { FinancialService } from '../../server/src/financial/financial.service';

type BudgetStatsResponse = {
  success: true;
  data: {
    totalBudget: number;
  };
};

type ServiceMock = {
  getBudgetStats: ReturnType<typeof vi.fn<[string | undefined, number | undefined], Promise<BudgetStatsResponse>>>;
};

describe('FinancialController wave10 lorentz - getBudgetStats parsing branch', () => {
  let controller: FinancialController;
  let serviceMock: ServiceMock;

  beforeEach(() => {
    serviceMock = {
      getBudgetStats: vi.fn(),
    };

    const service = serviceMock as unknown as FinancialService;
    controller = new FinancialController(service);
  });

  it('forwards NaN year when year query exists but is non-numeric', async () => {
    serviceMock.getBudgetStats.mockResolvedValue({
      success: true,
      data: { totalBudget: 0 },
    });

    await controller.getBudgetStats('Q4', 'oops');

    const args = serviceMock.getBudgetStats.mock.calls[0];
    expect(args[0]).toBe('Q4');
    expect(Number.isNaN(args[1])).toBe(true);
  });
});
