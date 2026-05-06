import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave18 Leibniz - MembersService.getMemberByEmail null-data branch', () => {
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

  it('throws NotFoundException when storage succeeds but returns null data', async () => {
    getMemberByEmailMock.mockResolvedValue({
      success: true,
      data: null,
    });

    await expect(service.getMemberByEmail('missing@example.com')).rejects.toThrow(NotFoundException);
    expect(getMemberByEmailMock).toHaveBeenCalledWith('missing@example.com');
  });
});
