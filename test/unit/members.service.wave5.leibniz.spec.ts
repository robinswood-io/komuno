import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave5 Leibniz - MembersService.deleteMember NotFound branch', () => {
  let service: MembersService;
  let deleteMemberMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleteMemberMock = vi.fn();

    const mockedStorage = {
      instance: {
        deleteMember: deleteMemberMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws NotFoundException when storage returns NotFoundError', async () => {
    const notFoundError = new Error('Member not found');
    notFoundError.name = 'NotFoundError';

    deleteMemberMock.mockResolvedValue({
      success: false,
      error: notFoundError,
    });

    await expect(service.deleteMember('ghost@example.com')).rejects.toThrow(NotFoundException);
    expect(deleteMemberMock).toHaveBeenCalledWith('ghost@example.com');
  });
});
