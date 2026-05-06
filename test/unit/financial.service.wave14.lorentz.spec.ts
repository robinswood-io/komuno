import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type ReportType = 'monthly' | 'quarterly' | 'yearly';

type StorageMock = {
  getFinancialReport: ReturnType<
    typeof vi.fn<[ReportType, number, number], Promise<FailureResult>>
  >;
};

describe('FinancialService wave14 lorentz - getFinancialReport fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      getFinancialReport: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with "Unknown error" when report retrieval fails without error payload', async () => {
    storageMock.getFinancialReport.mockResolvedValue({ success: false });

    await expect(service.getFinancialReport('monthly', 6, 2026)).rejects.toThrow(BadRequestException);
    await expect(service.getFinancialReport('monthly', 6, 2026)).rejects.toThrow('Unknown error');
  });
});
