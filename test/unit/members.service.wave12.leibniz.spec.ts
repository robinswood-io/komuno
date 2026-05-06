import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave12 Leibniz - MembersService.getMemberContacts error mapping', () => {
  let service: MembersService;
  let getMemberContactsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMemberContactsMock = vi.fn();

    const mockedStorage = {
      instance: {
        getMemberContacts: getMemberContactsMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException when storage returns failure', async () => {
    getMemberContactsMock.mockResolvedValue({
      success: false,
      error: new Error('contacts lookup failed'),
    });

    await expect(service.getMemberContacts('member@example.com')).rejects.toThrow(BadRequestException);
    expect(getMemberContactsMock).toHaveBeenCalledWith('member@example.com');
  });
});
