import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave30 Leibniz - MembersService.getAllTasks forwards undefined filters', () => {
  let service: MembersService;
  let getAllTasksMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getAllTasksMock = vi.fn().mockResolvedValue({
      success: true,
      data: [],
    });

    const mockedStorage = {
      instance: {
        getAllTasks: getAllTasksMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('calls storage with undefined filters and returns success payload', async () => {
    const result = await service.getAllTasks();

    expect(getAllTasksMock).toHaveBeenCalledWith(undefined);
    expect(result).toEqual({ success: true, data: [] });
  });
});
