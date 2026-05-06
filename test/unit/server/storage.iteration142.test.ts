import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';
describe('server/storage.js iteration 142', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateEvent propagates getEvent failure result', async () => {
    const storage = createStorage();
    const upstreamError = new Error('get-event-failed');
    vi.spyOn(storage, 'getEvent').mockResolvedValue({ success: false, error: upstreamError });

    const result = await storage.updateEvent('evt-142-a', { title: 'Updated' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
  });

  it('updateEvent returns NotFoundError when event is missing', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'getEvent').mockResolvedValue({ success: true, data: null });

    const result = await storage.updateEvent('evt-142-b', { title: 'Updated' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
    }
  });

  it('updateEvent rejects non-future date updates', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: { id: 'evt-142-c', title: 'Event', date: new Date('2099-01-01T00:00:00.000Z') },
    });

    const result = await storage.updateEvent('evt-142-c', { date: '2000-01-01T00:00:00.000Z' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('doit être dans le futur');
    }
  });

  it('updateEvent wraps missing updated row into DatabaseError', async () => {
    const storage = createStorage();
    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: { id: 'evt-142-d', title: 'Event', date: new Date('2099-01-01T00:00:00.000Z') },
    });

    type UpdateTx = {
      update: (table: unknown) => {
        set: (values: Record<string, unknown>) => {
          where: (clause: unknown) => {
            returning: () => Promise<unknown[]>;
          };
        };
      };
    };

    mockDb.transaction.mockImplementation(async (cb: (tx: UpdateTx) => Promise<unknown>) => {
      const tx = {
        update: vi.fn(() => {
          return {
            set: vi.fn(() => {
              return {
                where: vi.fn(() => {
                  return {
                    returning: vi.fn(async () => [undefined]),
                  };
                }),
              };
            }),
          };
        }),
      };

      return cb(tx);
    });

    const result = await storage.updateEvent('evt-142-d', { title: 'X' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Aucune ligne mise à jour');
    }
  });

  it('createInscription enforces participant limit using getEventInscriptions count', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'hasUserRegistered').mockResolvedValue(false);
    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: { id: 'evt-142-e', maxParticipants: 1 },
    });
    vi.spyOn(storage, 'getEventInscriptions').mockResolvedValue({
      success: true,
      data: [{ id: 'insc-existing' }],
    });

    const result = await storage.createInscription({
      eventId: 'evt-142-e',
      name: 'Test User',
      email: 'test142@example.com',
      company: 'Komuno',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('événement est complet');
    }
  });
});
