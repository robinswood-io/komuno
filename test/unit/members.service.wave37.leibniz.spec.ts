import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface TaskRow {
  id: string;
  status: string;
}

describe('Wave37 Leibniz - MembersService.getMemberTasks success path', () => {
  let service: MembersService;
  let tasksMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tasksMock = vi.fn();
    const mockedStorage = { instance: { getTasksByMember: tasksMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('returns tasks payload from storage', async () => {
    const rows: TaskRow[] = [{ id: 'task-1', status: 'pending' }];
    tasksMock.mockResolvedValue({ success: true, data: rows });

    const result = await service.getMemberTasks('member@example.com');

    expect(result).toEqual({ success: true, data: rows });
    expect(tasksMock).toHaveBeenCalledWith('member@example.com');
  });
});
