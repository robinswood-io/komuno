import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialController } from '../../server/src/financial/financial.controller';
import { FinancialService } from '../../server/src/financial/financial.service';

type ExpensesResponse = { success: true; data: unknown[] };

type ServiceMock = {
  getExpenses: ReturnType<typeof vi.fn<[Record<string, string | number>], Promise<ExpensesResponse>>>;
};

describe('FinancialController wave16 lorentz - getExpenses full-options branch', () => {
  let controller: FinancialController;
  let serviceMock: ServiceMock;

  beforeEach(() => {
    serviceMock = {
      getExpenses: vi.fn(),
    };

    const service = serviceMock as unknown as FinancialService;
    controller = new FinancialController(service);
  });

  it('forwards all provided filters and parses year to number', async () => {
    serviceMock.getExpenses.mockResolvedValue({ success: true, data: [] });

    await controller.getExpenses('Q2', '2028', 'events', 'budget-77', '2028-04-01', '2028-06-30');

    expect(serviceMock.getExpenses).toHaveBeenCalledWith({
      period: 'Q2',
      year: 2028,
      category: 'events',
      budgetId: 'budget-77',
      startDate: '2028-04-01',
      endDate: '2028-06-30',
    });
  });
});
