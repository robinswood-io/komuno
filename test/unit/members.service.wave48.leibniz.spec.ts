import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface ContactRow {
  id: string;
  type: string;
}

describe('Wave48 Leibniz - MembersService.getMemberContacts success path', () => {
  let service: MembersService;
  let contactsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    contactsMock = vi.fn();
    const mockedStorage = { instance: { getMemberContacts: contactsMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('returns member contacts when storage succeeds', async () => {
    const rows: ContactRow[] = [{ id: 'contact-1', type: 'email' }];
    contactsMock.mockResolvedValue({ success: true, data: rows });

    const result = await service.getMemberContacts('member@example.com');

    expect(result).toEqual({ success: true, data: rows });
  });
});
