import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialController } from '../../server/src/financial/financial.controller';
import { FinancialService } from '../../server/src/financial/financial.service';

type BudgetsResponse = { success: true; data: unknown[] };

type ServiceMock = {
  getBudgets: ReturnType<typeof vi.fn<[Record<string, string | number>], Promise<BudgetsResponse>>>;
};

describe('FinancialController wave4 lorentz - getBudgets parsing branch', () => {
  let controller: FinancialController;
  let serviceMock: ServiceMock;

  beforeEach(() => {
    serviceMock = {
      getBudgets: vi.fn(),
    };

    const service = serviceMock as unknown as FinancialService;
    controller = new FinancialController(service);
  });

  it('propagates NaN year when year query is non-numeric but present', async () => {
    serviceMock.getBudgets.mockResolvedValue({ success: true, data: [] });

    await controller.getBudgets(undefined, 'not-a-number', undefined);

    const options = serviceMock.getBudgets.mock.calls[0]?.[0];
    expect(options).toHaveProperty('year');
    expect(Number.isNaN(options.year)).toBe(true);
  });
});
