import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface TagRecord {
  id: string;
  name: string;
}

describe('Wave36 Leibniz - MembersService.getMemberTags success path', () => {
  let service: MembersService;
  let tagsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tagsMock = vi.fn();
    const mockedStorage = { instance: { getTagsByMember: tagsMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('returns member tags from storage data', async () => {
    const tags: TagRecord[] = [{ id: 'tag-1', name: 'VIP' }];
    tagsMock.mockResolvedValue({ success: true, data: tags });

    const result = await service.getMemberTags('member@example.com');

    expect(result).toEqual({ success: true, data: tags });
  });
});
