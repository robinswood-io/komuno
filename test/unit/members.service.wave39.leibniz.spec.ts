import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface RelationRow {
  id: string;
  relationType: string;
}

describe('Wave39 Leibniz - MembersService.getMemberRelations success path', () => {
  let service: MembersService;
  let relationsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    relationsMock = vi.fn();
    const mockedStorage = { instance: { getRelationsByMember: relationsMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('returns relations payload on success', async () => {
    const rows: RelationRow[] = [{ id: 'rel-1', relationType: 'mentor' }];
    relationsMock.mockResolvedValue({ success: true, data: rows });

    const result = await service.getMemberRelations('member@example.com');

    expect(result).toEqual({ success: true, data: rows });
    expect(relationsMock).toHaveBeenCalledWith('member@example.com');
  });
});
