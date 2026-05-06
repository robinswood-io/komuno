import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface MemberDetails {
  id: string;
  email: string;
}

describe('Wave42 Leibniz - MembersService.getMemberDetails success path', () => {
  let service: MembersService;
  let detailsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    detailsMock = vi.fn();
    const mockedStorage = { instance: { getMemberDetails: detailsMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('returns member details when storage succeeds', async () => {
    const details: MemberDetails = { id: 'member-1', email: 'member@example.com' };
    detailsMock.mockResolvedValue({ success: true, data: details });

    const result = await service.getMemberDetails('member@example.com');

    expect(result).toEqual({ success: true, data: details });
  });
});
