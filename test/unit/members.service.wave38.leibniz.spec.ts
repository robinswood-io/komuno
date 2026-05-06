import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave38 Leibniz - MembersService.deleteTask success path', () => {
  let service: MembersService;
  let deleteTaskMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleteTaskMock = vi.fn().mockResolvedValue({ success: true });
    const mockedStorage = { instance: { deleteTask: deleteTaskMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('completes without throwing when deleteTask succeeds', async () => {
    await expect(service.deleteTask('task-1')).resolves.toBeUndefined();
    expect(deleteTaskMock).toHaveBeenCalledWith('task-1');
  });
});
