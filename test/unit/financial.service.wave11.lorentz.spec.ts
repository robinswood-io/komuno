import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type StorageMock = {
  getFinancialComparison: ReturnType<
    typeof vi.fn<
      [{ period: string; year: number }, { period: string; year: number }],
      Promise<FailureResult>
    >
  >;
};

describe('FinancialService wave11 lorentz - getFinancialComparison fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      getFinancialComparison: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with "Unknown error" when comparison fails without error payload', async () => {
    storageMock.getFinancialComparison.mockResolvedValue({ success: false });

    await expect(service.getFinancialComparison('Q1', 2025, 'Q2', 2025)).rejects.toThrow(BadRequestException);
    await expect(service.getFinancialComparison('Q1', 2025, 'Q2', 2025)).rejects.toThrow('Unknown error');
  });
});
