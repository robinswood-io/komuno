import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = {
  createPatron: vi.fn(),
  getPatrons: vi.fn(),
  getPatronById: vi.fn(),
  updatePatron: vi.fn(),
  deletePatron: vi.fn(),
  createPatronDonation: vi.fn(),
  getPatronDonations: vi.fn(),
  createPatronUpdate: vi.fn(),
  createEventSponsorship: vi.fn(),
  getEventSponsorships: vi.fn(),
  proposeIdeaPatron: vi.fn(),
  createTrackingMetric: vi.fn(),
};

const mockStorageService = { storage: mockStorage };

vi.mock('../../server/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

class PatronsService {
  constructor(private storageService: unknown) {}

  async proposePatron(data: unknown, userEmail?: string) {
    const result = await this.storageService.storage.createPatron(data);
    if (result.success) {
      await this.storageService.storage.createTrackingMetric({
        entityType: 'patron',
        entityId: result.data.id,
        metricType: 'proposal',
        value: 1,
      });
    }
    return result;
  }

  async getPatrons(page = 1, limit = 20, status?: string, search?: string) {
    return this.storageService.storage.getPatrons({ page, limit, status, search });
  }

  async createPatronDonation(data: unknown) {
    if (!data.amount || data.amount <= 0) {
      throw new Error('Invalid donation amount');
    }
    return this.storageService.storage.createPatronDonation(data);
  }

  async createEventSponsorship(data: unknown) {
    if (!data.patronId || !data.eventId) {
      throw new Error('Patron and event are required');
    }
    return this.storageService.storage.createEventSponsorship(data);
  }
}

describe('PatronsService', () => {
  let patronsService: PatronsService;

  beforeEach(() => {
    vi.clearAllMocks();
    patronsService = new PatronsService(mockStorageService);
  });

  describe('proposePatron', () => {
    it('should create patron and track metric', async () => {
      const patronData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: 'Acme Inc',
      };
      mockStorage.createPatron.mockResolvedValue({ success: true, data: { id: '1', ...patronData } });
      mockStorage.createTrackingMetric.mockResolvedValue({ success: true });

      const result = await patronsService.proposePatron(patronData);

      expect(mockStorage.createPatron).toHaveBeenCalledWith(patronData);
      expect(mockStorage.createTrackingMetric).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should not track metric on creation failure', async () => {
      mockStorage.createPatron.mockResolvedValue({ success: false });

      await patronsService.proposePatron({});

      expect(mockStorage.createTrackingMetric).not.toHaveBeenCalled();
    });
  });

  describe('getPatrons', () => {
    it('should return paginated patrons', async () => {
      const mockPatrons = [
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'active' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', status: 'pending' },
      ];
      mockStorage.getPatrons.mockResolvedValue({ success: true, data: { data: mockPatrons, total: 2 } });

      const result = await patronsService.getPatrons(1, 20);

      expect(mockStorage.getPatrons).toHaveBeenCalledWith({ page: 1, limit: 20, status: undefined, search: undefined });
      expect(result.data.data).toHaveLength(2);
    });

    it('should filter by status', async () => {
      mockStorage.getPatrons.mockResolvedValue({ success: true, data: { data: [], total: 0 } });

      await patronsService.getPatrons(1, 20, 'active');

      expect(mockStorage.getPatrons).toHaveBeenCalledWith({ page: 1, limit: 20, status: 'active', search: undefined });
    });

    it('should filter by search term', async () => {
      mockStorage.getPatrons.mockResolvedValue({ success: true, data: { data: [], total: 0 } });

      await patronsService.getPatrons(1, 20, undefined, 'john');

      expect(mockStorage.getPatrons).toHaveBeenCalledWith({ page: 1, limit: 20, status: undefined, search: 'john' });
    });
  });

  describe('createPatronDonation', () => {
    it('should create donation with valid amount', async () => {
      const donation = { patronId: '1', amount: 1000, description: 'Annual donation' };
      mockStorage.createPatronDonation.mockResolvedValue({ success: true, data: { id: '1', ...donation } });

      const result = await patronsService.createPatronDonation(donation);

      expect(result.success).toBe(true);
    });

    it('should reject donation with zero amount', async () => {
      await expect(patronsService.createPatronDonation({ patronId: '1', amount: 0 }))
        .rejects.toThrow('Invalid donation amount');
    });

    it('should reject donation with negative amount', async () => {
      await expect(patronsService.createPatronDonation({ patronId: '1', amount: -100 }))
        .rejects.toThrow('Invalid donation amount');
    });
  });

  describe('createEventSponsorship', () => {
    it('should create sponsorship with valid data', async () => {
      const sponsorship = { patronId: '1', eventId: '1', amount: 500 };
      mockStorage.createEventSponsorship.mockResolvedValue({ success: true, data: { id: '1', ...sponsorship } });

      const result = await patronsService.createEventSponsorship(sponsorship);

      expect(result.success).toBe(true);
    });

    it('should reject sponsorship without patron', async () => {
      await expect(patronsService.createEventSponsorship({ eventId: '1' }))
        .rejects.toThrow('Patron and event are required');
    });

    it('should reject sponsorship without event', async () => {
      await expect(patronsService.createEventSponsorship({ patronId: '1' }))
        .rejects.toThrow('Patron and event are required');
    });
  });
});
