import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type FailureResult = { success: false; error: Error };

type StorageMock = {
  assignSubscriptionToMember: ReturnType<typeof vi.fn<[unknown], Promise<FailureResult>>>;
};

describe('FinancialService wave29 lorentz - assignSubscriptionToMember explicit-error branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { assignSubscriptionToMember: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws BadRequestException when assignment fails with explicit error', async () => {
    storageMock.assignSubscriptionToMember.mockResolvedValue({ success: false, error: new Error('Affectation impossible') });

    await expect(service.assignSubscriptionToMember({ memberId: 'm1', typeId: 't1' })).rejects.toThrow(BadRequestException);
    await expect(service.assignSubscriptionToMember({ memberId: 'm1', typeId: 't1' })).rejects.toThrow('Affectation impossible');
  });
});
