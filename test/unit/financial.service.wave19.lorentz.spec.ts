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

describe('FinancialController wave19 lorentz - getExpenseStats parsing branch', () => {
  let controller: FinancialController;
  let serviceMock: ServiceMock;

  beforeEach(() => {
    serviceMock = {
      getExpenseStats: vi.fn(),
    };

    const service = serviceMock as unknown as FinancialService;
    controller = new FinancialController(service);
  });

  it('forwards NaN year when year query exists but is non-numeric', async () => {
    serviceMock.getExpenseStats.mockResolvedValue({
      success: true,
      data: { totalExpenses: 0 },
    });

    await controller.getExpenseStats('Q1', 'invalid-year');

    const args = serviceMock.getExpenseStats.mock.calls[0];
    expect(args[0]).toBe('Q1');
    expect(Number.isNaN(args[1])).toBe(true);
  });
});
