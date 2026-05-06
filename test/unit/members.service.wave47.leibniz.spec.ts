import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface TaskRow {
  id: string;
}

describe('Wave47 Leibniz - MembersService.getAllTasks forwards filters object', () => {
  let service: MembersService;
  let allTasksMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    allTasksMock = vi.fn();
    const mockedStorage = { instance: { getAllTasks: allTasksMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('forwards status/assignedTo filters and wraps success response', async () => {
    const rows: TaskRow[] = [{ id: 'task-1' }];
    allTasksMock.mockResolvedValue({ success: true, data: rows });

    const filters = { status: 'pending', assignedTo: 'owner@example.com' };
    const result = await service.getAllTasks(filters);

    expect(allTasksMock).toHaveBeenCalledWith(filters);
    expect(result).toEqual({ success: true, data: rows });
  });
});
