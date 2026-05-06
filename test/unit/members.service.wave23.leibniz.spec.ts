import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave23 Leibniz - MembersService.deleteMember unknown error fallback', () => {
  let service: MembersService;
  let deleteMemberMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleteMemberMock = vi.fn().mockResolvedValue({ success: false });

    const mockedStorage = {
      instance: {
        deleteMember: deleteMemberMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException when delete fails without explicit error', async () => {
    await expect(service.deleteMember('member@example.com')).rejects.toThrow(BadRequestException);
    expect(deleteMemberMock).toHaveBeenCalledWith('member@example.com');
  });
});
