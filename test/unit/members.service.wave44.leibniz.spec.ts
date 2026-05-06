import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave44 Leibniz - MembersService.deleteTag success path', () => {
  let service: MembersService;
  let deleteTagMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleteTagMock = vi.fn().mockResolvedValue({ success: true });
    const mockedStorage = { instance: { deleteTag: deleteTagMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('resolves without error when deleteTag succeeds', async () => {
    await expect(service.deleteTag('tag-1')).resolves.toBeUndefined();
    expect(deleteTagMock).toHaveBeenCalledWith('tag-1');
  });
});
