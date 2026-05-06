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
  getBudgetStats: ReturnType<
    typeof vi.fn<[string | undefined, number | undefined], Promise<BudgetStatsResponse>>
  >;
};

describe('FinancialController wave20 lorentz - getBudgetStats year undefined branch', () => {
  let controller: FinancialController;
  let serviceMock: ServiceMock;

  beforeEach(() => {
    serviceMock = {
      getBudgetStats: vi.fn(),
    };

    const service = serviceMock as unknown as FinancialService;
    controller = new FinancialController(service);
  });

  it('forwards undefined year when year query is absent', async () => {
    serviceMock.getBudgetStats.mockResolvedValue({
      success: true,
      data: { totalBudget: 0 },
    });

    const result = await controller.getBudgetStats('annual', undefined);

    expect(serviceMock.getBudgetStats).toHaveBeenCalledWith('annual', undefined);
    expect(result).toEqual({ success: true, data: { totalBudget: 0 } });
  });
});
