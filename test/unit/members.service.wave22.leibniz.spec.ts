import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave22 Leibniz - MembersService.getMembers unknown error fallback', () => {
  let service: MembersService;
  let getMembersMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMembersMock = vi.fn().mockResolvedValue({ success: false });

    const mockedStorage = {
      instance: {
        getMembers: getMembersMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException with unknown error fallback when error is missing', async () => {
    await expect(service.getMembers()).rejects.toThrow(BadRequestException);
  });
});
