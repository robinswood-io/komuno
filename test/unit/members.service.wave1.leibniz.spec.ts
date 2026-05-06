import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface TaskRecord {
  id: string;
  status: 'todo' | 'in_progress' | 'completed';
  completedBy?: string;
}

interface StorageResultSuccess<T> {
  success: true;
  data: T;
}

describe('MembersService wave1 - updateTask branch coverage', () => {
  let service: MembersService;
  let storageInstance: {
    updateTask: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    storageInstance = {
      updateTask: vi.fn(),
    };

    service = new MembersService({ instance: storageInstance } as unknown as StorageService);
  });

  it('adds completedBy and normalizes dueDate null in one update path', async () => {
    const taskId = 'task-branch-1';
    const updatedTask: TaskRecord = {
      id: taskId,
      status: 'completed',
      completedBy: 'owner@example.com',
    };

    storageInstance.updateTask.mockResolvedValue({
      success: true,
      data: updatedTask,
    } satisfies StorageResultSuccess<TaskRecord>);

    const result = await service.updateTask(
      taskId,
      { status: 'completed', dueDate: null },
      'owner@example.com',
    );

    expect(result).toEqual({ success: true, data: updatedTask });
    expect(storageInstance.updateTask).toHaveBeenCalledWith(taskId, {
      status: 'completed',
      completedBy: 'owner@example.com',
      dueDate: undefined,
    });
  });

  it('preserves explicit completedBy while still normalizing dueDate null', async () => {
    const taskId = 'task-branch-2';
    const updatedTask: TaskRecord = {
      id: taskId,
      status: 'completed',
      completedBy: 'manager@example.com',
    };

    storageInstance.updateTask.mockResolvedValue({
      success: true,
      data: updatedTask,
    } satisfies StorageResultSuccess<TaskRecord>);

    const result = await service.updateTask(taskId, {
      status: 'completed',
      completedBy: 'manager@example.com',
      dueDate: null,
    });

    expect(result).toEqual({ success: true, data: updatedTask });
    expect(storageInstance.updateTask).toHaveBeenCalledWith(taskId, {
      status: 'completed',
      completedBy: 'manager@example.com',
      dueDate: undefined,
    });
  });
});
