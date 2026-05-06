import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave31 Leibniz - MembersService.getMemberOwnershipHistory unknown error fallback', () => {
  let service: MembersService;
  let historyMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    historyMock = vi.fn().mockResolvedValue({ success: false });
    const mockedStorage = { instance: { getMemberOwnershipHistory: historyMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException when storage fails without explicit error', async () => {
    await expect(service.getMemberOwnershipHistory('member@example.com')).rejects.toThrow(BadRequestException);
    expect(historyMock).toHaveBeenCalledWith('member@example.com');
  });
});
