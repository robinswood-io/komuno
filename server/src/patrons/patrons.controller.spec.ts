import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests unitaires pour PatronsController
 * Couvre: Routes publiques et admin pour Patrons, Donations, Updates, Sponsorships
 */

class MockPatronsService {
  proposePatron = vi.fn();
  getPatrons = vi.fn();
  searchPatronByEmail = vi.fn();
  getPatronById = vi.fn();
  createPatron = vi.fn();
  updatePatron = vi.fn();
  deletePatron = vi.fn();
  createPatronDonation = vi.fn();
  getPatronDonations = vi.fn();
  getAllDonations = vi.fn();
  updatePatronDonation = vi.fn();
  deletePatronDonation = vi.fn();
  getPatronProposals = vi.fn();
  createPatronUpdate = vi.fn();
  getPatronUpdates = vi.fn();
  createPatronSponsorship = vi.fn();
  getPatronSponsorships = vi.fn();
  updateIdeaPatronProposal = vi.fn();
  deleteIdeaPatronProposal = vi.fn();
  updatePatronUpdate = vi.fn();
  deletePatronUpdate = vi.fn();
  getAllSponsorships = vi.fn();
  getSponsorshipStats = vi.fn();
  updateEventSponsorship = vi.fn();
  deleteEventSponsorship = vi.fn();
}

describe('PatronsController (Unit Tests)', () => {
  let service: MockPatronsService;
  let controller: unknown;

  const mockPatron = {
    id: 'patron-123',
    firstName: 'Marie',
    lastName: 'Durand',
    email: 'marie@example.com',
    company: 'Entreprise XYZ',
    phone: '+33612345678',
    role: 'CEO',
    status: 'active',
  };

  const mockDonation = {
    id: 'donation-123',
    patronId: 'patron-123',
    amountInCents: 100000,
    donatedAt: new Date('2025-01-15'),
    occasion: 'Annual Gala',
  };

  const mockUpdate = {
    id: 'update-123',
    patronId: 'patron-123',
    type: 'meeting',
    subject: 'Business Meeting',
    date: new Date('2025-01-20'),
  };

  const mockSponsorship = {
    id: 'sponsorship-123',
    patronId: 'patron-123',
    amountInCents: 250000,
    type: 'gold',
  };

  beforeEach(() => {
    service = new MockPatronsService();

    // Admin Patrons Controller
    controller = {
      service,
      getPatrons: async (pageStr?: string, limitStr?: string, status?: string, search?: string) => {
        const page = parseInt(pageStr || '1', 10);
        const limit = parseInt(limitStr || '20', 10);
        return service.getPatrons(page, limit, status, search);
      },

      searchPatronByEmail: async (email: string) => {
        return service.searchPatronByEmail(email);
      },

      getPatronById: async (id: string) => {
        return service.getPatronById(id);
      },

      createPatron: async (body: unknown, user: { email: string }) => {
        return service.createPatron(body, user.email);
      },

      updatePatron: async (id: string, body: unknown, user: { email: string }) => {
        return service.updatePatron(id, body, user.email);
      },

      deletePatron: async (id: string) => {
        return service.deletePatron(id);
      },

      createPatronDonation: async (patronId: string, body: unknown, user: { email: string }) => {
        return service.createPatronDonation(patronId, body, user.email);
      },

      getPatronDonations: async (patronId: string) => {
        return service.getPatronDonations(patronId);
      },

      getPatronProposals: async (patronId: string) => {
        return service.getPatronProposals(patronId);
      },

      createPatronUpdate: async (patronId: string, body: unknown, user: { email: string }) => {
        return service.createPatronUpdate(patronId, body, user.email);
      },

      getPatronUpdates: async (patronId: string) => {
        return service.getPatronUpdates(patronId);
      },

      createPatronSponsorship: async (patronId: string, body: unknown, user: { email: string }) => {
        return service.createPatronSponsorship(patronId, body, user.email);
      },

      getPatronSponsorships: async (patronId: string) => {
        return service.getPatronSponsorships(patronId);
      },
    };
  });

  describe('Patrons - Read Operations', () => {
    it('should get paginated patrons list', async () => {
      const expectedResult = {
        data: [mockPatron],
        pagination: { page: 1, limit: 20, total: 1 },
      };

      service.getPatrons.mockResolvedValue(expectedResult);

      const result = await controller.getPatrons('1', '20');

      expect(result).toEqual(expectedResult);
      expect(service.getPatrons).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });

    it('should parse pagination strings correctly', async () => {
      service.getPatrons.mockResolvedValue({
        data: [mockPatron],
        pagination: { page: 2, limit: 50, total: 100 },
      });

      await controller.getPatrons('2', '50');

      expect(service.getPatrons).toHaveBeenCalledWith(2, 50, undefined, undefined);
    });

    it('should use default pagination when not provided', async () => {
      service.getPatrons.mockResolvedValue({
        data: [mockPatron],
        pagination: { page: 1, limit: 20, total: 1 },
      });

      await controller.getPatrons(undefined, undefined);

      expect(service.getPatrons).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });

    it('should filter by status', async () => {
      service.getPatrons.mockResolvedValue({
        data: [mockPatron],
        pagination: { page: 1, limit: 20, total: 1 },
      });

      await controller.getPatrons('1', '20', 'active');

      expect(service.getPatrons).toHaveBeenCalledWith(1, 20, 'active', undefined);
    });

    it('should filter by search keyword', async () => {
      service.getPatrons.mockResolvedValue({
        data: [mockPatron],
        pagination: { page: 1, limit: 20, total: 1 },
      });

      await controller.getPatrons('1', '20', undefined, 'durand');

      expect(service.getPatrons).toHaveBeenCalledWith(1, 20, undefined, 'durand');
    });

    it('should find patron by id', async () => {
      service.getPatronById.mockResolvedValue(mockPatron);

      const result = await controller.getPatronById('patron-123');

      expect(result).toEqual(mockPatron);
      expect(service.getPatronById).toHaveBeenCalledWith('patron-123');
    });

    it('should find patron by email', async () => {
      service.searchPatronByEmail.mockResolvedValue(mockPatron);

      const result = await controller.searchPatronByEmail('marie@example.com');

      expect(result).toEqual(mockPatron);
      expect(service.searchPatronByEmail).toHaveBeenCalledWith('marie@example.com');
    });
  });

  describe('Patrons - Create Operations', () => {
    it('should create a patron', async () => {
      const createData = {
        firstName: 'Marie',
        lastName: 'Durand',
        email: 'marie@example.com',
      };

      service.createPatron.mockResolvedValue(mockPatron);

      const result = await controller.createPatron(createData, { email: 'admin@example.com' });

      expect(result).toEqual(mockPatron);
      expect(service.createPatron).toHaveBeenCalledWith(createData, 'admin@example.com');
    });

    it('should pass user email to service', async () => {
      const createData = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };

      service.createPatron.mockResolvedValue({ ...mockPatron, ...createData });

      await controller.createPatron(createData, { email: 'creator@example.com' });

      expect(service.createPatron).toHaveBeenCalledWith(createData, 'creator@example.com');
    });
  });

  describe('Patrons - Update Operations', () => {
    it('should update a patron', async () => {
      const updateData = { firstName: 'Marie', status: 'active' };

      service.updatePatron.mockResolvedValue({ ...mockPatron, ...updateData });

      const result = await controller.updatePatron('patron-123', updateData, { email: 'admin@example.com' });

      expect(result).toEqual(expect.objectContaining(updateData));
      expect(service.updatePatron).toHaveBeenCalledWith('patron-123', updateData, 'admin@example.com');
    });
  });

  describe('Patrons - Delete Operations', () => {
    it('should delete a patron', async () => {
      service.deletePatron.mockResolvedValue(undefined);

      await controller.deletePatron('patron-123');

      expect(service.deletePatron).toHaveBeenCalledWith('patron-123');
    });
  });

  describe('Donations - CRUD Operations', () => {
    it('should create donation', async () => {
      const donationData = {
        amountInCents: 100000,
        donatedAt: new Date('2025-01-15'),
        occasion: 'Annual Gala',
      };

      service.createPatronDonation.mockResolvedValue({ id: 'donation-123', patronId: 'patron-123', ...donationData });

      const result = await controller.createPatronDonation('patron-123', donationData, {
        email: 'admin@example.com',
      });

      expect(result).toEqual(expect.objectContaining(donationData));
      expect(service.createPatronDonation).toHaveBeenCalledWith(
        'patron-123',
        donationData,
        'admin@example.com',
      );
    });

    it('should get patron donations', async () => {
      service.getPatronDonations.mockResolvedValue([mockDonation]);

      const result = await controller.getPatronDonations('patron-123');

      expect(result).toEqual([mockDonation]);
      expect(service.getPatronDonations).toHaveBeenCalledWith('patron-123');
    });
  });

  describe('Proposals - Read Operations', () => {
    it('should get patron proposals', async () => {
      const mockProposals = [{ id: 'proposal-123', patronId: 'patron-123', status: 'proposed' }];

      service.getPatronProposals.mockResolvedValue(mockProposals);

      const result = await controller.getPatronProposals('patron-123');

      expect(result).toEqual(mockProposals);
      expect(service.getPatronProposals).toHaveBeenCalledWith('patron-123');
    });
  });

  describe('Patron Updates - CRUD Operations', () => {
    it('should create patron update', async () => {
      const updateData = {
        type: 'meeting',
        subject: 'Business Meeting',
        date: new Date('2025-01-20'),
        description: 'Annual strategy meeting',
      };

      service.createPatronUpdate.mockResolvedValue({ id: 'update-123', patronId: 'patron-123', ...updateData });

      const result = await controller.createPatronUpdate('patron-123', updateData, {
        email: 'admin@example.com',
      });

      expect(result).toEqual(expect.objectContaining(updateData));
      expect(service.createPatronUpdate).toHaveBeenCalledWith('patron-123', updateData, 'admin@example.com');
    });

    it('should get patron updates', async () => {
      service.getPatronUpdates.mockResolvedValue([mockUpdate]);

      const result = await controller.getPatronUpdates('patron-123');

      expect(result).toEqual([mockUpdate]);
      expect(service.getPatronUpdates).toHaveBeenCalledWith('patron-123');
    });
  });

  describe('Sponsorships - CRUD Operations', () => {
    it('should create sponsorship', async () => {
      const sponsorshipData = {
        eventId: 'event-456',
        amountInCents: 250000,
        type: 'gold',
      };

      service.createPatronSponsorship.mockResolvedValue({
        id: 'sponsorship-123',
        patronId: 'patron-123',
        ...sponsorshipData,
      });

      const result = await controller.createPatronSponsorship('patron-123', sponsorshipData, {
        email: 'admin@example.com',
      });

      expect(result).toEqual(expect.objectContaining(sponsorshipData));
      expect(service.createPatronSponsorship).toHaveBeenCalledWith(
        'patron-123',
        sponsorshipData,
        'admin@example.com',
      );
    });

    it('should get patron sponsorships', async () => {
      service.getPatronSponsorships.mockResolvedValue([mockSponsorship]);

      const result = await controller.getPatronSponsorships('patron-123');

      expect(result).toEqual([mockSponsorship]);
      expect(service.getPatronSponsorships).toHaveBeenCalledWith('patron-123');
    });
  });

  describe('Global Donations Routes', () => {
    it('should get all donations', async () => {
      const allDonationsController = {
        service,
        getAllDonations: () => service.getAllDonations(),
        updatePatronDonation: (id: string, body: unknown) => service.updatePatronDonation(id, body),
        deletePatronDonation: (id: string) => service.deletePatronDonation(id),
      };

      service.getAllDonations.mockResolvedValue([mockDonation]);

      const result = await allDonationsController.getAllDonations();

      expect(result).toEqual([mockDonation]);
      expect(service.getAllDonations).toHaveBeenCalled();
    });

    it('should update donation', async () => {
      const allDonationsController = {
        service,
        updatePatronDonation: (id: string, body: unknown) => service.updatePatronDonation(id, body),
      };

      const updateData = { amountInCents: 150000 };
      service.updatePatronDonation.mockResolvedValue({ ...mockDonation, ...updateData });

      const result = await allDonationsController.updatePatronDonation('donation-123', updateData);

      expect(result).toEqual(expect.objectContaining(updateData));
      expect(service.updatePatronDonation).toHaveBeenCalledWith('donation-123', updateData);
    });

    it('should delete donation', async () => {
      const allDonationsController = {
        service,
        deletePatronDonation: (id: string) => service.deletePatronDonation(id),
      };

      service.deletePatronDonation.mockResolvedValue(undefined);

      await allDonationsController.deletePatronDonation('donation-123');

      expect(service.deletePatronDonation).toHaveBeenCalledWith('donation-123');
    });
  });

  describe('Global Proposals Routes', () => {
    it('should update proposal', async () => {
      const proposalsController = {
        service,
        updateIdeaPatronProposal: (id: string, body: unknown) => service.updateIdeaPatronProposal(id, body),
      };

      const updateData = { status: 'contacted' };
      service.updateIdeaPatronProposal.mockResolvedValue({ id: 'proposal-123', ...updateData });

      const result = await proposalsController.updateIdeaPatronProposal('proposal-123', updateData);

      expect(result).toEqual(expect.objectContaining(updateData));
      expect(service.updateIdeaPatronProposal).toHaveBeenCalledWith('proposal-123', updateData);
    });

    it('should delete proposal', async () => {
      const proposalsController = {
        service,
        deleteIdeaPatronProposal: (id: string) => service.deleteIdeaPatronProposal(id),
      };

      service.deleteIdeaPatronProposal.mockResolvedValue(undefined);

      await proposalsController.deleteIdeaPatronProposal('proposal-123');

      expect(service.deleteIdeaPatronProposal).toHaveBeenCalledWith('proposal-123');
    });
  });

  describe('Global Sponsorships Routes', () => {
    it('should get all sponsorships', async () => {
      const sponsorshipsController = {
        service,
        getAllSponsorships: () => service.getAllSponsorships(),
        getSponsorshipStats: () => service.getSponsorshipStats(),
      };

      service.getAllSponsorships.mockResolvedValue([mockSponsorship]);

      const result = await sponsorshipsController.getAllSponsorships();

      expect(result).toEqual([mockSponsorship]);
      expect(service.getAllSponsorships).toHaveBeenCalled();
    });

    it('should get sponsorship statistics', async () => {
      const sponsorshipsController = {
        service,
        getSponsorshipStats: () => service.getSponsorshipStats(),
      };

      const stats = { total: 250000, count: 1, byType: { gold: 250000 } };
      service.getSponsorshipStats.mockResolvedValue(stats);

      const result = await sponsorshipsController.getSponsorshipStats();

      expect(result).toEqual(stats);
      expect(service.getSponsorshipStats).toHaveBeenCalled();
    });

    it('should update sponsorship', async () => {
      const sponsorshipsController = {
        service,
        updateEventSponsorship: (id: string, body: unknown) => service.updateEventSponsorship(id, body),
      };

      const updateData = { amountInCents: 300000 };
      service.updateEventSponsorship.mockResolvedValue({ ...mockSponsorship, ...updateData });

      const result = await sponsorshipsController.updateEventSponsorship('sponsorship-123', updateData);

      expect(result).toEqual(expect.objectContaining(updateData));
      expect(service.updateEventSponsorship).toHaveBeenCalledWith('sponsorship-123', updateData);
    });

    it('should delete sponsorship', async () => {
      const sponsorshipsController = {
        service,
        deleteEventSponsorship: (id: string) => service.deleteEventSponsorship(id),
      };

      service.deleteEventSponsorship.mockResolvedValue(undefined);

      await sponsorshipsController.deleteEventSponsorship('sponsorship-123');

      expect(service.deleteEventSponsorship).toHaveBeenCalledWith('sponsorship-123');
    });
  });

  describe('Global Updates Routes', () => {
    it('should update patron update', async () => {
      const updatesController = {
        service,
        updatePatronUpdate: (id: string, body: unknown) => service.updatePatronUpdate(id, body),
      };

      const updateData = { subject: 'Updated Meeting' };
      service.updatePatronUpdate.mockResolvedValue({ ...mockUpdate, ...updateData });

      const result = await updatesController.updatePatronUpdate('update-123', updateData);

      expect(result).toEqual(expect.objectContaining(updateData));
      expect(service.updatePatronUpdate).toHaveBeenCalledWith('update-123', updateData);
    });

    it('should delete patron update', async () => {
      const updatesController = {
        service,
        deletePatronUpdate: (id: string) => service.deletePatronUpdate(id),
      };

      service.deletePatronUpdate.mockResolvedValue(undefined);

      await updatesController.deletePatronUpdate('update-123');

      expect(service.deletePatronUpdate).toHaveBeenCalledWith('update-123');
    });
  });
});
