import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave45 Leibniz - MembersService.deleteRelation success path', () => {
  let service: MembersService;
  let deleteRelationMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleteRelationMock = vi.fn().mockResolvedValue({ success: true });
    const mockedStorage = { instance: { deleteRelation: deleteRelationMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('resolves when relation deletion succeeds', async () => {
    await expect(service.deleteRelation('rel-1')).resolves.toBeUndefined();
    expect(deleteRelationMock).toHaveBeenCalledWith('rel-1');
  });
});
