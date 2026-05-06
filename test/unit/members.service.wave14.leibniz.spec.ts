import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave14 Leibniz - MembersService.assignTagToMember storage failure branch', () => {
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

  it('throws BadRequestException when storage fails after payload validation', async () => {
    assignTagToMemberMock.mockResolvedValue({
      success: false,
      error: new Error('assignment failed'),
    });

    await expect(
      service.assignTagToMember(
        'member@example.com',
        { tagId: '550e8400-e29b-41d4-a716-446655440000' },
        'admin@example.com',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(assignTagToMemberMock).toHaveBeenCalledWith({
      memberEmail: 'member@example.com',
      tagId: '550e8400-e29b-41d4-a716-446655440000',
      assignedBy: 'admin@example.com',
    });
  });
});
