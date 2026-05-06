import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave46 Leibniz - MembersService.getAllRelations unknown error fallback', () => {
  let service: MembersService;
  let allRelationsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    allRelationsMock = vi.fn().mockResolvedValue({ success: false });
    const mockedStorage = { instance: { getAllRelations: allRelationsMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('throws BadRequestException when relations fetch fails without explicit error', async () => {
    await expect(service.getAllRelations()).rejects.toThrow(BadRequestException);
  });
});
