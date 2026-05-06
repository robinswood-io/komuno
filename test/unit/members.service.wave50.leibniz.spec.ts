import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave50 Leibniz - MembersService.deleteMemberContact unknown error fallback', () => {
  let service: MembersService;
  let deleteContactMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleteContactMock = vi.fn().mockResolvedValue({ success: false });
    const mockedStorage = { instance: { deleteMemberContact: deleteContactMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException when deletion fails without explicit error object', async () => {
    await expect(service.deleteMemberContact('contact-1')).rejects.toThrow(BadRequestException);
  });
});
