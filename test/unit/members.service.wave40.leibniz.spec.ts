import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface RelationRow {
  id: string;
}

describe('Wave40 Leibniz - MembersService.getAllRelations success path', () => {
  let service: MembersService;
  let allRelationsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    allRelationsMock = vi.fn();
    const mockedStorage = { instance: { getAllRelations: allRelationsMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('returns all relations from storage', async () => {
    const rows: RelationRow[] = [{ id: 'rel-1' }, { id: 'rel-2' }];
    allRelationsMock.mockResolvedValue({ success: true, data: rows });

    const result = await service.getAllRelations();

    expect(result).toEqual({ success: true, data: rows });
  });
});
