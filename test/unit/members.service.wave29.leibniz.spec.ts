import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave29 Leibniz - MembersService.deleteTag unknown error fallback', () => {
  let service: MembersService;
  let deleteTagMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deleteTagMock = vi.fn().mockResolvedValue({ success: false });

    const mockedStorage = {
      instance: {
        deleteTag: deleteTagMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException when deleteTag fails without explicit error', async () => {
    await expect(service.deleteTag('tag-001')).rejects.toThrow(BadRequestException);
    expect(deleteTagMock).toHaveBeenCalledWith('tag-001');
  });
});
