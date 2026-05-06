import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave11 Leibniz - MembersService.assignTagToMember validation branch', () => {
  let service: MembersService;
  let assignTagToMemberMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    assignTagToMemberMock = vi.fn();

    const mockedStorage = {
      instance: {
        assignTagToMember: assignTagToMemberMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException when payload is invalid and skips storage call', async () => {
    await expect(
      service.assignTagToMember('member@example.com', { tagId: 'invalid-tag-id' }, 'admin@example.com'),
    ).rejects.toThrow(BadRequestException);

    expect(assignTagToMemberMock).not.toHaveBeenCalled();
  });
});
