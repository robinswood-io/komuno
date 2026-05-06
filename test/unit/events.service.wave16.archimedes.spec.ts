import { describe, expect, it, vi } from 'vitest';
import { EventsService } from '../../server/src/events/events.service';

describe('EventsService wave16 archimedes', () => {
  it('splits member name and applies event_registered score impact during inscription tracking', async () => {
    const createOrUpdateMemberMock = vi.fn(async () => ({ success: true }));
    const trackMemberActivityMock = vi.fn(async () => ({ success: true }));

    const storageService = {
      instance: {
        createInscription: vi.fn(async () => ({
          success: true as const,
          data: { id: 'insc-wave16' },
        })),
        getEvent: vi.fn(async () => ({
          success: true as const,
          data: { title: 'Event Wave16' },
        })),
        createOrUpdateMember: createOrUpdateMemberMock,
        trackMemberActivity: trackMemberActivityMock,
      },
    };

    const service = new EventsService(storageService as never);

    const result = await service.createInscription({
      eventId: '608f39d1-53a8-46f7-b52d-a1b62b85b7dc',
      name: 'Jean Claude Van',
      email: 'wave16@example.com',
      company: 'CJD Nord',
      phone: '+33611223344',
    });

    expect(result.id).toBe('insc-wave16');
    expect(createOrUpdateMemberMock).toHaveBeenCalledWith({
      email: 'wave16@example.com',
      firstName: 'Jean',
      lastName: 'Claude Van',
      company: 'CJD Nord',
      phone: '+33611223344',
    });
    expect(trackMemberActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: 'event_registered',
        entityType: 'event',
        scoreImpact: 5,
        entityTitle: 'Event Wave16',
      }),
    );
  });
});
