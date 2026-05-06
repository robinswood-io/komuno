import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave19 Leibniz - MembersService.getMemberActivities error mapping', () => {
  let service: MembersService;
  let getMemberActivitiesMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMemberActivitiesMock = vi.fn();

    const mockedStorage = {
      instance: {
        getMemberActivities: getMemberActivitiesMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException when storage returns success=false', async () => {
    getMemberActivitiesMock.mockResolvedValue({
      success: false,
      error: new Error('activities query failed'),
    });

    await expect(service.getMemberActivities('member@example.com')).rejects.toThrow(BadRequestException);
    expect(getMemberActivitiesMock).toHaveBeenCalledWith('member@example.com');
  });
});
