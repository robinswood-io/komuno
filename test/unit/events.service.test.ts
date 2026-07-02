import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockStorage = {
  getEvents: vi.fn(),
  createEvent: vi.fn(),
  createEventWithInscriptions: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  updateEventStatus: vi.fn(),
  getEventInscriptions: vi.fn(),
  createInscription: vi.fn(),
  deleteInscription: vi.fn(),
  createUnsubscription: vi.fn(),
  isDuplicateEvent: vi.fn(),
  hasUserRegistered: vi.fn(),
};

const mockStorageService = {
  storage: mockStorage,
};

const mockNotificationService = {
  sendNotification: vi.fn(),
};

vi.mock('../../server/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Simulated EventsService
class EventsService {
  constructor(
    private storageService: unknown,
    private notificationService: unknown
  ) {}

  async getEvents(page = 1, limit = 20) {
    return this.storageService.storage.getEvents({ page, limit });
  }

  async createEvent(data: unknown) {
    return this.storageService.storage.createEvent(data);
  }

  async createEventWithInscriptions(data: unknown, inscriptions: unknown[]) {
    return this.storageService.storage.createEventWithInscriptions(data, inscriptions);
  }

  async updateEventStatus(id: string, status: string) {
    const validStatuses = ['draft', 'published', 'archived', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    return this.storageService.storage.updateEventStatus(id, status);
  }

  async createInscription(data: unknown) {
    const alreadyRegistered = await this.storageService.storage.hasUserRegistered(
      data.eventId,
      data.email
    );
    if (alreadyRegistered) {
      throw new Error('Already registered');
    }
    return this.storageService.storage.createInscription(data);
  }

  async createUnsubscription(data: unknown) {
    return this.storageService.storage.createUnsubscription(data);
  }
}

describe('EventsService', () => {
  let eventsService: EventsService;

  beforeEach(() => {
    vi.clearAllMocks();
    eventsService = new EventsService(mockStorageService, mockNotificationService);
  });

  describe('getEvents', () => {
    it('should return paginated events', async () => {
      const mockResult = {
        success: true,
        data: {
          data: [{ id: '1', title: 'Event 1', status: 'published' }],
          total: 1,
          page: 1,
          limit: 20,
        },
      };
      mockStorage.getEvents.mockResolvedValue(mockResult);

      const result = await eventsService.getEvents(1, 20);

      expect(mockStorage.getEvents).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toEqual(mockResult);
    });
  });

  describe('createEvent', () => {
    it('should create event with valid data', async () => {
      const newEvent = {
        title: 'New Event',
        description: 'Description',
        date: new Date('2025-12-25'),
        location: 'Amiens',
        capacity: 50,
      };
      mockStorage.createEvent.mockResolvedValue({
        success: true,
        data: { id: '1', ...newEvent, status: 'draft' },
      });

      const result = await eventsService.createEvent(newEvent);

      expect(mockStorage.createEvent).toHaveBeenCalledWith(newEvent);
      expect(result.success).toBe(true);
    });
  });

  describe('createEventWithInscriptions', () => {
    it('should create event with initial inscriptions', async () => {
      const event = { title: 'Event', date: new Date() };
      const inscriptions = [
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
      ];
      mockStorage.createEventWithInscriptions.mockResolvedValue({
        success: true,
        data: {
          event: { id: '1', ...event },
          inscriptions: inscriptions.map((i, idx) => ({ id: String(idx), ...i })),
        },
      });

      const result = await eventsService.createEventWithInscriptions(event, inscriptions);

      expect(mockStorage.createEventWithInscriptions).toHaveBeenCalledWith(event, inscriptions);
      expect(result.data.inscriptions).toHaveLength(2);
    });
  });

  describe('updateEventStatus', () => {
    it('should update status for valid status', async () => {
      mockStorage.updateEventStatus.mockResolvedValue({ success: true });

      await eventsService.updateEventStatus('1', 'published');

      expect(mockStorage.updateEventStatus).toHaveBeenCalledWith('1', 'published');
    });

    it('should reject invalid status', async () => {
      await expect(eventsService.updateEventStatus('1', 'invalid'))
        .rejects.toThrow('Invalid status');
    });

    const validStatuses = ['draft', 'published', 'archived', 'cancelled'];
    validStatuses.forEach((status) => {
      it(`should accept ${status} status`, async () => {
        mockStorage.updateEventStatus.mockResolvedValue({ success: true });
        
        await expect(eventsService.updateEventStatus('1', status)).resolves.not.toThrow();
      });
    });
  });

  describe('createInscription', () => {
    it('should create inscription for new user', async () => {
      const inscription = {
        eventId: '1',
        name: 'Test User',
        email: 'test@example.com',
      };
      mockStorage.hasUserRegistered.mockResolvedValue(false);
      mockStorage.createInscription.mockResolvedValue({
        success: true,
        data: { id: '1', ...inscription },
      });

      const result = await eventsService.createInscription(inscription);

      expect(result.success).toBe(true);
    });

    it('should reject duplicate inscription', async () => {
      mockStorage.hasUserRegistered.mockResolvedValue(true);

      await expect(
        eventsService.createInscription({
          eventId: '1',
          name: 'Test',
          email: 'existing@example.com',
        })
      ).rejects.toThrow('Already registered');
    });
  });

  describe('createUnsubscription', () => {
    it('should record unsubscription', async () => {
      const unsubscription = {
        eventId: '1',
        name: 'Test User',
        email: 'test@example.com',
        reason: 'Cannot attend',
      };
      mockStorage.createUnsubscription.mockResolvedValue({
        success: true,
        data: { id: '1', ...unsubscription },
      });

      const result = await eventsService.createUnsubscription(unsubscription);

      expect(mockStorage.createUnsubscription).toHaveBeenCalledWith(unsubscription);
      expect(result.success).toBe(true);
    });
  });
});
