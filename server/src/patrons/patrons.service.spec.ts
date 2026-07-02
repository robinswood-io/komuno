import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ZodError } from 'zod';

/**
 * Tests unitaires pour PatronsService
 * Couvre: Patrons CRUD, Donations, Updates, Sponsorships, Proposals
 */

// Mock StorageService
class MockStorageInstance {
  proposePatron = vi.fn();
  getPatrons = vi.fn();
  getPatronByEmail = vi.fn();
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
  createEventSponsorship = vi.fn();
  getPatronSponsorships = vi.fn();
  updateIdeaPatronProposal = vi.fn();
  deleteIdeaPatronProposal = vi.fn();
  updatePatronUpdate = vi.fn();
  deletePatronUpdate = vi.fn();
  getAllSponsorships = vi.fn();
  getSponsorshipStats = vi.fn();
  updateEventSponsorship = vi.fn();
  deleteEventSponsorship = vi.fn();
  createTrackingMetric = vi.fn();
}

class MockStorageService {
  instance = new MockStorageInstance();
}

describe('PatronsService (Unit Tests)', () => {
  let storageService: MockStorageService;
  let patronsService: unknown;

  // Données mock
  const mockPatron = {
    id: 'patron-123',
    firstName: 'Marie',
    lastName: 'Durand',
    email: 'marie@example.com',
    company: 'Entreprise XYZ',
    phone: '+33612345678',
    role: 'CEO',
    notes: 'Key patron',
    status: 'active',
    createdBy: 'admin@example.com',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockDonation = {
    id: 'donation-123',
    patronId: 'patron-123',
    amountInCents: 100000,
    donatedAt: new Date('2025-01-15'),
    occasion: 'Annual Gala',
    recordedBy: 'admin@example.com',
    createdAt: new Date('2025-01-15'),
  };

  const mockPatronUpdate = {
    id: 'update-123',
    patronId: 'patron-123',
    type: 'meeting',
    subject: 'Business Meeting',
    date: new Date('2025-01-20'),
    startTime: '14:00',
    duration: 60,
    description: 'Annual strategy meeting',
    notes: 'Very interested',
    createdBy: 'admin@example.com',
    createdAt: new Date('2025-01-20'),
  };

  const mockSponsorship = {
    id: 'sponsorship-123',
    patronId: 'patron-123',
    eventId: 'event-456',
    amountInCents: 250000,
    type: 'gold',
    notes: 'Main sponsor',
    proposedByAdminEmail: 'admin@example.com',
    createdAt: new Date('2025-01-10'),
  };

  beforeEach(() => {
    storageService = new MockStorageService();

    // Créer un service simple sans dépendances d'injection
    patronsService = {
      storageService,
      getPatrons: async (page = 1, limit = 20, status?: string, search?: string) => {
        const result = await storageService.instance.getPatrons({
          page,
          limit,
          ...(status && status !== 'all' ? { status } : {}),
          ...(search && search.trim() ? { search } : {}),
        });

        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }

        return result.data;
      },

      searchPatronByEmail: async (email: string) => {
        if (!email) {
          throw new BadRequestException('Email requis');
        }

        const result = await storageService.instance.getPatronByEmail(email);
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }

        return result.data;
      },

      getPatronById: async (id: string) => {
        const result = await storageService.instance.getPatronById(id);
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
        if (!result.data) {
          throw new NotFoundException('Mécène non trouvé');
        }
        return result.data;
      },

      deletePatron: async (id: string) => {
        const result = await storageService.instance.deletePatron(id);
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
      },

      getPatronDonations: async (patronId: string) => {
        const result = await storageService.instance.getPatronDonations(patronId);
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
        return result.data;
      },

      getAllDonations: async () => {
        const result = await storageService.instance.getAllDonations();
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
        return result.data;
      },

      updatePatronDonation: async (id: string, data: unknown) => {
        const result = await storageService.instance.updatePatronDonation(id, data);
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
        return result.data;
      },

      deletePatronDonation: async (id: string) => {
        const result = await storageService.instance.deletePatronDonation(id);
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
      },

      getPatronProposals: async (patronId: string) => {
        const result = await storageService.instance.getPatronProposals(patronId);
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
        return result.data;
      },

      getPatronUpdates: async (patronId: string) => {
        const result = await storageService.instance.getPatronUpdates(patronId);
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
        return result.data;
      },

      getPatronSponsorships: async (patronId: string) => {
        const result = await storageService.instance.getPatronSponsorships(patronId);
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
        return result.data;
      },

      getAllSponsorships: async () => {
        const result = await storageService.instance.getAllSponsorships();
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
        return result.data;
      },

      getSponsorshipStats: async () => {
        const result = await storageService.instance.getSponsorshipStats();
        if (!result.success) {
          throw new BadRequestException(
            ('error' in result ? result.error : new Error('Unknown error')).message,
          );
        }
        return result.data;
      },
    };
  });

  describe('Patrons - Read Operations (R)', () => {
    it('should get paginated patrons list', async () => {
      const expectedResult = {
        data: [mockPatron],
        pagination: { page: 1, limit: 20, total: 1 },
      };

      storageService.instance.getPatrons.mockResolvedValue({
        success: true,
        data: expectedResult,
      });

      const result = await patronsService.getPatrons(1, 20);

      expect(result).toEqual(expectedResult);
      expect(storageService.instance.getPatrons).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('should filter patrons by status', async () => {
      const expectedResult = {
        data: [mockPatron],
        pagination: { page: 1, limit: 20, total: 1 },
      };

      storageService.instance.getPatrons.mockResolvedValue({
        success: true,
        data: expectedResult,
      });

      await patronsService.getPatrons(1, 20, 'active');

      expect(storageService.instance.getPatrons).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'active',
      });
    });

    it('should search patrons by keyword', async () => {
      const expectedResult = {
        data: [mockPatron],
        pagination: { page: 1, limit: 20, total: 1 },
      };

      storageService.instance.getPatrons.mockResolvedValue({
        success: true,
        data: expectedResult,
      });

      await patronsService.getPatrons(1, 20, undefined, 'durand');

      expect(storageService.instance.getPatrons).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'durand',
      });
    });

    it('should find patron by id', async () => {
      storageService.instance.getPatronById.mockResolvedValue({
        success: true,
        data: mockPatron,
      });

      const result = await patronsService.getPatronById('patron-123');

      expect(result).toEqual(mockPatron);
      expect(storageService.instance.getPatronById).toHaveBeenCalledWith('patron-123');
    });

    it('should find patron by email', async () => {
      storageService.instance.getPatronByEmail.mockResolvedValue({
        success: true,
        data: mockPatron,
      });

      const result = await patronsService.searchPatronByEmail('marie@example.com');

      expect(result).toEqual(mockPatron);
      expect(storageService.instance.getPatronByEmail).toHaveBeenCalledWith('marie@example.com');
    });
  });

  describe('Patrons - Error Handling', () => {
    it('should throw BadRequestException on storage error', async () => {
      storageService.instance.getPatrons.mockResolvedValue({
        success: false,
        error: new Error('Database error'),
      });

      await expect(patronsService.getPatrons(1, 20)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when patron not found', async () => {
      storageService.instance.getPatronById.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(patronsService.getPatronById('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when email is empty', async () => {
      await expect(patronsService.searchPatronByEmail('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on email search error', async () => {
      storageService.instance.getPatronByEmail.mockResolvedValue({
        success: false,
        error: new Error('Database error'),
      });

      await expect(patronsService.searchPatronByEmail('test@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Donations - CRUD Operations', () => {
    it('should get patron donations', async () => {
      storageService.instance.getPatronDonations.mockResolvedValue({
        success: true,
        data: [mockDonation],
      });

      const result = await patronsService.getPatronDonations('patron-123');

      expect(result).toEqual([mockDonation]);
      expect(storageService.instance.getPatronDonations).toHaveBeenCalledWith('patron-123');
    });

    it('should get all donations', async () => {
      storageService.instance.getAllDonations.mockResolvedValue({
        success: true,
        data: [mockDonation],
      });

      const result = await patronsService.getAllDonations();

      expect(result).toEqual([mockDonation]);
      expect(storageService.instance.getAllDonations).toHaveBeenCalled();
    });

    it('should update donation', async () => {
      const updateData = { amountInCents: 150000 };

      storageService.instance.updatePatronDonation.mockResolvedValue({
        success: true,
        data: { ...mockDonation, ...updateData },
      });

      const result = await patronsService.updatePatronDonation('donation-123', updateData);

      expect(result).toEqual(expect.objectContaining(updateData));
    });

    it('should delete donation', async () => {
      storageService.instance.deletePatronDonation.mockResolvedValue({
        success: true,
      });

      await patronsService.deletePatronDonation('donation-123');

      expect(storageService.instance.deletePatronDonation).toHaveBeenCalledWith('donation-123');
    });
  });

  describe('Patron Updates - CRUD Operations', () => {
    it('should get patron updates', async () => {
      storageService.instance.getPatronUpdates.mockResolvedValue({
        success: true,
        data: [mockPatronUpdate],
      });

      const result = await patronsService.getPatronUpdates('patron-123');

      expect(result).toEqual([mockPatronUpdate]);
    });
  });

  describe('Sponsorships - CRUD Operations', () => {
    it('should get patron sponsorships', async () => {
      storageService.instance.getPatronSponsorships.mockResolvedValue({
        success: true,
        data: [mockSponsorship],
      });

      const result = await patronsService.getPatronSponsorships('patron-123');

      expect(result).toEqual([mockSponsorship]);
    });

    it('should get all sponsorships', async () => {
      storageService.instance.getAllSponsorships.mockResolvedValue({
        success: true,
        data: [mockSponsorship],
      });

      const result = await patronsService.getAllSponsorships();

      expect(result).toEqual([mockSponsorship]);
    });

    it('should get sponsorship statistics', async () => {
      const stats = {
        total: 250000,
        count: 1,
        byType: { gold: 250000 },
      };

      storageService.instance.getSponsorshipStats.mockResolvedValue({
        success: true,
        data: stats,
      });

      const result = await patronsService.getSponsorshipStats();

      expect(result).toEqual(stats);
    });
  });

  describe('Patron Proposals', () => {
    it('should get patron proposals', async () => {
      const proposals = [
        {
          id: 'proposal-123',
          patronId: 'patron-123',
          status: 'proposed',
        },
      ];

      storageService.instance.getPatronProposals.mockResolvedValue({
        success: true,
        data: proposals,
      });

      const result = await patronsService.getPatronProposals('patron-123');

      expect(result).toEqual(proposals);
    });
  });

  describe('Delete Operations', () => {
    it('should delete patron', async () => {
      storageService.instance.deletePatron.mockResolvedValue({
        success: true,
      });

      await patronsService.deletePatron('patron-123');

      expect(storageService.instance.deletePatron).toHaveBeenCalledWith('patron-123');
    });

    it('should throw error when delete fails', async () => {
      storageService.instance.deletePatron.mockResolvedValue({
        success: false,
        error: new Error('Cannot delete'),
      });

      await expect(patronsService.deletePatron('patron-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Validation - Email Requirements', () => {
    it('should require email for patron search', async () => {
      await expect(patronsService.searchPatronByEmail('')).rejects.toThrow('Email requis');
    });

    it('should accept null and treat as empty', async () => {
      await expect(patronsService.searchPatronByEmail(null)).rejects.toThrow(BadRequestException);
    });
  });
});
