import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialController } from '../../server/src/financial/financial.controller';
import { FinancialService } from '../../server/src/financial/financial.service';

type ExpenseStatsResponse = {
  success: true;
  data: {
    totalExpenses: number;
  };
};

type ServiceMock = {
  getExpenseStats: ReturnType<
    typeof vi.fn<[string | undefined, number | undefined], Promise<ExpenseStatsResponse>>
  >;
};

describe('FinancialController wave7 lorentz - getExpenseStats year undefined branch', () => {
  let controller: FinancialController;
  let serviceMock: ServiceMock;

  beforeEach(() => {
    serviceMock = {
      getExpenseStats: vi.fn(),
    };

    const service = serviceMock as unknown as FinancialService;
    controller = new FinancialController(service);
  });

  it('forwards undefined year when year query is absent', async () => {
    serviceMock.getExpenseStats.mockResolvedValue({
      success: true,
      data: { totalExpenses: 0 },
    });

    const result = await controller.getExpenseStats('Q3', undefined);

    expect(serviceMock.getExpenseStats).toHaveBeenCalledWith('Q3', undefined);
    expect(result).toEqual({ success: true, data: { totalExpenses: 0 } });
  });
});
