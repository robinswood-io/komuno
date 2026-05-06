import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type SuccessResult<T> = { success: true; data: T };
type FailureResult = { success: false; error?: Error };

type SubscriptionType = {
  id: string;
  name: string;
  amountInCents: number;
  durationMonths: number;
  isActive: boolean;
};

type StorageMock = {
  getSubscriptionTypes: ReturnType<typeof vi.fn<[boolean], Promise<SuccessResult<SubscriptionType[]> | FailureResult>>>;
  getSubscriptionTypeById: ReturnType<typeof vi.fn<[string], Promise<SuccessResult<SubscriptionType> | FailureResult>>>;
};

describe('FinancialService wave1 lorentz - targeted branches', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = {
      getSubscriptionTypes: vi.fn(),
      getSubscriptionTypeById: vi.fn(),
    };

    const storageService = {
      instance: storageMock,
    } as unknown as StorageService;

    service = new FinancialService(storageService);
  });

  it('uses includeInactive=false by default for getSubscriptionTypes success path', async () => {
    storageMock.getSubscriptionTypes.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'sub-type-1',
          name: 'Membre actif',
          amountInCents: 3000,
          durationMonths: 12,
          isActive: true,
        },
      ],
    });

    const result = await service.getSubscriptionTypes();

    expect(storageMock.getSubscriptionTypes).toHaveBeenCalledWith(false);
    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 'sub-type-1',
          name: 'Membre actif',
          amountInCents: 3000,
          durationMonths: 12,
          isActive: true,
        },
      ],
    });
  });

  it('throws BadRequestException with fallback message when getSubscriptionTypes fails without error property', async () => {
    storageMock.getSubscriptionTypes.mockResolvedValue({ success: false });

    await expect(service.getSubscriptionTypes(true)).rejects.toThrow(BadRequestException);
    await expect(service.getSubscriptionTypes(true)).rejects.toThrow('Unknown error');
  });

  it('throws NotFoundException with fallback message when getSubscriptionTypeById fails without error property', async () => {
    storageMock.getSubscriptionTypeById.mockResolvedValue({ success: false });

    await expect(service.getSubscriptionTypeById('missing-id')).rejects.toThrow(NotFoundException);
    await expect(service.getSubscriptionTypeById('missing-id')).rejects.toThrow('Unknown error');
  });
});
