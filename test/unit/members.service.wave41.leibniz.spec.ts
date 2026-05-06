import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersService } from '../../server/src/members/members.service';
import type { StorageService } from '../../server/src/common/storage/storage.service';

interface ActivityRow {
  id: string;
  type: string;
}

describe('Wave41 Leibniz - MembersService.getMemberActivities success path', () => {
  let service: MembersService;
  let activitiesMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    activitiesMock = vi.fn();
    const mockedStorage = { instance: { getMemberActivities: activitiesMock } } as unknown as StorageService;
    service = new MembersService(mockedStorage);
  });

  it('returns activities payload from storage', async () => {
    const activities: ActivityRow[] = [{ id: 'act-1', type: 'email' }];
    activitiesMock.mockResolvedValue({ success: true, data: activities });

    const result = await service.getMemberActivities('member@example.com');

    expect(result).toEqual({ success: true, data: activities });
    expect(activitiesMock).toHaveBeenCalledWith('member@example.com');
  });
});
