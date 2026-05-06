import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface TagRow {
  id: string;
  name: string;
}

describe('Wave43 Leibniz - MembersService.getAllTags success path', () => {
  let service: MembersService;
  let getAllTagsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAllTagsMock = vi.fn();
    const mockedStorage = { instance: { getAllTags: getAllTagsMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('returns all tags when storage succeeds', async () => {
    const tags: TagRow[] = [{ id: 'tag-1', name: 'VIP' }];
    getAllTagsMock.mockResolvedValue({ success: true, data: tags });

    const result = await service.getAllTags();

    expect(result).toEqual({ success: true, data: tags });
  });
});
