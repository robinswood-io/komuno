import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialService } from '../../server/src/financial/financial.service';
import { StorageService } from '../../server/src/common/storage/storage.service';

type StorageMock = {
  updateRevenue: ReturnType<typeof vi.fn<[string, unknown], Promise<{ success: true; data: { id: string } }>>>;
};

describe('FinancialService wave39 lorentz - updateRevenue zod-validation branch', () => {
  let service: FinancialService;
  let storageMock: StorageMock;

  beforeEach(() => {
    storageMock = { updateRevenue: vi.fn() };
    const storageService = { instance: storageMock } as unknown as StorageService;
    service = new FinancialService(storageService);
  });

  it('throws TypeError and does not call storage when payload is invalid', async () => {
    await expect(service.updateRevenue('rev-7', undefined)).rejects.toThrow(TypeError);
    expect(storageMock.updateRevenue).not.toHaveBeenCalled();
  });
});
