import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave20 Leibniz - MembersService.assignTagToMember without userEmail', () => {
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

  it('assigns tag successfully when userEmail is not provided', async () => {
    const assignment = {
      id: 'assignment-1',
      memberEmail: 'member@example.com',
      tagId: '550e8400-e29b-41d4-a716-446655440000',
    };

    assignTagToMemberMock.mockResolvedValue({
      success: true,
      data: assignment,
    });

    const result = await service.assignTagToMember('member@example.com', {
      tagId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result).toEqual({ success: true, data: assignment });
    expect(assignTagToMemberMock).toHaveBeenCalledWith(
      expect.objectContaining({
        memberEmail: 'member@example.com',
        tagId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    );
  });
});
