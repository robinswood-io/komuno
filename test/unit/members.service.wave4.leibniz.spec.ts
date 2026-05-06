import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave4 Leibniz - MembersService.updateTag error mapping branch', () => {
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

  it('maps non-NotFound storage errors to BadRequestException', async () => {
    updateTagMock.mockResolvedValue({
      success: false,
      error: new Error('database write failed'),
    });

    await expect(service.updateTag('tag-001', { name: 'Nouveau nom' })).rejects.toThrow(BadRequestException);
    expect(updateTagMock).toHaveBeenCalledWith('tag-001', { name: 'Nouveau nom' });
  });
});
