import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error?: Error };

type StorageMock = {
  getDashboardOverview: ReturnType<typeof vi.fn<[number | undefined], Promise<FailureResult>>>;
};

describe('FinancialService wave17 lorentz - getDashboardOverview fallback branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      getDashboardOverview: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('throws BadRequestException with "Unknown error" when dashboard retrieval fails without error payload', async () => {
    storageMock.getDashboardOverview.mockResolvedValue({ success: false });

    await expect(service.getDashboardOverview(2028)).rejects.toThrow(BadRequestException);
    await expect(service.getDashboardOverview(2028)).rejects.toThrow('Unknown error');
  });
});
