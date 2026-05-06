import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave15 Leibniz - MembersService.removeTagFromMember failure branch', () => {
  let service: MembersService;
  let removeTagFromMemberMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    removeTagFromMemberMock = vi.fn();

    const mockedStorage = {
      instance: {
        removeTagFromMember: removeTagFromMemberMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('maps storage failure to BadRequestException', async () => {
    removeTagFromMemberMock.mockResolvedValue({
      success: false,
      error: new Error('remove failed'),
    });

    await expect(service.removeTagFromMember('member@example.com', 'tag-001')).rejects.toThrow(BadRequestException);
    expect(removeTagFromMemberMock).toHaveBeenCalledWith('member@example.com', 'tag-001');
  });
});
