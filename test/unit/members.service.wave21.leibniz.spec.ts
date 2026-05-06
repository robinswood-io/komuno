import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

describe('Wave21 Leibniz - MembersService.getMembers forwards both prospects flags', () => {
  let service: MembersService;
  let getMembersMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMembersMock = vi.fn().mockResolvedValue({
      success: true,
      data: {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        pageCount: 0,
      },
    });

    const mockedStorage = {
      instance: {
        getMembers: getMembersMock,
      },
    } as unknown as StorageService;

    service = new MembersService(mockedStorage);
  });

  it('passes onlyProspects and excludeProspects when both are true', async () => {
    await service.getMembers(3, 25, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true, true);

    expect(getMembersMock).toHaveBeenCalledWith({
      page: 3,
      limit: 25,
      onlyProspects: true,
      excludeProspects: true,
    });
  });
});
