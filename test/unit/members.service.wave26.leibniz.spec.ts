import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave26 Leibniz - MembersService.getMemberDetails unknown error fallback', () => {
  let service: MembersService;
  let getMemberDetailsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMemberDetailsMock = vi.fn().mockResolvedValue({ success: false });

    const mockedStorage = {
      instance: {
        getMemberDetails: getMemberDetailsMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws NotFoundException when details lookup fails without explicit error', async () => {
    await expect(service.getMemberDetails('member@example.com')).rejects.toThrow(NotFoundException);
  });
});
