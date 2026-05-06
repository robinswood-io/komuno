import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave13 Leibniz - MembersService.createMemberTask storage error branch', () => {
  let service: MembersService;
  let createTaskMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createTaskMock = vi.fn();

    const mockedStorage = {
      instance: {
        createTask: createTaskMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException when storage.createTask returns failure', async () => {
    createTaskMock.mockResolvedValue({
      success: false,
      error: new Error('task insert failed'),
    });

    await expect(
      service.createMemberTask(
        'member@example.com',
        { title: 'Call member', priority: 'high', taskType: 'call' },
        'admin@example.com',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(createTaskMock).toHaveBeenCalledTimes(1);
  });
});
