import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave16 Leibniz - MembersService.updateTag generic error branch', () => {
  let service: MembersService;
  let updateTagMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    updateTagMock = vi.fn();

    const mockedStorage = {
      instance: {
        updateTag: updateTagMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException when updateTag fails with non-NotFound error', async () => {
    updateTagMock.mockResolvedValue({
      success: false,
      error: new Error('write conflict'),
    });

    await expect(service.updateTag('tag-123', { name: 'VIP Gold' })).rejects.toThrow(BadRequestException);
    expect(updateTagMock).toHaveBeenCalledWith('tag-123', { name: 'VIP Gold' });
  });
});
