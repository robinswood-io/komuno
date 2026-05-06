import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave24 Leibniz - MembersService.getMemberByEmail storage failure fallback', () => {
  let service: MembersService;
  let getMemberByEmailMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMemberByEmailMock = vi.fn().mockResolvedValue({ success: false });

    const mockedStorage = {
      instance: {
        getMemberByEmail: getMemberByEmailMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws NotFoundException when storage returns success=false without error', async () => {
    await expect(service.getMemberByEmail('ghost@example.com')).rejects.toThrow(NotFoundException);
  });
});
