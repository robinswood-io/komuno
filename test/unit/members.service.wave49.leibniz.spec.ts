import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave49 Leibniz - MembersService.deleteMemberContact NotFound mapping', () => {
  let service: MembersService;
  let deleteContactMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleteContactMock = vi.fn();
    const mockedStorage = { instance: { deleteMemberContact: deleteContactMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('throws NotFoundException when storage returns NotFoundError', async () => {
    const notFoundError = new Error('contact missing');
    notFoundError.name = 'NotFoundError';

    deleteContactMock.mockResolvedValue({ success: false, error: notFoundError });

    await expect(service.deleteMemberContact('contact-404')).rejects.toThrow(NotFoundException);
    expect(deleteContactMock).toHaveBeenCalledWith('contact-404');
  });
});
