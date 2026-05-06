import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave48 archimedes', () => {
  it('stores empty lastName when inscription name contains a single word', async () => {
    const createOrUpdateMemberMock = vi.fn(async () => ({ success: true }));

    const storageService = {
      instance: {
        createInscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'insc-wave48' },
        })),
        getEvent: vi.fn(async () => ({
          success: true as const,
          data: { title: 'Event Wave48' },
        })),
        createOrUpdateMember: createOrUpdateMemberMock,
        trackMemberActivity: vi.fn(async () => ({ success: true })),
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createInscription({
      eventId: 'e4f4b9a4-0a13-454f-98d4-d37eab8e2217',
      name: 'Mononym',
      email: 'wave48@example.com',
    });

    expect(result.id).toBe('insc-wave48');
    expect(createOrUpdateMemberMock).toHaveBeenCalledWith({
      email: 'wave48@example.com',
      firstName: 'Mononym',
      lastName: '',
      company: undefined,
      phone: undefined,
    });
  });
});
