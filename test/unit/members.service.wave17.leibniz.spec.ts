import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave17 Leibniz - MembersService.getMemberByEmail storage failure branch', () => {
  let service: MembersService;
  let getMemberByEmailMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMemberByEmailMock = vi.fn();

    const mockedStorage = {
      instance: {
        getMemberByEmail: getMemberByEmailMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws NotFoundException when storage returns success=false', async () => {
    getMemberByEmailMock.mockResolvedValue({
      success: false,
      error: new Error('lookup failed'),
    });

    await expect(service.getMemberByEmail('member@example.com')).rejects.toThrow(NotFoundException);
    expect(getMemberByEmailMock).toHaveBeenCalledWith('member@example.com');
  });
});
