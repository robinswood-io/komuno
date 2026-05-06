import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave34 Leibniz - MembersService.createMemberSubscription adds memberEmail', () => {
  let service: MembersService;
  let createSubscriptionMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createSubscriptionMock = vi.fn();
    const mockedStorage = { instance: { createSubscription: createSubscriptionMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('forwards validated subscription payload enriched with memberEmail', async () => {
    const created = { id: 'sub-2' };
    createSubscriptionMock.mockResolvedValue(created);

    const result = await service.createMemberSubscription('member@example.com', {
      amountInCents: 50000,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    expect(result).toEqual({ success: true, data: created });
    expect(createSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        memberEmail: 'member@example.com',
        amountInCents: 50000,
      }),
    );
  });
});
