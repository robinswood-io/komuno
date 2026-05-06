import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialController } from '../../server/src/financial/financial.controller';
import { FinancialService } from '../../server/src/financial/financial.service';

type ExpensesResponse = { success: true; data: unknown[] };

type ServiceMock = {
  getExpenses: ReturnType<typeof vi.fn<[Record<string, string | number>], Promise<ExpensesResponse>>>;
};

describe('FinancialController wave12 lorentz - getExpenses year parsing branch', () => {
  let controller: FinancialController;
  let serviceMock: ServiceMock;

  beforeEach(() => {
    serviceMock = {
      getExpenses: vi.fn(),
    };

    const service = serviceMock as unknown as FinancialService;
    controller = new FinancialController(service);
  });

  it('forwards NaN year when year query exists but is non-numeric', async () => {
    serviceMock.getExpenses.mockResolvedValue({ success: true, data: [] });

    await controller.getExpenses(undefined, 'abc', undefined, undefined, undefined, undefined);

    const options = serviceMock.getExpenses.mock.calls[0]?.[0];
    expect(options).toHaveProperty('year');
    expect(Number.isNaN(options.year)).toBe(true);
  });
});
