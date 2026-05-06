import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface OwnershipRow {
  memberEmail: string;
  action: string;
}

describe('Wave32 Leibniz - MembersService.getMemberOwnershipHistory success forwarding', () => {
  let service: MembersService;
  let historyMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    historyMock = vi.fn();
    const mockedStorage = { instance: { getMemberOwnershipHistory: historyMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('returns success payload with ownership history data', async () => {
    const rows: OwnershipRow[] = [{ memberEmail: 'member@example.com', action: 'assigned' }];
    historyMock.mockResolvedValue({ success: true, data: rows });

    const result = await service.getMemberOwnershipHistory('member@example.com');

    expect(result).toEqual({ success: true, data: rows });
    expect(historyMock).toHaveBeenCalledWith('member@example.com');
  });
});
