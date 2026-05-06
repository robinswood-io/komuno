import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave35 Leibniz - MembersService.removeTagFromMember success path', () => {
  let service: MembersService;
  let removeTagMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    removeTagMock = vi.fn().mockResolvedValue({ success: true });
    const mockedStorage = { instance: { removeTagFromMember: removeTagMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('completes without throwing and calls storage', async () => {
    await expect(service.removeTagFromMember('member@example.com', 'tag-001')).resolves.toBeUndefined();
    expect(removeTagMock).toHaveBeenCalledWith('member@example.com', 'tag-001');
  });
});
