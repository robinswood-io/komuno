import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface SubscriptionRecord {
  id: string;
  memberEmail: string;
}

describe('Wave33 Leibniz - MembersService.getMemberSubscriptions passthrough', () => {
  let service: MembersService;
  let getSubscriptionsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getSubscriptionsMock = vi.fn();
    const mockedStorage = { instance: { getSubscriptionsByMember: getSubscriptionsMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('wraps storage array into success response', async () => {
    const subscriptions: SubscriptionRecord[] = [{ id: 'sub-1', memberEmail: 'member@example.com' }];
    getSubscriptionsMock.mockResolvedValue(subscriptions);

    const result = await service.getMemberSubscriptions('member@example.com');

    expect(result).toEqual({ success: true, data: subscriptions });
    expect(getSubscriptionsMock).toHaveBeenCalledWith('member@example.com');
  });
});
