import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { StorageService } from '../common/storage/storage.service';
import { IdeasService } from '../ideas/ideas.service';
import { EventsService } from '../events/events.service';
import { checkDatabaseHealth } from '../../utils/db-health';
import { emailService } from '../../email-service';
import { emailNotificationService } from '../../email-notification-service';
import { logger } from '../../lib/logger';
import { promises as fs } from 'fs';
import * as adminDto from './admin.dto';

vi.mock('../../utils/db-health', () => ({
  checkDatabaseHealth: vi.fn(),
}));

vi.mock('../../email-service', () => ({
  emailService: {
    reloadConfig: vi.fn(),
    sendEmail: vi.fn(),
  },
}));

vi.mock('../../email-notification-service', () => ({
  emailNotificationService: {
    testEmailConfiguration: vi.fn(),
  },
}));

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe('AdminService', () => {
  let adminService: AdminService;
  let storageService: StorageService;
  let ideasService: IdeasService;
  let eventsService: EventsService;

  beforeEach(() => {
    vi.mocked(emailService.reloadConfig).mockResolvedValue(undefined);

    // Mock dependencies
    storageService = {
      instance: {
        getAllIdeas: vi.fn(),
        updateIdea: vi.fn(),
        toggleIdeaFeatured: vi.fn(),
        transformIdeaToEvent: vi.fn(),
        getAllEvents: vi.fn(),
        updateEvent: vi.fn(),
        updateEventStatus: vi.fn(),
        getEventInscriptions: vi.fn(),
        createInscription: vi.fn(),
        deleteInscription: vi.fn(),
        getVotesByIdea: vi.fn(),
        deleteVote: vi.fn(),
        getAllAdmins: vi.fn(),
        getPendingAdmins: vi.fn(),
        createUser: vi.fn(),
        updateAdminRole: vi.fn(),
        updateAdminStatus: vi.fn(),
        updateAdminInfo: vi.fn(),
        deleteAdmin: vi.fn(),
        approveAdmin: vi.fn(),
        getAdminStats: vi.fn(),
        getEventUnsubscriptions: vi.fn(),
        deleteUnsubscription: vi.fn(),
        updateUnsubscription: vi.fn(),
        getDevelopmentRequests: vi.fn(),
        createDevelopmentRequest: vi.fn(),
        updateDevelopmentRequest: vi.fn(),
        updateDevelopmentRequestStatus: vi.fn(),
        deleteDevelopmentRequest: vi.fn(),
        getFeatureConfig: vi.fn(),
        updateFeatureConfig: vi.fn(),
        getEmailConfig: vi.fn(),
        updateEmailConfig: vi.fn(),
      },
    } as unknown as StorageService;

    ideasService = {
      updateIdeaStatus: vi.fn(),
      getVotesByIdea: vi.fn(),
      createVote: vi.fn(),
    } as unknown as IdeasService;

    eventsService = {} as unknown as EventsService;

    adminService = new AdminService(storageService, ideasService, eventsService);
  });

  describe('Ideas and events', () => {
    it('getAllIdeas should compute totalPages', async () => {
      vi.mocked(storageService.instance.getAllIdeas).mockResolvedValue({
        success: true,
        data: {
          data: [{ id: 'i1' }],
          total: 21,
          page: 2,
          limit: 10,
        },
      });

      const result = await adminService.getAllIdeas(2, 10, 'approved', 'true');

      expect(storageService.instance.getAllIdeas).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: 'approved',
        featured: 'true',
      });
      expect(result.totalPages).toBe(3);
      expect(result.data).toHaveLength(1);
    });

    it('iteration44: getAllIdeas should throw BadRequestException with fallback Unknown error', async () => {
      vi.mocked(storageService.instance.getAllIdeas).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getAllIdeas>>);

      await expect(adminService.getAllIdeas(1, 20)).rejects.toThrow('Unknown error');
    });

    it('getAllEvents should throw on storage failure', async () => {
      vi.mocked(storageService.instance.getAllEvents).mockResolvedValue({
        success: false,
        error: new Error('events error'),
      });

      await expect(adminService.getAllEvents()).rejects.toThrow(BadRequestException);
    });

    it('iteration44: getAllEvents should return paginated payload on success', async () => {
      vi.mocked(storageService.instance.getAllEvents).mockResolvedValue({
        success: true,
        data: {
          data: [{ id: 'event-1' }],
          total: 15,
          page: 2,
          limit: 10,
        },
      });

      const result = await adminService.getAllEvents(2, 10);

      expect(result).toEqual({
        success: true,
        data: [{ id: 'event-1' }],
        total: 15,
        page: 2,
        limit: 10,
        totalPages: 2,
      });
    });

    it('toggleIdeaFeatured should return featured value', async () => {
      vi.mocked(storageService.instance.toggleIdeaFeatured).mockResolvedValue({
        success: true,
        data: true,
      });

      const result = await adminService.toggleIdeaFeatured('idea-1');
      expect(result).toEqual({ featured: true });
    });

    it('iteration44: toggleIdeaFeatured should throw fallback Unknown error when storage failure has no error payload', async () => {
      vi.mocked(storageService.instance.toggleIdeaFeatured).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.toggleIdeaFeatured>>);

      await expect(adminService.toggleIdeaFeatured('idea-1')).rejects.toThrow('Unknown error');
    });

    it('transformIdeaToEvent should map event id', async () => {
      vi.mocked(storageService.instance.transformIdeaToEvent).mockResolvedValue({
        success: true,
        data: { id: 'event-10' },
      });

      const result = await adminService.transformIdeaToEvent('idea-1');
      expect(result).toEqual({ success: true, eventId: 'event-10' });
    });

    it('iteration44: transformIdeaToEvent should throw fallback Unknown error when storage failure has no error payload', async () => {
      vi.mocked(storageService.instance.transformIdeaToEvent).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.transformIdeaToEvent>>);

      await expect(adminService.transformIdeaToEvent('idea-1')).rejects.toThrow('Unknown error');
    });

    it('updateEvent should throw NotFoundException when storage fails', async () => {
      vi.mocked(storageService.instance.updateEvent).mockResolvedValue({
        success: false,
        error: new Error('not found'),
      });

      await expect(
        adminService.updateEvent('event-1', {
          title: 'Conférence',
          description: 'Desc',
          date: new Date().toISOString(),
          location: 'Amiens',
          maxParticipants: 20,
          isActive: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('iteration44: updateEvent should return success payload on valid data', async () => {
      const updatedEvent = {
        id: 'event-1',
        title: 'Conférence',
      };

      vi.mocked(storageService.instance.updateEvent).mockResolvedValue({
        success: true,
        data: updatedEvent,
      });

      const result = await adminService.updateEvent('event-1', {
        title: 'Conférence',
        description: 'Desc valide',
        date: new Date().toISOString(),
        location: 'Amiens',
        maxParticipants: 25,
        isActive: true,
      });

      expect(result).toEqual({
        success: true,
        data: updatedEvent,
      });
    });

    it('iteration43: updateEvent should throw BadRequestException on invalid payload (zod catch branch)', async () => {
      await expect(
        adminService.updateEvent('event-1', {
          title: '',
          description: '',
          date: 'not-a-date',
          location: '',
          maxParticipants: -1,
          isActive: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updateEventStatus should throw BadRequestException when status is invalid', async () => {
      await expect(adminService.updateEventStatus('event-1', 'invalid-status')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updateEventStatus should throw BadRequestException when storage update fails', async () => {
      vi.mocked(storageService.instance.updateEventStatus).mockResolvedValue({
        success: false,
        error: new Error('cannot update status'),
      });

      await expect(adminService.updateEventStatus('event-1', 'published')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('getEventInscriptions should throw BadRequestException on storage failure', async () => {
      vi.mocked(storageService.instance.getEventInscriptions).mockResolvedValue({
        success: false,
        error: new Error('cannot list inscriptions'),
      });

      await expect(adminService.getEventInscriptions('event-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('iteration43: getEventInscriptions should return data on success', async () => {
      const inscriptions = [
        {
          id: 'ins-1',
          eventId: 'evt-1',
          name: 'Alice Martin',
          email: 'alice@example.org',
          company: null,
          phone: null,
          comments: null,
          status: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(storageService.instance.getEventInscriptions).mockResolvedValue({
        success: true,
        data: inscriptions,
      });

      const result = await adminService.getEventInscriptions('evt-1');

      expect(storageService.instance.getEventInscriptions).toHaveBeenCalledWith('evt-1');
      expect(result).toEqual(inscriptions);
    });
  });

  describe('Bulk inscriptions', () => {
    it('should reject invalid input when eventId or inscriptions are missing', async () => {
      await expect(adminService.bulkCreateInscriptions('', [])).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        adminService.bulkCreateInscriptions('event-1', 'bad' as unknown as Array<{ name?: string; email?: string }>),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create valid inscriptions, trim fields, and collect errors', async () => {
      vi.mocked(storageService.instance.createInscription)
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'ins-1' },
        })
        .mockResolvedValueOnce({
          success: false,
          error: new Error('already exists'),
        });

      const result = await adminService.bulkCreateInscriptions('event-1', [
        { name: '  Alice  ', email: '  alice@example.com  ', company: ' ACME ', comments: ' note ' },
        { name: 'Bob', email: 'bob@example.com' },
        { name: 'NoMail' },
      ]);

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.errors).toBe(2);
      expect(result.errorMessages[0]).toContain('Bob');
      expect(result.errorMessages[1]).toContain('nom et email requis');
      expect(storageService.instance.createInscription).toHaveBeenNthCalledWith(1, {
        eventId: 'event-1',
        name: 'Alice',
        email: 'alice@example.com',
        company: 'ACME',
        phone: undefined,
        comments: 'note',
      });
    });
  });

  describe('Inscriptions, votes and unsubscriptions errors', () => {
    it('deleteInscription should return success payload when storage succeeds', async () => {
      vi.mocked(storageService.instance.deleteInscription).mockResolvedValue({
        success: true,
      });

      const result = await adminService.deleteInscription('ins-1');

      expect(storageService.instance.deleteInscription).toHaveBeenCalledWith('ins-1');
      expect(result).toEqual({ success: true });
    });

    it('createInscription should throw BadRequestException for invalid payload', async () => {
      await expect(
        adminService.createInscription({
          eventId: 'not-a-uuid',
          name: 'A',
          email: 'invalid',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('createInscription should throw BadRequestException when storage fails', async () => {
      vi.mocked(storageService.instance.createInscription).mockResolvedValue({
        success: false,
        error: new Error('duplicate inscription'),
      });

      await expect(
        adminService.createInscription({
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Alice Martin',
          email: 'alice@example.org',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('iteration43: createInscription should return created payload on success', async () => {
      const createdInscription = {
        id: 'ins-created-1',
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Alice Martin',
        email: 'alice@example.org',
        company: null,
        phone: null,
        comments: null,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(storageService.instance.createInscription).mockResolvedValue({
        success: true,
        data: createdInscription,
      });

      const result = await adminService.createInscription({
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Alice Martin',
        email: 'alice@example.org',
      });

      expect(result).toEqual(createdInscription);
    });

    it('deleteInscription should throw BadRequestException when storage fails', async () => {
      vi.mocked(storageService.instance.deleteInscription).mockResolvedValue({
        success: false,
        error: new Error('delete failed'),
      });

      await expect(adminService.deleteInscription('ins-1')).rejects.toThrow(BadRequestException);
    });

    it('deleteVote should throw BadRequestException when storage fails', async () => {
      vi.mocked(storageService.instance.deleteVote).mockResolvedValue({
        success: false,
        error: new Error('delete vote failed'),
      });

      await expect(adminService.deleteVote('vote-1')).rejects.toThrow(BadRequestException);
    });

    it('deleteVote should return success payload when storage succeeds', async () => {
      vi.mocked(storageService.instance.deleteVote).mockResolvedValue({
        success: true,
      });

      const result = await adminService.deleteVote('vote-1');

      expect(storageService.instance.deleteVote).toHaveBeenCalledWith('vote-1');
      expect(result).toEqual({ success: true });
    });

    it('getEventUnsubscriptions should throw BadRequestException on storage failure', async () => {
      vi.mocked(storageService.instance.getEventUnsubscriptions).mockResolvedValue({
        success: false,
        error: new Error('cannot list absences'),
      });

      await expect(adminService.getEventUnsubscriptions('event-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updateUnsubscription should throw BadRequestException for invalid payload', async () => {
      await expect(
        adminService.updateUnsubscription('uns-1', {
          name: '',
          email: 'bad-email',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updateUnsubscription should throw BadRequestException when storage fails', async () => {
      vi.mocked(storageService.instance.updateUnsubscription).mockResolvedValue({
        success: false,
        error: new Error('update absence failed'),
      });

      await expect(
        adminService.updateUnsubscription('uns-1', {
          name: 'Alice',
          email: 'alice@example.org',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Dashboard and health', () => {
    it('getAdminStats should return data', async () => {
      vi.mocked(storageService.instance.getAdminStats).mockResolvedValue({
        success: true,
        data: { ideas: 10, events: 3 },
      });

      const result = await adminService.getAdminStats();
      expect(result).toEqual({ success: true, data: { ideas: 10, events: 3 } });
    });

    it('getDatabaseHealth should throw on checker failure', async () => {
      vi.mocked(checkDatabaseHealth).mockRejectedValue(new Error('db down'));
      await expect(adminService.getDatabaseHealth()).rejects.toThrow(BadRequestException);
    });

    it('getPoolStats should expose process metrics envelope', async () => {
      const result = await adminService.getPoolStats();
      expect(result).toHaveProperty('pool');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('Error logs and email tests', () => {
    it('getErrorLogs should parse JSON lines, keep raw lines and reverse result order', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        '{"level":"error","msg":"first"}\nplain text line\n{"level":"warn","msg":"last"}\n',
      );

      const result = await adminService.getErrorLogs(2);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
      expect(result.data.errors).toEqual([
        { level: 'warn', msg: 'last' },
        { raw: 'plain text line' },
      ]);
    });

    it('getErrorLogs should return empty payload when file does not exist', async () => {
      const enoentError = new Error('missing log file') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValueOnce(enoentError);

      const result = await adminService.getErrorLogs();

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(0);
      expect(result.data.errors).toEqual([]);
      expect(result.data.message).toContain('No error log file found yet');
    });

    it('getErrorLogs should throw BadRequestException on unexpected fs error', async () => {
      const eaccesError = new Error('permission denied') as NodeJS.ErrnoException;
      eaccesError.code = 'EACCES';
      vi.mocked(fs.readFile).mockRejectedValueOnce(eaccesError);

      await expect(adminService.getErrorLogs()).rejects.toThrow(BadRequestException);
    });

    it('testEmailConfiguration should return success message', async () => {
      vi.mocked(emailNotificationService.testEmailConfiguration).mockResolvedValue({
        success: true,
      });

      const result = await adminService.testEmailConfiguration();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Email de test envoyé avec succès');
    });

    it('testEmailConfiguration should throw BadRequestException when provider fails', async () => {
      vi.mocked(emailNotificationService.testEmailConfiguration).mockResolvedValue({
        success: false,
        error: new Error('smtp error'),
      });

      await expect(adminService.testEmailConfiguration()).rejects.toThrow(BadRequestException);
    });

    it('testEmailSimple should throw BadRequestException when no usable destination is found', async () => {
      vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
        success: false,
        error: new Error('config missing'),
      });
      vi.mocked(storageService.instance.getAllAdmins).mockResolvedValue({
        success: true,
        data: [],
      });

      await expect(adminService.testEmailSimple()).rejects.toThrow(BadRequestException);
    });

    it('testEmailSimple should fallback to an active real admin email and return failure message on send error', async () => {
      vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
        success: true,
        data: {
          fromEmail: '',
          host: 'smtp.example.org',
        },
      });
      vi.mocked(storageService.instance.getAllAdmins).mockResolvedValue({
        success: true,
        data: [
          {
            email: 'setup@admin.cjd',
            isActive: true,
            status: 'active',
          },
          {
            email: 'real.admin@example.org',
            isActive: true,
            status: 'active',
          },
        ],
      });
      vi.mocked(emailService.sendEmail).mockResolvedValue({
        success: false,
        error: new Error('smtp rejected'),
      });

      const result = await adminService.testEmailSimple();

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['real.admin@example.org'],
        }),
      );
      expect(result.success).toBe(false);
      expect(result.message).toBe("Erreur lors de l'envoi");
    });
  });

  describe('Development requests mapping and filtering', () => {
    it('getDevelopmentRequests should map api filter and return API statuses', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'd1',
            title: 'Fix',
            description: 'Bug',
            type: 'bug',
            status: 'in_progress',
            priority: 'high',
            requestedBy: 'a@a.com',
            requestedByName: 'A',
          },
        ],
      });

      const result = await adminService.getDevelopmentRequests({ type: 'bug', status: 'open' });

      expect(storageService.instance.getDevelopmentRequests).toHaveBeenCalledWith({
        type: 'bug',
        status: 'open',
      });
      expect(result[0].status).toBe('in_progress');
    });

    it('updateDevelopmentRequest should throw NotFoundException when request is unknown', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [],
      });

      await expect(
        adminService.updateDevelopmentRequest('missing', { title: 'new title' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('getDevelopmentRequests should throw BadRequestException on storage failure', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
        error: new Error('list failed'),
      });

      await expect(adminService.getDevelopmentRequests()).rejects.toThrow(BadRequestException);
    });

    it('updateDevelopmentRequest should throw BadRequestException when list retrieval fails', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
        error: new Error('cannot list requests'),
      });

      await expect(
        adminService.updateDevelopmentRequest('dev-1', { title: 'Titre modifié' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updateDevelopmentRequest should throw BadRequestException when update fails', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-1',
            title: 'Ancien titre',
            description: 'Ancienne description',
            type: 'feature',
            status: 'in_progress',
            priority: 'medium',
            requestedBy: 'user@example.com',
            requestedByName: 'User Name',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: false,
        error: new Error('update failed'),
      });

      await expect(
        adminService.updateDevelopmentRequest('dev-1', { title: 'Nouveau titre' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updateDevelopmentRequest should pass undefined status when not provided', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-2',
            title: 'Titre',
            description: 'Description',
            type: 'feature',
            status: 'in_progress',
            priority: 'low',
            requestedBy: 'user@example.com',
            requestedByName: 'User Name',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-2',
          title: 'Titre mis à jour',
          description: 'Description',
          type: 'feature',
          status: 'in_progress',
          priority: 'low',
          requestedBy: 'user@example.com',
          requestedByName: 'User Name',
        },
      });

      const result = await adminService.updateDevelopmentRequest('dev-2', {
        title: 'Titre mis à jour',
      });

      expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith('dev-2', {
        status: undefined,
      });
      expect(result.status).toBe('in_progress');
    });

    it('updateDevelopmentRequest should sync linked GitHub issue when sync-triggering fields are provided', async () => {
      const updateGitHubIssueDetailsMock = vi.fn().mockResolvedValue({ number: 314, state: 'open' });
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          updateGitHubIssueDetails: updateGitHubIssueDetailsMock,
        };
      });

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-sync-update-1',
              title: 'Titre initial',
              description: 'Description initiale',
              type: 'feature',
              status: 'in_progress',
              priority: 'medium',
              requestedBy: 'user@example.com',
              requestedByName: 'User Name',
            },
          ],
        });
        vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
          success: true,
          data: {
            id: 'dev-sync-update-1',
            title: 'Titre synchronisé',
            description: 'Description suffisamment longue pour synchronisation.',
            type: 'bug',
            status: 'in_progress',
            priority: 'high',
            requestedBy: 'user@example.com',
            requestedByName: 'User Name',
            githubIssueNumber: 314,
          },
        });

        const result = await adminService.updateDevelopmentRequest('dev-sync-update-1', {
          title: 'Titre synchronisé',
          description: 'Description suffisamment longue pour synchronisation.',
          type: 'bug',
          status: 'open',
          priority: 'high',
        });

        expect(updateGitHubIssueDetailsMock).toHaveBeenCalledWith(
          314,
          expect.objectContaining({
            title: 'Titre synchronisé',
            state: 'open',
          }),
        );
        expect(result.status).toBe('in_progress');
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('updateDevelopmentRequest should throw BadRequestException on invalid payload (zod catch branch)', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-zod-update-1',
            title: 'Titre',
            description: 'Description',
            type: 'feature',
            status: 'open',
            priority: 'low',
            requestedBy: 'user@example.com',
            requestedByName: 'User Name',
          },
        ],
      });

      await expect(
        adminService.updateDevelopmentRequest('dev-zod-update-1', { status: 'invalid-status' }),
      ).rejects.toThrow(BadRequestException);

      expect(storageService.instance.updateDevelopmentRequest).not.toHaveBeenCalled();
    });

    it('syncDevelopmentRequestWithGitHub should throw BadRequestException when list retrieval fails', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
        error: new Error('sync list failed'),
      });

      await expect(adminService.syncDevelopmentRequestWithGitHub('dev-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('syncDevelopmentRequestWithGitHub should throw NotFoundException when request is missing', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [],
      });

      await expect(adminService.syncDevelopmentRequestWithGitHub('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('syncDevelopmentRequestWithGitHub should return skipped sync in non-production when githubIssueNumber is missing', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-3',
              title: 'Sans issue',
              description: 'Description',
              type: 'bug',
              status: 'open',
              priority: 'high',
              requestedBy: 'user@example.com',
              requestedByName: 'User Name',
            },
          ],
        });

        const result = await adminService.syncDevelopmentRequestWithGitHub('dev-3');

        expect(result.success).toBe(true);
        expect(result.message).toContain('ignorée');
        expect(result.data.status).toBe('pending');
      } finally {
        process.env.NODE_ENV = previousNodeEnv;
      }
    });

    it('syncDevelopmentRequestWithGitHub should return skipped sync when github status cannot be fetched in non-production', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const syncGitHubIssueStatusMock = vi.fn().mockResolvedValue(null);
      vi.doMock('../../utils/github-integration', () => ({
        syncGitHubIssueStatus: syncGitHubIssueStatusMock,
      }));

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-sync-1',
              title: 'Avec issue',
              description: 'Desc',
              type: 'feature',
              status: 'open',
              priority: 'high',
              requestedBy: 'user@example.com',
              requestedByName: 'User Name',
              githubIssueNumber: 55,
            },
          ],
        });

        const result = await adminService.syncDevelopmentRequestWithGitHub('dev-sync-1');

        expect(syncGitHubIssueStatusMock).toHaveBeenCalledWith(55);
        expect(result.success).toBe(true);
        expect(result.message).toContain('configuration manquante');
        expect(result.data.status).toBe('pending');
      } finally {
        vi.doUnmock('../../utils/github-integration');
        process.env.NODE_ENV = previousNodeEnv;
      }
    });

    it('syncDevelopmentRequestWithGitHub should throw in production when githubIssueNumber is missing', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-4',
              title: 'Sans issue prod',
              description: 'Description',
              type: 'feature',
              status: 'open',
              priority: 'medium',
              requestedBy: 'user@example.com',
              requestedByName: 'User Name',
            },
          ],
        });

        await expect(adminService.syncDevelopmentRequestWithGitHub('dev-4')).rejects.toThrow(
          BadRequestException,
        );
      } finally {
        process.env.NODE_ENV = previousNodeEnv;
      }
    });

    it('syncDevelopmentRequestWithGitHub should throw in production when github status cannot be fetched', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const syncGitHubIssueStatusMock = vi.fn().mockResolvedValue(null);
      vi.doMock('../../utils/github-integration', () => ({
        syncGitHubIssueStatus: syncGitHubIssueStatusMock,
      }));

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-sync-2',
              title: 'Avec issue prod',
              description: 'Desc',
              type: 'bug',
              status: 'open',
              priority: 'medium',
              requestedBy: 'user@example.com',
              requestedByName: 'User Name',
              githubIssueNumber: 56,
            },
          ],
        });

        await expect(adminService.syncDevelopmentRequestWithGitHub('dev-sync-2')).rejects.toThrow(
          BadRequestException,
        );
        expect(syncGitHubIssueStatusMock).toHaveBeenCalledWith(56);
      } finally {
        vi.doUnmock('../../utils/github-integration');
        process.env.NODE_ENV = previousNodeEnv;
      }
    });

    it('syncDevelopmentRequestWithGitHub should throw when storage update fails after github sync', async () => {
      const syncGitHubIssueStatusMock = vi.fn().mockResolvedValue({
        status: 'closed',
        labels: ['status-done'],
      });
      vi.doMock('../../utils/github-integration', () => ({
        syncGitHubIssueStatus: syncGitHubIssueStatusMock,
      }));

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-sync-3',
              title: 'Issue',
              description: 'Desc',
              type: 'feature',
              status: 'in_progress',
              priority: 'high',
              requestedBy: 'user@example.com',
              requestedByName: 'User Name',
              githubIssueNumber: 57,
            },
          ],
        });
        vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
          success: false,
          error: new Error('update sync failed'),
        });

        await expect(adminService.syncDevelopmentRequestWithGitHub('dev-sync-3')).rejects.toThrow(
          BadRequestException,
        );
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('syncDevelopmentRequestWithGitHub should return success payload and log when GitHub sync succeeds', async () => {
      const syncGitHubIssueStatusMock = vi.fn().mockResolvedValue({
        status: 'open',
        labels: ['status-in_progress'],
      });
      vi.doMock('../../utils/github-integration', () => ({
        syncGitHubIssueStatus: syncGitHubIssueStatusMock,
      }));
      const loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-sync-success-1',
              title: 'Issue sync',
              description: 'Desc',
              type: 'feature',
              status: 'open',
              priority: 'high',
              requestedBy: 'user@example.com',
              requestedByName: 'User Name',
              githubIssueNumber: 58,
            },
          ],
        });
        vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
          success: true,
          data: {
            id: 'dev-sync-success-1',
            title: 'Issue sync',
            description: 'Desc',
            type: 'feature',
            status: 'in_progress',
            priority: 'high',
            requestedBy: 'user@example.com',
            requestedByName: 'User Name',
            githubIssueNumber: 58,
            githubStatus: 'open',
          },
        });

        const result = await adminService.syncDevelopmentRequestWithGitHub('dev-sync-success-1');

        expect(syncGitHubIssueStatusMock).toHaveBeenCalledWith(58);
        expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith(
          'dev-sync-success-1',
          expect.objectContaining({
            githubStatus: 'open',
            status: 'in_progress',
            lastSyncedAt: expect.any(Date),
          }),
        );
        expect(loggerInfoSpy).toHaveBeenCalledWith(
          'GitHub sync successful',
          expect.objectContaining({ requestId: 'dev-sync-success-1', issueNumber: 58 }),
        );
        expect(result).toEqual({
          success: true,
          message: 'Synchronisation avec GitHub réussie',
          data: expect.objectContaining({
            id: 'dev-sync-success-1',
            status: 'in_progress',
          }),
        });
      } finally {
        loggerInfoSpy.mockRestore();
        vi.doUnmock('../../utils/github-integration');
      }
    });
  });

  describe('Feature and email config', () => {
    it('updateFeatureConfig should reject non-boolean enabled', async () => {
      await expect(
        adminService.updateFeatureConfig('ideas', 'true' as unknown as boolean, 'admin@x.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('getEmailConfig should return defaults when no config exists', async () => {
      vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await adminService.getEmailConfig();
      expect(result.success).toBe(true);
      expect(result.data.isDefault).toBe(true);
      expect(result.data.host).toBeTypeOf('string');
    });

    it('getEmailConfig should mask stored password', async () => {
      vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
        success: true,
        data: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          username: 'user',
          password: 'secret',
          fromEmail: 'noreply@example.com',
          fromName: 'CJD',
        },
      });

      const result = await adminService.getEmailConfig();
      expect(result.data.password).toBe('***');
    });

    it('iteration45: getEmailConfig should expose empty masked password when stored password is missing', async () => {
      vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
        success: true,
        data: {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          username: 'user',
          password: '',
          fromEmail: 'noreply@example.com',
          fromName: 'CJD',
        },
      });

      const result = await adminService.getEmailConfig();
      expect(result.data.password).toBe('');
    });

    it('getEmailConfig should throw when storage fails', async () => {
      vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
        success: false,
        error: new Error('smtp read failed'),
      });

      await expect(adminService.getEmailConfig()).rejects.toThrow(BadRequestException);
    });

    it('iteration45: getEmailConfig should fallback to Unknown error when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getEmailConfig>>);

      await expect(adminService.getEmailConfig()).rejects.toThrow('Unknown error');
    });

    it('updateEmailConfig should not persist masked password placeholder', async () => {
      vi.mocked(storageService.instance.updateEmailConfig).mockResolvedValue({
        success: true,
        data: { updated: true },
      });

      const result = await adminService.updateEmailConfig(
        {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          username: 'user',
          password: '***',
          fromEmail: 'noreply@example.com',
          fromName: 'CJD',
        },
        'admin@example.com',
      );

      expect(storageService.instance.updateEmailConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          password: undefined,
          provider: 'smtp',
        }),
        'admin@example.com',
      );
      expect(result.success).toBe(true);
    });

    it('updateEmailConfig should throw when storage update fails', async () => {
      vi.mocked(storageService.instance.updateEmailConfig).mockResolvedValue({
        success: false,
        error: new Error('smtp write failed'),
      });

      await expect(
        adminService.updateEmailConfig(
          {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'user',
            password: 'new-secret',
            fromEmail: 'noreply@example.com',
            fromName: 'CJD',
          },
          'admin@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('iteration45: updateEmailConfig should fallback to Unknown error when storage update fails without error payload', async () => {
      vi.mocked(storageService.instance.updateEmailConfig).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.updateEmailConfig>>);

      await expect(
        adminService.updateEmailConfig(
          {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'user',
            password: 'new-secret',
            fromEmail: 'noreply@example.com',
            fromName: 'CJD',
          },
          'admin@example.com',
        ),
      ).rejects.toThrow('Unknown error');
    });

    it('updateEmailConfig should succeed even when reloadConfig fails', async () => {
      vi.mocked(storageService.instance.updateEmailConfig).mockResolvedValue({
        success: true,
        data: { updated: true },
      });
      vi.mocked(emailService.reloadConfig).mockClear();
      vi.mocked(emailService.reloadConfig).mockRejectedValue(new Error('reload failed'));

      const result = await adminService.updateEmailConfig(
        {
          host: 'smtp.example.com',
          port: 465,
          secure: true,
          username: 'user',
          password: 'new-secret',
          fromEmail: 'noreply@example.com',
          fromName: 'CJD',
        },
        'admin@example.com',
      );

      expect(result.success).toBe(true);
      expect(emailService.reloadConfig).toHaveBeenCalled();
    });
  });

  // ===== Tests des Administrateurs (CRUD + RBAC) =====

  describe('Administrator Management - CRUD', () => {
    describe('getAllAdministrators', () => {
      it('should return all administrators with passwords sanitized', async () => {
        const mockAdmins = [
          {
            email: 'admin1@example.com',
            firstName: 'Admin',
            lastName: 'One',
            role: 'super_admin',
            isActive: true,
            password: 'hashed_password_1',
          },
          {
            email: 'admin2@example.com',
            firstName: 'Admin',
            lastName: 'Two',
            role: 'ideas_manager',
            isActive: true,
            password: 'hashed_password_2',
          },
        ];

        vi.mocked(storageService.instance.getAllAdmins).mockResolvedValue({
          success: true,
          data: mockAdmins,
        });

        const result = await adminService.getAllAdministrators();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data[0].password).toBeUndefined();
        expect(result.data[0].email).toBe('admin1@example.com');
        expect(result.data[1].role).toBe('ideas_manager');
      });

      it('should throw BadRequestException on storage error', async () => {
        const error = new Error('Database error');
        vi.mocked(storageService.instance.getAllAdmins).mockResolvedValue({
          success: false,
          error,
        });

        await expect(adminService.getAllAdministrators()).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('getPendingAdministrators', () => {
      it('should return pending administrators for approval', async () => {
        const mockPendingAdmins = [
          {
            email: 'pending@example.com',
            firstName: 'Pending',
            lastName: 'Admin',
            role: 'ideas_reader',
            isActive: false,
            password: 'hashed_password_3',
          },
        ];

        vi.mocked(storageService.instance.getPendingAdmins).mockResolvedValue({
          success: true,
          data: mockPendingAdmins,
        });

        const result = await adminService.getPendingAdministrators();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].email).toBe('pending@example.com');
        expect(result.data[0].password).toBeUndefined();
      });

      it('should throw BadRequestException when storage fails', async () => {
        const error = new Error('Database error');
        vi.mocked(storageService.instance.getPendingAdmins).mockResolvedValue({
          success: false,
          error,
        });

        await expect(adminService.getPendingAdministrators()).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('createAdministrator', () => {
      it('should create a new administrator with valid data', async () => {
        const createData = {
          email: 'newadmin@example.com',
          firstName: 'New',
          lastName: 'Admin',
          role: 'super_admin',
        };

        const mockCreatedAdmin = {
          ...createData,
          isActive: true,
          password: undefined,
        };

        vi.mocked(storageService.instance.createUser).mockResolvedValue({
          success: true,
          data: mockCreatedAdmin,
        });

        const result = await adminService.createAdministrator(
          createData,
          'creator@example.com',
        );

        expect(result.success).toBe(true);
        expect(result.data.email).toBe('newadmin@example.com');
        expect(result.data.role).toBe('super_admin');
        expect(result.message).toContain('succès');
      });

      it('should throw BadRequestException with invalid data', async () => {
        const invalidData = {
          email: 'newadmin@example.com',
          // Missing firstName, lastName, role
        };

        await expect(
          adminService.createAdministrator(invalidData, 'creator@example.com'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when storage fails', async () => {
        const createData = {
          email: 'newadmin@example.com',
          firstName: 'New',
          lastName: 'Admin',
          role: 'admin',
        };

        const error = new Error('Email already exists');
        vi.mocked(storageService.instance.createUser).mockResolvedValue({
          success: false,
          error,
        });

        await expect(
          adminService.createAdministrator(createData, 'creator@example.com'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fallback to Unknown error when createUser fails without error payload', async () => {
        const createData = {
          email: 'newadmin@example.com',
          firstName: 'New',
          lastName: 'Admin',
          role: 'super_admin',
        };

        vi.mocked(storageService.instance.createUser).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.createUser>>);

        await expect(
          adminService.createAdministrator(createData, 'creator@example.com'),
        ).rejects.toThrow('Unknown error');
      });

      it('should throw explicit required-fields message when parsed admin data is incomplete', async () => {
        await expect(
          adminService.createAdministrator(
            {
              email: 'newadmin@example.com',
              firstName: '',
              lastName: 'Admin',
              role: 'super_admin',
            },
            'creator@example.com',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('iteration43: should throw required-fields message when schema transform empties firstName', async () => {
        await expect(
          adminService.createAdministrator(
            {
              email: 'newadmin@example.com',
              firstName: '<>',
              lastName: 'Admin',
              role: 'super_admin',
            },
            'creator@example.com',
          ),
        ).rejects.toThrow('Tous les champs sont requis');
      });

      it('should rethrow non-zod errors from createAdministrator catch branch', async () => {
        const createData = {
          email: 'newadmin@example.com',
          firstName: 'New',
          lastName: 'Admin',
          role: 'super_admin',
        };

        vi.mocked(storageService.instance.createUser).mockRejectedValue(new Error('create user crashed'));

        await expect(
          adminService.createAdministrator(createData, 'creator@example.com'),
        ).rejects.toThrow('create user crashed');
      });
    });

    describe('deleteAdministrator', () => {
      it('should delete an administrator', async () => {
        vi.mocked(storageService.instance.deleteAdmin).mockResolvedValue({
          success: true,
        });

        const result = await adminService.deleteAdministrator(
          'admin@example.com',
          'currentuser@example.com',
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('succès');
        expect(storageService.instance.deleteAdmin).toHaveBeenCalledWith(
          'admin@example.com',
        );
      });

      it('should throw error when trying to delete self', async () => {
        const email = 'currentuser@example.com';

        await expect(
          adminService.deleteAdministrator(email, email),
        ).rejects.toThrow(BadRequestException);

        expect(storageService.instance.deleteAdmin).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException on storage error', async () => {
        const error = new Error('Database error');
        vi.mocked(storageService.instance.deleteAdmin).mockResolvedValue({
          success: false,
          error,
        });

        await expect(
          adminService.deleteAdministrator(
            'admin@example.com',
            'currentuser@example.com',
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  // ===== Tests des Permissions RBAC =====

  describe('Administrator Permissions - RBAC', () => {
    describe('updateAdministratorRole', () => {
      it('should update an administrator role', async () => {
        const mockUpdatedAdmin = {
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'ideas_manager',
          isActive: true,
        };

        vi.mocked(storageService.instance.updateAdminRole).mockResolvedValue({
          success: true,
          data: mockUpdatedAdmin,
        });

        const result = await adminService.updateAdministratorRole(
          'admin@example.com',
          'ideas_manager',
          'currentuser@example.com',
        );

        expect(result.success).toBe(true);
        expect(result.data.role).toBe('ideas_manager');
        expect(storageService.instance.updateAdminRole).toHaveBeenCalledWith(
          'admin@example.com',
          'ideas_manager',
        );
      });

      it('should prevent self-role modification', async () => {
        const email = 'admin@example.com';

        await expect(
          adminService.updateAdministratorRole(email, 'moderator', email),
        ).rejects.toThrow(BadRequestException);

        expect(storageService.instance.updateAdminRole).not.toHaveBeenCalled();
      });

      it('should throw error for invalid role', async () => {
        const invalidRole = 'invalid_role'; // Invalid role

        await expect(
          adminService.updateAdministratorRole(
            'admin@example.com',
            invalidRole,
            'currentuser@example.com',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw explicit message when role is missing after parsing', async () => {
        await expect(
          adminService.updateAdministratorRole(
            'admin@example.com',
            undefined,
            'currentuser@example.com',
          ),
        ).rejects.toThrow('Le rôle est requis');
      });

      it('should throw BadRequestException on storage error', async () => {
        const error = new Error('Update failed');
        vi.mocked(storageService.instance.updateAdminRole).mockResolvedValue({
          success: false,
          error,
        });

        await expect(
          adminService.updateAdministratorRole(
            'admin@example.com',
            'admin',
            'currentuser@example.com',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fallback to Unknown error when role update fails without error payload', async () => {
        vi.mocked(storageService.instance.updateAdminRole).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.updateAdminRole>>);

        await expect(
          adminService.updateAdministratorRole(
            'admin@example.com',
            'super_admin',
            'currentuser@example.com',
          ),
        ).rejects.toThrow('Unknown error');
      });
    });

    describe('updateAdministratorStatus', () => {
      it('should activate an administrator', async () => {
        const mockUpdatedAdmin = {
          id: '1',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isActive: true,
        };

        vi.mocked(storageService.instance.updateAdminStatus).mockResolvedValue({
          success: true,
          data: mockUpdatedAdmin,
        });

        const result = await adminService.updateAdministratorStatus(
          'admin@example.com',
          true,
          'currentuser@example.com',
        );

        expect(result.success).toBe(true);
        expect(result.data.isActive).toBe(true);
      });

      it('should deactivate an administrator', async () => {
        const mockUpdatedAdmin = {
          id: '1',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isActive: false,
        };

        vi.mocked(storageService.instance.updateAdminStatus).mockResolvedValue({
          success: true,
          data: mockUpdatedAdmin,
        });

        const result = await adminService.updateAdministratorStatus(
          'admin@example.com',
          false,
          'currentuser@example.com',
        );

        expect(result.success).toBe(true);
        expect(result.data.isActive).toBe(false);
      });

      it('should prevent self-deactivation', async () => {
        const email = 'admin@example.com';

        await expect(
          adminService.updateAdministratorStatus(email, false, email),
        ).rejects.toThrow(BadRequestException);

        expect(storageService.instance.updateAdminStatus).not.toHaveBeenCalled();
      });

      it('should throw error when invalid status type provided', async () => {
        await expect(
          adminService.updateAdministratorStatus(
            'admin@example.com',
            'invalid',
            'currentuser@example.com',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw explicit message when isActive is missing after parsing', async () => {
        await expect(
          adminService.updateAdministratorStatus(
            'admin@example.com',
            undefined,
            'currentuser@example.com',
          ),
        ).rejects.toThrow('Le statut actif est requis');
      });

      it('should fallback to Unknown error when status update fails without error payload', async () => {
        vi.mocked(storageService.instance.updateAdminStatus).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.updateAdminStatus>>);

        await expect(
          adminService.updateAdministratorStatus(
            'admin@example.com',
            true,
            'currentuser@example.com',
          ),
        ).rejects.toThrow('Unknown error');
      });
    });

    describe('approveAdministrator', () => {
      it('should approve a pending administrator with role assignment', async () => {
        const mockApprovedAdmin = {
          email: 'pending@example.com',
          firstName: 'Pending',
          lastName: 'Admin',
          role: 'ideas_manager',
          isActive: true,
        };

        vi.mocked(storageService.instance.approveAdmin).mockResolvedValue({
          success: true,
          data: mockApprovedAdmin,
        });

        const result = await adminService.approveAdministrator(
          'pending@example.com',
          'ideas_manager',
        );

        expect(result.success).toBe(true);
        expect(result.data.role).toBe('ideas_manager');
        expect(result.data.isActive).toBe(true);
        expect(result.message).toContain('succès');
      });

      it('should throw error for missing role', async () => {
        await expect(
          adminService.approveAdministrator('pending@example.com', null),
        ).rejects.toThrow(BadRequestException);

        expect(storageService.instance.approveAdmin).not.toHaveBeenCalled();
      });

      it('should throw error for invalid role', async () => {
        await expect(
          adminService.approveAdministrator(
            'pending@example.com',
            'invalid_role',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException on storage error', async () => {
        const error = new Error('Approval failed');
        vi.mocked(storageService.instance.approveAdmin).mockResolvedValue({
          success: false,
          error,
        });

        await expect(
          adminService.approveAdministrator('pending@example.com', 'super_admin'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('rejectAdministrator', () => {
      it('should reject a pending administrator (delete)', async () => {
        vi.mocked(storageService.instance.deleteAdmin).mockResolvedValue({
          success: true,
        });

        const result = await adminService.rejectAdministrator(
          'pending@example.com',
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('supprimé');
        expect(storageService.instance.deleteAdmin).toHaveBeenCalledWith(
          'pending@example.com',
        );
      });

      it('should throw BadRequestException on storage error', async () => {
        const error = new Error('Rejection failed');
        vi.mocked(storageService.instance.deleteAdmin).mockResolvedValue({
          success: false,
          error,
        });

        await expect(
          adminService.rejectAdministrator('pending@example.com'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('updateAdministratorInfo', () => {
      it('should update administrator information', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
        };

        const mockUpdatedAdmin = {
          id: '1',
          email: 'admin@example.com',
          firstName: 'Updated',
          lastName: 'Name',
          role: 'admin',
          isActive: true,
        };

        vi.mocked(storageService.instance.updateAdminInfo).mockResolvedValue({
          success: true,
          data: mockUpdatedAdmin,
        });

        const result = await adminService.updateAdministratorInfo(
          'admin@example.com',
          updateData,
          'currentuser@example.com',
        );

        expect(result.success).toBe(true);
        expect(result.data.firstName).toBe('Updated');
        expect(result.message).toContain('succès');
      });

      it('should prevent self-info modification', async () => {
        const email = 'admin@example.com';
        const updateData = { firstName: 'Updated' };

        await expect(
          adminService.updateAdministratorInfo(email, updateData, email),
        ).rejects.toThrow(BadRequestException);

        expect(storageService.instance.updateAdminInfo).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException with invalid data', async () => {
        const invalidData = {
          firstName: '', // Empty name
        };

        await expect(
          adminService.updateAdministratorInfo(
            'admin@example.com',
            invalidData,
            'currentuser@example.com',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException on storage error', async () => {
        const updateData = { firstName: 'Updated' };
        const error = new Error('Update failed');
        vi.mocked(storageService.instance.updateAdminInfo).mockResolvedValue({
          success: false,
          error,
        });

        await expect(
          adminService.updateAdministratorInfo(
            'admin@example.com',
            updateData,
            'currentuser@example.com',
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fallback to Unknown error when info update fails without error payload', async () => {
        vi.mocked(storageService.instance.updateAdminInfo).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.updateAdminInfo>>);

        await expect(
          adminService.updateAdministratorInfo(
            'admin@example.com',
            { firstName: 'Updated', lastName: 'Name' },
            'currentuser@example.com',
          ),
        ).rejects.toThrow('Unknown error');
      });

      it('should rethrow non-zod errors thrown by storage in updateAdministratorInfo', async () => {
        vi.mocked(storageService.instance.updateAdminInfo).mockRejectedValue(new Error('storage crashed'));

        await expect(
          adminService.updateAdministratorInfo(
            'admin@example.com',
            { firstName: 'Updated', lastName: 'Name' },
            'currentuser@example.com',
          ),
        ).rejects.toThrow('storage crashed');
      });
    });
  });

  // ===== Tests de la Création d'Administrateur =====

  describe('Administrator Creation', () => {
    it('should create administrator entry with hashed password', async () => {
      const userData = {
        email: 'newadmin@example.com',
        firstName: 'New',
        lastName: 'Admin',
        role: 'ideas_reader',
      };

      const mockCreatedAdmin = {
        ...userData,
        isActive: false, // Pending approval
        password: 'hashed-password', // StorageService handles hashing
      };

      vi.mocked(storageService.instance.createUser).mockResolvedValue({
        success: true,
        data: mockCreatedAdmin,
      });

      const result = await adminService.createAdministrator(
        userData,
        'admin@example.com',
      );

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('newadmin@example.com');
    });

    it('should handle concurrent admin creation requests', async () => {
      const mockAdmin = {
        email: 'concurrent@example.com',
        firstName: 'Concurrent',
        lastName: 'Admin',
        role: 'ideas_manager',
        isActive: true,
      };

      vi.mocked(storageService.instance.createUser)
        .mockResolvedValueOnce({ success: true, data: mockAdmin })
        .mockResolvedValueOnce({ success: true, data: mockAdmin });

      const results = await Promise.all([
        adminService.createAdministrator(
          { email: 'concurrent@example.com', firstName: 'Concurrent', lastName: 'Admin', role: 'ideas_manager' },
          'admin@example.com',
        ),
        adminService.createAdministrator(
          { email: 'concurrent@example.com', firstName: 'Concurrent', lastName: 'Admin', role: 'ideas_manager' },
          'admin@example.com',
        ),
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  // ===== Tests d'Intégrité et de Sécurité =====

  describe('Security & Integrity', () => {
    it('should never expose passwords in responses', async () => {
      const mockAdmins = [
        {
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'super_admin',
          isActive: true,
          password: 'super_secret_hash',
        },
      ];

      vi.mocked(storageService.instance.getAllAdmins).mockResolvedValue({
        success: true,
        data: mockAdmins,
      });

      const result = await adminService.getAllAdministrators();

      expect(result.data[0].password).toBeUndefined();
      result.data.forEach((admin) => {
        expect(admin.password).toBeUndefined();
      });
    });

    it('should prevent privilege escalation - non-admins cannot create admins', async () => {
      // This is enforced by the controller with Permissions guard,
      // but service should validate role is valid
      const invalidRole = 'hacker';

      await expect(
        adminService.createAdministrator(
          {
            email: 'hack@example.com',
            firstName: 'Hack',
            lastName: 'Attempt',
            role: invalidRole,
          },
          'viewer@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce business rule - cannot modify own account', async () => {
      const email = 'admin@example.com';

      // Cannot change own role
      await expect(
        adminService.updateAdministratorRole(email, 'moderator', email),
      ).rejects.toThrow();

      // Cannot deactivate self
      await expect(
        adminService.updateAdministratorStatus(email, false, email),
      ).rejects.toThrow();

      // Cannot delete self
      await expect(
        adminService.deleteAdministrator(email, email),
      ).rejects.toThrow();

      // Cannot modify own info
      await expect(
        adminService.updateAdministratorInfo(
          email,
          { firstName: 'Updated' },
          email,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Additional branch coverage - admin service', () => {
    it('updateIdeaStatus should delegate to ideasService', async () => {
      vi.mocked(ideasService.updateIdeaStatus).mockResolvedValue({
        success: true,
        data: { id: 'idea-1', status: 'approved' },
      } as unknown as Awaited<ReturnType<IdeasService['updateIdeaStatus']>>);

      const result = await adminService.updateIdeaStatus('idea-1', 'approved');

      expect(ideasService.updateIdeaStatus).toHaveBeenCalledWith('idea-1', 'approved');
      expect(result).toEqual({
        success: true,
        data: { id: 'idea-1', status: 'approved' },
      });
    });

    it('updateIdea should throw BadRequestException for invalid payload (zod branch)', async () => {
      await expect(
        adminService.updateIdea('idea-1', {
          title: '',
          proposedBy: 'A',
          proposedByEmail: 'bad-email',
          createdAt: 'not-a-date',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updateIdea should throw BadRequestException when storage update fails', async () => {
      vi.mocked(storageService.instance.updateIdea).mockResolvedValue({
        success: false,
        error: new Error('update failed'),
      });

      await expect(
        adminService.updateIdea('idea-1', {
          title: 'Titre corrigé',
          proposedBy: 'Alice Martin',
          proposedByEmail: 'alice@example.org',
          createdAt: '2032-01-01T10:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('iteration44: updateIdea should return success payload on valid data', async () => {
      const updatedIdea = {
        id: 'idea-1',
        title: 'Titre corrigé',
      };

      vi.mocked(storageService.instance.updateIdea).mockResolvedValue({
        success: true,
        data: updatedIdea,
      });

      const result = await adminService.updateIdea('idea-1', {
        title: 'Titre corrigé',
        proposedBy: 'Alice Martin',
        proposedByEmail: 'alice@example.org',
        createdAt: '2032-01-01T10:00:00.000Z',
      });

      expect(result).toEqual({
        success: true,
        data: updatedIdea,
      });
    });

    it('getVotesByIdea should delegate to ideasService', async () => {
      vi.mocked(ideasService.getVotesByIdea).mockResolvedValue({
        success: true,
        data: [{ id: 'vote-1' }],
      } as unknown as Awaited<ReturnType<IdeasService['getVotesByIdea']>>);

      const result = await adminService.getVotesByIdea('idea-9');

      expect(ideasService.getVotesByIdea).toHaveBeenCalledWith('idea-9');
      expect(result).toEqual({ success: true, data: [{ id: 'vote-1' }] });
    });

    it('createVote should delegate to ideasService', async () => {
      vi.mocked(ideasService.createVote).mockResolvedValue({
        success: true,
        data: { id: 'vote-2' },
      } as unknown as Awaited<ReturnType<IdeasService['createVote']>>);

      const payload = {
        ideaId: '550e8400-e29b-41d4-a716-446655440000',
        voterName: 'Jean Dupont',
        voterEmail: 'jean@example.org',
      };
      const result = await adminService.createVote(payload);

      expect(ideasService.createVote).toHaveBeenCalledWith(payload);
      expect(result).toEqual({ success: true, data: { id: 'vote-2' } });
    });

    it('deleteUnsubscription should return success message when deletion succeeds', async () => {
      vi.mocked(storageService.instance.deleteUnsubscription).mockResolvedValue({
        success: true,
      });

      const result = await adminService.deleteUnsubscription('unsub-1');

      expect(storageService.instance.deleteUnsubscription).toHaveBeenCalledWith('unsub-1');
      expect(result).toEqual({ message: 'Absence supprimée avec succès' });
    });

    it('deleteUnsubscription should fallback to Unknown error when failure has no error payload', async () => {
      vi.mocked(storageService.instance.deleteUnsubscription).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.deleteUnsubscription>>);

      await expect(adminService.deleteUnsubscription('unsub-1')).rejects.toThrow('Unknown error');
    });

    it('getFeatureConfig should throw BadRequestException on storage error', async () => {
      vi.mocked(storageService.instance.getFeatureConfig).mockResolvedValue({
        success: false,
        error: new Error('feature list failed'),
      });

      await expect(adminService.getFeatureConfig()).rejects.toThrow(BadRequestException);
    });

    it('getFeatureConfig should return data on success', async () => {
      vi.mocked(storageService.instance.getFeatureConfig).mockResolvedValue({
        success: true,
        data: [{ key: 'new_ideas_enabled', enabled: true }],
      });

      const result = await adminService.getFeatureConfig();

      expect(result).toEqual({
        success: true,
        data: [{ key: 'new_ideas_enabled', enabled: true }],
      });
    });

    it('updateFeatureConfig should return data on success', async () => {
      vi.mocked(storageService.instance.updateFeatureConfig).mockResolvedValue({
        success: true,
        data: { key: 'new_ideas_enabled', enabled: false, updatedBy: 'admin@example.org' },
      });

      const result = await adminService.updateFeatureConfig(
        'new_ideas_enabled',
        false,
        'admin@example.org',
      );

      expect(storageService.instance.updateFeatureConfig).toHaveBeenCalledWith(
        'new_ideas_enabled',
        false,
        'admin@example.org',
      );
      expect(result).toEqual({
        success: true,
        data: { key: 'new_ideas_enabled', enabled: false, updatedBy: 'admin@example.org' },
      });
    });

    it('updateFeatureConfig should throw when storage update fails', async () => {
      vi.mocked(storageService.instance.updateFeatureConfig).mockResolvedValue({
        success: false,
        error: new Error('feature update failed'),
      });

      await expect(
        adminService.updateFeatureConfig('new_ideas_enabled', true, 'admin@example.org'),
      ).rejects.toThrow(BadRequestException);
    });

    it('iteration45: updateFeatureConfig should fallback to Unknown error when storage update fails without error payload', async () => {
      vi.mocked(storageService.instance.updateFeatureConfig).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.updateFeatureConfig>>);

      await expect(
        adminService.updateFeatureConfig('new_ideas_enabled', true, 'admin@example.org'),
      ).rejects.toThrow('Unknown error');
    });

    it('createDevelopmentRequest should throw BadRequestException for invalid payload', async () => {
      await expect(
        adminService.createDevelopmentRequest(
          {
            title: 'abc',
            description: 'too short',
            type: 'feature',
            priority: 'high',
          },
          { email: 'admin@example.org', firstName: 'Admin', lastName: 'User' },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(storageService.instance.createDevelopmentRequest).not.toHaveBeenCalled();
    });

    it('createDevelopmentRequest should throw BadRequestException when storage creation fails', async () => {
      vi.mocked(storageService.instance.createDevelopmentRequest).mockResolvedValue({
        success: false,
        error: new Error('cannot create request'),
      });

      await expect(
        adminService.createDevelopmentRequest(
          {
            title: 'Demande de fonctionnalité robuste',
            description:
              'Description suffisamment longue pour passer la validation et tester le chemin erreur stockage.',
            type: 'feature',
            priority: 'high',
          },
          { email: 'admin@example.org', firstName: 'Admin', lastName: 'User' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('createDevelopmentRequest should create request and link GitHub issue when available', async () => {
      const createGitHubIssueMock = vi.fn().mockResolvedValue({
        number: 42,
        html_url: 'https://github.com/org/repo/issues/42',
      });
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          createGitHubIssue: createGitHubIssueMock,
        };
      });
      const loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);

      try {
        vi.mocked(storageService.instance.createDevelopmentRequest).mockResolvedValue({
          success: true,
          data: {
            id: 'dev-create-1',
            status: 'open',
            title: 'Demande de fonctionnalité robuste',
          },
        });
        vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
          success: true,
          data: { id: 'dev-create-1' },
        });

        const result = await adminService.createDevelopmentRequest(
          {
            title: 'Demande de fonctionnalité robuste',
            description:
              'Description suffisamment longue pour passer la validation et tester la synchronisation GitHub.',
            type: 'feature',
            priority: 'high',
          },
          { email: 'admin@example.org', firstName: 'Admin', lastName: 'User' },
        );

        await Promise.resolve();
        await Promise.resolve();

        expect(createGitHubIssueMock).toHaveBeenCalledTimes(1);
        expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith('dev-create-1', {
          githubIssueNumber: 42,
          githubIssueUrl: 'https://github.com/org/repo/issues/42',
        });
        expect(loggerInfoSpy).toHaveBeenCalledWith(
          'GitHub issue created and linked',
          expect.objectContaining({
            requestId: 'dev-create-1',
            issueNumber: 42,
          }),
        );
        expect(result).toEqual(
          expect.objectContaining({
            id: 'dev-create-1',
            status: 'pending',
          }),
        );
      } finally {
        loggerInfoSpy.mockRestore();
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('createDevelopmentRequest should not link GitHub issue when integration returns null', async () => {
      const createGitHubIssueMock = vi.fn().mockResolvedValue(null);
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          createGitHubIssue: createGitHubIssueMock,
        };
      });

      try {
        vi.mocked(storageService.instance.createDevelopmentRequest).mockResolvedValue({
          success: true,
          data: {
            id: 'dev-create-2',
            status: 'in_progress',
            title: 'Demande sans issue',
          },
        });

        const result = await adminService.createDevelopmentRequest(
          {
            title: 'Demande sans issue',
            description:
              'Description suffisamment longue pour passer la validation et tester le chemin githubIssue null.',
            type: 'bug',
            priority: 'low',
          },
          { email: 'admin@example.org', firstName: 'Admin', lastName: 'User' },
        );

        await Promise.resolve();

        expect(createGitHubIssueMock).toHaveBeenCalledTimes(1);
        expect(storageService.instance.updateDevelopmentRequest).not.toHaveBeenCalled();
        expect(result.status).toBe('in_progress');
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('createDevelopmentRequest should log GitHub integration errors and keep success response', async () => {
      const createGitHubIssueMock = vi.fn().mockRejectedValue(new Error('github down'));
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          createGitHubIssue: createGitHubIssueMock,
        };
      });
      const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

      try {
        vi.mocked(storageService.instance.createDevelopmentRequest).mockResolvedValue({
          success: true,
          data: {
            id: 'dev-create-3',
            status: 'open',
            title: 'Demande avec erreur github',
          },
        });

        const result = await adminService.createDevelopmentRequest(
          {
            title: 'Demande avec erreur github',
            description:
              'Description suffisamment longue pour déclencher le catch github et vérifier le log côté service.',
            type: 'feature',
            priority: 'medium',
          },
          { email: 'admin@example.org', firstName: 'Admin', lastName: 'User' },
        );

        await Promise.resolve();
        await Promise.resolve();

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'GitHub issue creation failed',
          expect.objectContaining({
            requestId: 'dev-create-3',
            error: expect.any(Error),
          }),
        );
        expect(result.status).toBe('pending');
      } finally {
        loggerErrorSpy.mockRestore();
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('createDevelopmentRequest should rethrow non-zod errors from storage layer', async () => {
      vi.mocked(storageService.instance.createDevelopmentRequest).mockRejectedValue(
        new Error('storage exploded'),
      );

      await expect(
        adminService.createDevelopmentRequest(
          {
            title: 'Demande avec exception stockage',
            description:
              'Description suffisamment longue pour passer la validation et atteindre le rethrow non-zod.',
            type: 'feature',
            priority: 'critical',
          },
          { email: 'admin@example.org', firstName: 'Admin', lastName: 'User' },
        ),
      ).rejects.toThrow('storage exploded');
    });

    it('updateDevelopmentRequestStatus should reject non-super-admin in production', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        await expect(
          adminService.updateDevelopmentRequestStatus(
            'dev-1',
            { status: 'open' },
            { email: 'manager@example.org', role: 'ideas_manager' },
          ),
        ).rejects.toThrow(BadRequestException);

        expect(storageService.instance.getDevelopmentRequests).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = previousNodeEnv;
      }
    });

    it('updateDevelopmentRequestStatus should throw when request list loading fails', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
        error: new Error('load failed'),
      });

      await expect(
        adminService.updateDevelopmentRequestStatus(
          'dev-1',
          { status: 'open' },
          { email: 'super@example.org', role: 'super_admin' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('updateDevelopmentRequestStatus should throw NotFoundException when request does not exist', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-existing', status: 'open', type: 'feature', priority: 'medium' }],
      });

      await expect(
        adminService.updateDevelopmentRequestStatus(
          'dev-404',
          { status: 'done' },
          { email: 'super@example.org', role: 'super_admin' },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('updateDevelopmentRequestStatus should update and return mapped status', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-2', status: 'open', type: 'feature', priority: 'high' }],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: true,
        data: { id: 'dev-2', status: 'closed' },
      });

      const result = await adminService.updateDevelopmentRequestStatus(
        'dev-2',
        { status: 'closed', adminComment: 'Livré' },
        { email: 'super@example.org', role: 'super_admin' },
      );

      expect(storageService.instance.updateDevelopmentRequestStatus).toHaveBeenCalledWith(
        'dev-2',
        'closed',
        'Livré',
        'super@example.org',
      );
      expect(result).toEqual({
        id: 'dev-2',
        status: 'done',
      });
    });

    it('updateDevelopmentRequestStatus should sync linked GitHub issue and persist sync metadata', async () => {
      const updateGitHubIssueStatusMock = vi.fn().mockResolvedValue({ state: 'closed' });
      vi.doMock('../../utils/github-integration', () => ({
        updateGitHubIssueStatus: updateGitHubIssueStatusMock,
      }));

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-2b',
            status: 'open',
            type: 'feature',
            priority: 'high',
            githubIssueNumber: 456,
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: true,
        data: { id: 'dev-2b', status: 'cancelled' },
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: { id: 'dev-2b', githubStatus: 'closed' },
      });

      try {
        const result = await adminService.updateDevelopmentRequestStatus(
          'dev-2b',
          { status: 'cancelled', adminComment: 'Annulé côté admin' },
          { email: 'super@example.org', role: 'super_admin' },
        );

        expect(updateGitHubIssueStatusMock).toHaveBeenCalledWith(
          456,
          'closed',
          expect.arrayContaining(['status-cancelled']),
        );
        expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith(
          'dev-2b',
          expect.objectContaining({
            githubStatus: 'closed',
            lastSyncedAt: expect.any(Date),
          }),
        );
        expect(result).toEqual({
          id: 'dev-2b',
          status: 'cancelled',
        });
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('updateDevelopmentRequestStatus should throw BadRequestException on invalid payload (zod catch)', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-zod', status: 'open', type: 'feature', priority: 'low' }],
      });

      await expect(
        adminService.updateDevelopmentRequestStatus(
          'dev-zod',
          { status: 'invalid-status' },
          { email: 'super@example.org', role: 'super_admin' },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(storageService.instance.updateDevelopmentRequestStatus).not.toHaveBeenCalled();
    });

    it('syncDevelopmentRequestFromGitHub should return success=false when no linked request exists', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-77',
            githubIssueNumber: 100,
            title: 'Demande 77',
            status: 'open',
          },
        ],
      });

      const result = await adminService.syncDevelopmentRequestFromGitHub({
        issueNumber: 101,
        issueUrl: 'https://github.com/org/repo/issues/101',
        state: 'open',
        labels: ['feature'],
      });

      expect(result).toEqual({
        success: false,
        message: 'Aucune demande liée à cette issue',
      });
    });

    it('syncDevelopmentRequestFromGitHub should throw when request list loading fails', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
        error: new Error('github sync listing failed'),
      });

      await expect(
        adminService.syncDevelopmentRequestFromGitHub({
          issueNumber: 7,
          issueUrl: 'https://github.com/org/repo/issues/7',
          state: 'open',
          labels: ['feature'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('syncDevelopmentRequestFromGitHub should throw when update fails', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-3', githubIssueNumber: 123, title: 'Titre actuel', status: 'open' }],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: false,
        error: new Error('github sync update failed'),
      });

      await expect(
        adminService.syncDevelopmentRequestFromGitHub({
          issueNumber: 123,
          issueUrl: 'https://github.com/org/repo/issues/123',
          state: 'closed',
          labels: ['status-done'],
          title: 'Titre mis à jour',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('syncDevelopmentRequestFromGitHub should update title and map returned status', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-4', githubIssueNumber: 321, title: 'Titre initial', status: 'open' }],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: { id: 'dev-4', status: 'in_progress', title: 'Titre GitHub' },
      });

      const result = await adminService.syncDevelopmentRequestFromGitHub({
        issueNumber: 321,
        issueUrl: 'https://github.com/org/repo/issues/321',
        state: 'open',
        labels: ['status-in_progress'],
        title: 'Titre GitHub',
      });

      expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith(
        'dev-4',
        expect.objectContaining({
          status: 'in_progress',
          githubStatus: 'open',
          githubIssueUrl: 'https://github.com/org/repo/issues/321',
          title: 'Titre GitHub',
        }),
      );
      expect(result).toEqual({
        success: true,
        data: { id: 'dev-4', status: 'in_progress', title: 'Titre GitHub' },
      });
    });

    it('deleteDevelopmentRequest should return success message', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-5', title: 'Demande locale', status: 'open' }],
      });
      vi.mocked(storageService.instance.deleteDevelopmentRequest).mockResolvedValue({
        success: true,
      });

      const result = await adminService.deleteDevelopmentRequest('dev-5');

      expect(storageService.instance.deleteDevelopmentRequest).toHaveBeenCalledWith('dev-5');
      expect(result).toEqual({
        success: true,
        message: 'Demande supprimée avec succès',
      });
    });

    it('deleteDevelopmentRequest should still delete when prefetch requests call fails', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
        error: new Error('prefetch failed'),
      });
      vi.mocked(storageService.instance.deleteDevelopmentRequest).mockResolvedValue({
        success: true,
      });

      const result = await adminService.deleteDevelopmentRequest('dev-7');

      expect(storageService.instance.deleteDevelopmentRequest).toHaveBeenCalledWith('dev-7');
      expect(result.success).toBe(true);
    });

    it('deleteDevelopmentRequest should close linked GitHub issue when present', async () => {
      const closeGitHubIssueMock = vi.fn().mockResolvedValue(true);
      vi.doMock('../../utils/github-integration', () => ({
        closeGitHubIssue: closeGitHubIssueMock,
      }));

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-6', title: 'Demande GitHub', status: 'open', githubIssueNumber: 88 }],
      });
      vi.mocked(storageService.instance.deleteDevelopmentRequest).mockResolvedValue({
        success: true,
      });

      try {
        await adminService.deleteDevelopmentRequest('dev-6');
        expect(closeGitHubIssueMock).toHaveBeenCalledWith(88, 'not_planned');
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('deleteDevelopmentRequest should log and continue when GitHub close fails asynchronously', async () => {
      const closeGitHubIssueMock = vi.fn().mockRejectedValue(new Error('github close failed'));
      vi.doMock('../../utils/github-integration', () => ({
        closeGitHubIssue: closeGitHubIssueMock,
      }));
      const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-6b', title: 'Demande GitHub', status: 'open', githubIssueNumber: 99 }],
      });
      vi.mocked(storageService.instance.deleteDevelopmentRequest).mockResolvedValue({
        success: true,
      });

      try {
        const result = await adminService.deleteDevelopmentRequest('dev-6b');
        await Promise.resolve();

        expect(closeGitHubIssueMock).toHaveBeenCalledWith(99, 'not_planned');
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'GitHub issue close failed',
          expect.objectContaining({ issueNumber: 99, error: expect.any(Error) }),
        );
        expect(result).toEqual({ success: true, message: 'Demande supprimée avec succès' });
      } finally {
        loggerErrorSpy.mockRestore();
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('deleteDevelopmentRequest should throw when storage deletion fails', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-8', title: 'Demande', status: 'open' }],
      });
      vi.mocked(storageService.instance.deleteDevelopmentRequest).mockResolvedValue({
        success: false,
        error: new Error('delete failed'),
      });

      await expect(adminService.deleteDevelopmentRequest('dev-8')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updateDevelopmentRequestStatus should throw when storage status update fails', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-9', status: 'open', type: 'feature', priority: 'low' }],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: false,
        error: new Error('status update failed'),
      });

      await expect(
        adminService.updateDevelopmentRequestStatus(
          'dev-9',
          { status: 'closed' },
          { email: 'super@example.org', role: 'super_admin' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Iteration Batch 9 - Branch fallback coverage', () => {
    it('getDatabaseHealth should return checker payload on success', async () => {
      vi.mocked(checkDatabaseHealth).mockResolvedValue({
        status: 'ok',
        checks: { database: true },
      } as unknown as Awaited<ReturnType<typeof checkDatabaseHealth>>);

      const result = await adminService.getDatabaseHealth();
      expect(result).toEqual({
        status: 'ok',
        checks: { database: true },
      });
    });

    it('getEventUnsubscriptions should return data on success path', async () => {
      vi.mocked(storageService.instance.getEventUnsubscriptions).mockResolvedValue({
        success: true,
        data: [{ id: 'abs-1', email: 'member@example.org' }],
      });

      const result = await adminService.getEventUnsubscriptions('event-success');
      expect(result).toEqual([{ id: 'abs-1', email: 'member@example.org' }]);
    });

    it('deleteUnsubscription should return success message on success path', async () => {
      vi.mocked(storageService.instance.deleteUnsubscription).mockResolvedValue({
        success: true,
      });

      const result = await adminService.deleteUnsubscription('uns-success');
      expect(result).toEqual({ message: 'Absence supprimée avec succès' });
    });

    it('updateUnsubscription should return updated entity on success path', async () => {
      vi.mocked(storageService.instance.updateUnsubscription).mockResolvedValue({
        success: true,
        data: { id: 'uns-ok', name: 'Alice', email: 'alice@example.org' },
      });

      const result = await adminService.updateUnsubscription('uns-ok', {
        name: 'Alice',
        email: 'alice@example.org',
      });

      expect(result).toEqual({ id: 'uns-ok', name: 'Alice', email: 'alice@example.org' });
    });

    it('getDevelopmentRequests should fallback to Unknown error when storage returns no error object', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getDevelopmentRequests>>);

      await expect(adminService.getDevelopmentRequests()).rejects.toThrow('Unknown error');
    });

    it('getAdminStats should fallback to Unknown error when storage returns no error object', async () => {
      vi.mocked(storageService.instance.getAdminStats).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getAdminStats>>);

      await expect(adminService.getAdminStats()).rejects.toThrow('Unknown error');
    });

    it('bulkCreateInscriptions should fallback to Unknown error for failed row without error payload', async () => {
      vi.mocked(storageService.instance.createInscription).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.createInscription>>);

      const result = await adminService.bulkCreateInscriptions('event-unknown', [
        { name: 'Bob', email: 'bob@example.org' },
      ]);

      expect(result.success).toBe(false);
      expect(result.errorMessages[0]).toContain('Unknown error');
    });
  });

  describe('Final block iterations 46-51', () => {
    describe('iteration46 - ideas/events fallback branches', () => {
      it('iteration46: getAllIdeas should propagate storage error message when error payload exists', async () => {
        vi.mocked(storageService.instance.getAllIdeas).mockResolvedValue({
          success: false,
          error: new Error('ideas list failed'),
        });

        await expect(adminService.getAllIdeas()).rejects.toThrow('ideas list failed');
      });

      it('iteration46: getAllEvents should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.getAllEvents).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.getAllEvents>>);

        await expect(adminService.getAllEvents()).rejects.toThrow('Unknown error');
      });

      it('iteration46: updateEvent should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.updateEvent).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.updateEvent>>);

        await expect(
          adminService.updateEvent('event-fallback', {
            title: 'Event valide',
            description: 'Description valide',
            date: new Date().toISOString(),
            location: 'Amiens',
            maxParticipants: 30,
            isActive: true,
          }),
        ).rejects.toThrow('Unknown error');
      });

      it('iteration46: updateEventStatus should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.updateEventStatus).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.updateEventStatus>>);

        await expect(adminService.updateEventStatus('event-fallback', 'published')).rejects.toThrow(
          'Unknown error',
        );
      });

      it('iteration46: getEventInscriptions should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.getEventInscriptions).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.getEventInscriptions>>);

        await expect(adminService.getEventInscriptions('event-fallback')).rejects.toThrow('Unknown error');
      });

      it('iteration46: getFeatureConfig should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.getFeatureConfig).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.getFeatureConfig>>);

        await expect(adminService.getFeatureConfig()).rejects.toThrow('Unknown error');
      });
    });

    describe('iteration47 - CRUD fallback branches', () => {
      it('iteration47: createInscription should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.createInscription).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.createInscription>>);

        await expect(
          adminService.createInscription({
            eventId: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Alice Martin',
            email: 'alice@example.org',
          }),
        ).rejects.toThrow('Unknown error');
      });

      it('iteration47: deleteInscription should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.deleteInscription).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.deleteInscription>>);

        await expect(adminService.deleteInscription('ins-fallback')).rejects.toThrow('Unknown error');
      });

      it('iteration47: deleteVote should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.deleteVote).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.deleteVote>>);

        await expect(adminService.deleteVote('vote-fallback')).rejects.toThrow('Unknown error');
      });

      it('iteration47: getAllAdministrators should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.getAllAdmins).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.getAllAdmins>>);

        await expect(adminService.getAllAdministrators()).rejects.toThrow('Unknown error');
      });

      it('iteration47: getPendingAdministrators should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.getPendingAdmins).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.getPendingAdmins>>);

        await expect(adminService.getPendingAdministrators()).rejects.toThrow('Unknown error');
      });
    });

    describe('iteration48 - admin management error payload branches', () => {
      it('iteration48: createAdministrator should throw storage error when valid role reaches createUser', async () => {
        vi.mocked(storageService.instance.createUser).mockResolvedValue({
          success: false,
          error: new Error('create user failed'),
        });

        await expect(
          adminService.createAdministrator(
            {
              email: 'role-valid@example.org',
              firstName: 'Role',
              lastName: 'Valid',
              role: 'ideas_manager',
            },
            'creator@example.org',
          ),
        ).rejects.toThrow('create user failed');
      });

      it('iteration48: updateAdministratorRole should throw storage error with valid role input', async () => {
        vi.mocked(storageService.instance.updateAdminRole).mockResolvedValue({
          success: false,
          error: new Error('role update failed'),
        });

        await expect(
          adminService.updateAdministratorRole(
            'admin-role@example.org',
            'ideas_manager',
            'other-admin@example.org',
          ),
        ).rejects.toThrow('role update failed');
      });

      it('iteration48: updateAdministratorStatus should throw storage error with valid status input', async () => {
        vi.mocked(storageService.instance.updateAdminStatus).mockResolvedValue({
          success: false,
          error: new Error('status update failed'),
        });

        await expect(
          adminService.updateAdministratorStatus(
            'admin-status@example.org',
            true,
            'other-admin@example.org',
          ),
        ).rejects.toThrow('status update failed');
      });

      it('iteration48: updateAdministratorInfo should throw storage error with valid payload', async () => {
        vi.mocked(storageService.instance.updateAdminInfo).mockResolvedValue({
          success: false,
          error: new Error('info update failed'),
        });

        await expect(
          adminService.updateAdministratorInfo(
            'admin-info@example.org',
            {
              firstName: 'Updated',
              lastName: 'Admin',
              notificationEmail: 'notify@example.org',
            },
            'other-admin@example.org',
          ),
        ).rejects.toThrow('info update failed');
      });

      it('iteration48: deleteAdministrator should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.deleteAdmin).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.deleteAdmin>>);

        await expect(
          adminService.deleteAdministrator('to-delete@example.org', 'other-admin@example.org'),
        ).rejects.toThrow('Unknown error');
      });

      it('iteration48: approveAdministrator should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.approveAdmin).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.approveAdmin>>);

        await expect(
          adminService.approveAdministrator('pending@example.org', 'ideas_reader'),
        ).rejects.toThrow('Unknown error');
      });

      it('iteration48: rejectAdministrator should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.deleteAdmin).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.deleteAdmin>>);

        await expect(adminService.rejectAdministrator('pending@example.org')).rejects.toThrow('Unknown error');
      });

      it('iteration48: getAdminStats should throw storage error message when error payload exists', async () => {
        vi.mocked(storageService.instance.getAdminStats).mockResolvedValue({
          success: false,
          error: new Error('stats unavailable'),
        });

        await expect(adminService.getAdminStats()).rejects.toThrow('stats unavailable');
      });
    });

    describe('iteration49 - development/create and bulk edge branches', () => {
      it('iteration49: updateUnsubscription should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.updateUnsubscription).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.updateUnsubscription>>);

        await expect(
          adminService.updateUnsubscription('uns-fallback', {
            name: 'Alice',
            email: 'alice@example.org',
          }),
        ).rejects.toThrow('Unknown error');
      });

      it('iteration49: bulkCreateInscriptions should use email when name is missing in invalid-entry error text', async () => {
        const result = await adminService.bulkCreateInscriptions('event-branch', [
          { email: 'no-name@example.org' },
        ]);

        expect(result.success).toBe(false);
        expect(result.errorMessages[0]).toContain('no-name@example.org');
      });

      it('iteration49: bulkCreateInscriptions should use default placeholder when both name and email are missing', async () => {
        const result = await adminService.bulkCreateInscriptions('event-branch', [{}]);

        expect(result.success).toBe(false);
        expect(result.errorMessages[0]).toContain('inscription inconnue');
      });

      it('iteration49: createDevelopmentRequest should fallback to Unknown error when storage fails without error payload', async () => {
        vi.mocked(storageService.instance.createDevelopmentRequest).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.createDevelopmentRequest>>);

        await expect(
          adminService.createDevelopmentRequest(
            {
              title: 'Titre développement valide',
              description: 'Description suffisamment longue pour valider la demande.',
              type: 'feature',
              priority: 'medium',
            },
            { email: 'requester@example.org', firstName: 'Requester', lastName: 'User' },
          ),
        ).rejects.toThrow('Unknown error');
      });

      it('iteration49: createDevelopmentRequest should fallback requestedByName to requester email when first/last names are empty', async () => {
        let capturedRequestedByName = '';
        vi.mocked(storageService.instance.createDevelopmentRequest).mockImplementation(
          async (payload: unknown) => {
            const typed = payload as { requestedByName?: string; status?: string };
            capturedRequestedByName = typed.requestedByName ?? '';
            return {
              success: true,
              data: {
                id: 'dev-name-fallback',
                title: 'Titre développement valide',
                description: 'Description suffisamment longue pour valider la demande.',
                type: 'feature',
                priority: 'medium',
                requestedBy: 'requester@example.org',
                requestedByName: capturedRequestedByName,
                status: typed.status ?? 'open',
              },
            };
          },
        );

        const result = await adminService.createDevelopmentRequest(
          {
            title: 'Titre développement valide',
            description: 'Description suffisamment longue pour valider la demande.',
            type: 'feature',
            priority: 'medium',
          },
          { email: 'requester@example.org', firstName: '', lastName: '' },
        );

        expect(capturedRequestedByName).toBe('requester@example.org');
        expect(result.requestedByName).toBe('requester@example.org');
      });
    });

    describe('iteration50 - updateDevelopmentRequest sync branches', () => {
      it('iteration50: updateDevelopmentRequest should fallback to Unknown error when list retrieval fails without error payload', async () => {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.getDevelopmentRequests>>);

        await expect(
          adminService.updateDevelopmentRequest('dev-missing-list', { title: 'Titre modifié' }),
        ).rejects.toThrow('Unknown error');
      });

      it('iteration50: updateDevelopmentRequest should fallback to Unknown error when update fails without error payload', async () => {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-upd-fallback',
              title: 'Titre initial',
              description: 'Description initiale suffisamment longue.',
              type: 'feature',
              status: 'in_progress',
              priority: 'medium',
              requestedBy: 'user@example.org',
              requestedByName: 'User Name',
            },
          ],
        });
        vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.updateDevelopmentRequest>>);

        await expect(
          adminService.updateDevelopmentRequest('dev-upd-fallback', { title: 'Titre modifié' }),
        ).rejects.toThrow('Unknown error');
      });

      it('iteration50: updateDevelopmentRequest should skip GitHub sync when issue exists but no sync-triggering field is provided', async () => {
        const updateGitHubIssueDetailsMock = vi.fn();
        vi.doMock('../../utils/github-integration', async () => {
          const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
            '../../utils/github-integration',
          );
          return {
            ...actual,
            updateGitHubIssueDetails: updateGitHubIssueDetailsMock,
          };
        });

        try {
          vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
            success: true,
            data: [
              {
                id: 'dev-no-sync',
                title: 'Titre initial',
                description: 'Description initiale suffisamment longue.',
                type: 'feature',
                status: 'in_progress',
                priority: 'medium',
                requestedBy: 'user@example.org',
                requestedByName: 'User Name',
              },
            ],
          });
          vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
            success: true,
            data: {
              id: 'dev-no-sync',
              title: 'Titre initial',
              description: 'Description initiale suffisamment longue.',
              type: 'feature',
              status: 'in_progress',
              priority: 'medium',
              requestedBy: 'user@example.org',
              requestedByName: 'User Name',
              githubIssueNumber: 777,
            },
          });

          const result = await adminService.updateDevelopmentRequest('dev-no-sync', {});

          expect(updateGitHubIssueDetailsMock).not.toHaveBeenCalled();
          expect(result.id).toBe('dev-no-sync');
        } finally {
          vi.doUnmock('../../utils/github-integration');
        }
      });
    });

    describe('iteration51 - email-testing fallback branches', () => {
      it('iteration51: testEmailConfiguration should fallback to Unknown error when provider fails without error payload', async () => {
        vi.mocked(emailNotificationService.testEmailConfiguration).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof emailNotificationService.testEmailConfiguration>>);

        await expect(adminService.testEmailConfiguration()).rejects.toThrow('Unknown error');
      });

      it('iteration51: testEmailConfiguration should use generic fallback message when provider error message is empty', async () => {
        vi.mocked(emailNotificationService.testEmailConfiguration).mockResolvedValue({
          success: false,
          error: new Error(''),
        });

        await expect(adminService.testEmailConfiguration()).rejects.toThrow('Erreur lors du test email');
      });

      it('iteration51: testEmailSimple should use SMTP fromEmail directly and succeed', async () => {
        vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
          success: true,
          data: {
            fromEmail: 'smtp-owner@example.org',
            host: '',
          },
        });
        vi.mocked(emailService.sendEmail).mockResolvedValue({
          success: true,
        } as unknown as Awaited<ReturnType<typeof emailService.sendEmail>>);

        const result = await adminService.testEmailSimple();

        expect(storageService.instance.getAllAdmins).not.toHaveBeenCalled();
        expect(emailService.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: ['smtp-owner@example.org'],
          }),
        );
        expect(result.success).toBe(true);
        expect(result.message).toContain('Email envoyé à smtp-owner@example.org');
      });

      it('iteration51: testEmailSimple should fail when no fromEmail and admins lookup is unsuccessful', async () => {
        vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
          success: true,
          data: {
            fromEmail: '',
            host: 'smtp.example.org',
          },
        });
        vi.mocked(storageService.instance.getAllAdmins).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.getAllAdmins>>);

        await expect(adminService.testEmailSimple()).rejects.toThrow(BadRequestException);
      });

      it('iteration51: testEmailSimple should return failure message when email send fails without error payload', async () => {
        vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
          success: true,
          data: {
            fromEmail: 'smtp-owner@example.org',
            host: 'smtp.example.org',
          },
        });
        vi.mocked(emailService.sendEmail).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof emailService.sendEmail>>);

        const result = await adminService.testEmailSimple();

        expect(result.success).toBe(false);
        expect(result.message).toBe("Erreur lors de l'envoi");
      });
    });
  });

  describe('New cycle iterations 52-61', () => {
    it('iteration52: syncDevelopmentRequestFromGitHub should fallback to Unknown error when request listing fails without error payload', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getDevelopmentRequests>>);

      await expect(
        adminService.syncDevelopmentRequestFromGitHub({
          issueNumber: 501,
          issueUrl: 'https://github.com/org/repo/issues/501',
          state: 'open',
          labels: ['feature'],
        }),
      ).rejects.toThrow('Unknown error');
    });

    it('iteration53: syncDevelopmentRequestFromGitHub should fallback to Unknown error when update fails without error payload', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-53', githubIssueNumber: 53, title: 'Titre actuel', status: 'open' }],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.updateDevelopmentRequest>>);

      await expect(
        adminService.syncDevelopmentRequestFromGitHub({
          issueNumber: 53,
          issueUrl: 'https://github.com/org/repo/issues/53',
          state: 'closed',
          labels: ['status-done'],
          title: 'Titre mis à jour',
        }),
      ).rejects.toThrow('Unknown error');
    });

    it('iteration54: syncDevelopmentRequestFromGitHub should not patch title when incoming title matches existing one', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-54', githubIssueNumber: 54, title: 'Titre identique', status: 'open' }],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: { id: 'dev-54', status: 'in_progress', title: 'Titre identique' },
      });

      await adminService.syncDevelopmentRequestFromGitHub({
        issueNumber: 54,
        issueUrl: 'https://github.com/org/repo/issues/54',
        state: 'open',
        labels: ['status-in_progress'],
        title: 'Titre identique',
      });

      const updatePayload = vi.mocked(storageService.instance.updateDevelopmentRequest).mock.calls.at(-1)?.[1] as
        | Record<string, unknown>
        | undefined;
      expect(updatePayload).toBeDefined();
      expect(updatePayload).not.toHaveProperty('title');
    });

    it('iteration55: deleteDevelopmentRequest should fallback to Unknown error when deletion fails without error payload', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-55', title: 'Demande', status: 'open' }],
      });
      vi.mocked(storageService.instance.deleteDevelopmentRequest).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.deleteDevelopmentRequest>>);

      await expect(adminService.deleteDevelopmentRequest('dev-55')).rejects.toThrow('Unknown error');
    });

    it('iteration56: testEmailSimple should throw when fromEmail is empty and admins payload is undefined despite success=true', async () => {
      vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
        success: true,
        data: {
          fromEmail: '',
          host: 'smtp.example.org',
        },
      });
      vi.mocked(storageService.instance.getAllAdmins).mockResolvedValue({
        success: true,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getAllAdmins>>);

      await expect(adminService.testEmailSimple()).rejects.toThrow(BadRequestException);
    });

    it('iteration57: testEmailSimple should fallback to first active admin when no real-domain email exists', async () => {
      vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
        success: true,
        data: {
          fromEmail: '',
          host: 'smtp.example.org',
        },
      });
      vi.mocked(storageService.instance.getAllAdmins).mockResolvedValue({
        success: true,
        data: [
          { email: 'setup@admin.cjd', isActive: true, status: 'active' },
          { email: 'team@admin.cjd', isActive: true, status: 'active' },
        ],
      });
      vi.mocked(emailService.sendEmail).mockResolvedValue({
        success: true,
      } as unknown as Awaited<ReturnType<typeof emailService.sendEmail>>);

      const result = await adminService.testEmailSimple();

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: ['setup@admin.cjd'] }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('setup@admin.cjd');
    });

    it('iteration58: getFeatureConfig should throw storage error message when error payload exists', async () => {
      vi.mocked(storageService.instance.getFeatureConfig).mockResolvedValue({
        success: false,
        error: new Error('feature read hard-fail'),
      });

      await expect(adminService.getFeatureConfig()).rejects.toThrow('feature read hard-fail');
    });

    it('iteration59: getFeatureConfig should fallback to Unknown error when error payload is missing', async () => {
      vi.mocked(storageService.instance.getFeatureConfig).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getFeatureConfig>>);

      await expect(adminService.getFeatureConfig()).rejects.toThrow('Unknown error');
    });

    it('iteration60: updateFeatureConfig should throw storage error message when error payload exists', async () => {
      vi.mocked(storageService.instance.updateFeatureConfig).mockResolvedValue({
        success: false,
        error: new Error('feature write hard-fail'),
      });

      await expect(
        adminService.updateFeatureConfig('new_ideas_enabled', true, 'admin60@example.org'),
      ).rejects.toThrow('feature write hard-fail');
    });

    it('iteration61: updateFeatureConfig should fallback to Unknown error when error payload is missing', async () => {
      vi.mocked(storageService.instance.updateFeatureConfig).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.updateFeatureConfig>>);

      await expect(
        adminService.updateFeatureConfig('new_ideas_enabled', true, 'admin61@example.org'),
      ).rejects.toThrow('Unknown error');
    });
  });

  describe('New cycle iterations 62-71', () => {
    it('iteration62: updateDevelopmentRequestStatus should fallback to Unknown error when loading requests fails without error payload', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getDevelopmentRequests>>);

      await expect(
        adminService.updateDevelopmentRequestStatus(
          'dev-62',
          { status: 'open' },
          { email: 'super62@example.org', role: 'super_admin' },
        ),
      ).rejects.toThrow('Unknown error');
    });

    it('iteration63: updateDevelopmentRequestStatus should fallback to Unknown error when status update fails without error payload', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-63', status: 'open', type: 'feature', priority: 'high' }],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.updateDevelopmentRequestStatus>>);

      await expect(
        adminService.updateDevelopmentRequestStatus(
          'dev-63',
          { status: 'closed' },
          { email: 'super63@example.org', role: 'super_admin' },
        ),
      ).rejects.toThrow('Unknown error');
    });

    it('iteration64: updateDevelopmentRequestStatus should sync GitHub issue using open target state for non-closed statuses', async () => {
      const updateGitHubIssueStatusMock = vi.fn().mockResolvedValue({ state: 'open' });
      vi.doMock('../../utils/github-integration', () => ({
        updateGitHubIssueStatus: updateGitHubIssueStatusMock,
      }));

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-64',
            status: 'open',
            type: 'feature',
            priority: 'medium',
            githubIssueNumber: 640,
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: true,
        data: { id: 'dev-64', status: 'in_progress' },
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: { id: 'dev-64', githubStatus: 'open' },
      });

      try {
        const result = await adminService.updateDevelopmentRequestStatus(
          'dev-64',
          { status: 'in_progress', adminComment: 'En cours' },
          { email: 'super64@example.org', role: 'super_admin' },
        );

        expect(updateGitHubIssueStatusMock).toHaveBeenCalledWith(
          640,
          'open',
          expect.arrayContaining(['enhancement', 'priority-medium', 'status-in_progress']),
        );
        expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith(
          'dev-64',
          expect.objectContaining({
            githubStatus: 'open',
            lastSyncedAt: expect.any(Date),
          }),
        );
        expect(result).toEqual({
          id: 'dev-64',
          status: 'in_progress',
        });
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration65: updateDevelopmentRequestStatus should skip sync metadata persistence when GitHub update returns null', async () => {
      const updateGitHubIssueStatusMock = vi.fn().mockResolvedValue(null);
      vi.doMock('../../utils/github-integration', () => ({
        updateGitHubIssueStatus: updateGitHubIssueStatusMock,
      }));

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-65',
            status: 'open',
            type: 'feature',
            priority: 'low',
            githubIssueNumber: 650,
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: true,
        data: { id: 'dev-65', status: 'closed' },
      });

      try {
        const result = await adminService.updateDevelopmentRequestStatus(
          'dev-65',
          { status: 'closed', adminComment: 'Fermeture sans payload GitHub' },
          { email: 'super65@example.org', role: 'super_admin' },
        );

        expect(updateGitHubIssueStatusMock).toHaveBeenCalled();
        expect(storageService.instance.updateDevelopmentRequest).not.toHaveBeenCalled();
        expect(result).toEqual({
          id: 'dev-65',
          status: 'done',
        });
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration66: updateDevelopmentRequestStatus should build bug labels for linked GitHub issue', async () => {
      const updateGitHubIssueStatusMock = vi.fn().mockResolvedValue({ state: 'open' });
      vi.doMock('../../utils/github-integration', () => ({
        updateGitHubIssueStatus: updateGitHubIssueStatusMock,
      }));

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-66',
            status: 'open',
            type: 'bug',
            priority: 'critical',
            githubIssueNumber: 660,
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: true,
        data: { id: 'dev-66', status: 'open' },
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: { id: 'dev-66', githubStatus: 'open' },
      });

      try {
        await adminService.updateDevelopmentRequestStatus(
          'dev-66',
          { status: 'open', adminComment: 'Réouverture' },
          { email: 'super66@example.org', role: 'super_admin' },
        );

        expect(updateGitHubIssueStatusMock).toHaveBeenCalledWith(
          660,
          'open',
          expect.arrayContaining(['bug', 'priority-critical', 'status-pending']),
        );
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration67: updateDevelopmentRequestStatus should persist returned closed GitHub state in sync metadata', async () => {
      const updateGitHubIssueStatusMock = vi.fn().mockResolvedValue({ state: 'closed' });
      vi.doMock('../../utils/github-integration', () => ({
        updateGitHubIssueStatus: updateGitHubIssueStatusMock,
      }));

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-67',
            status: 'in_progress',
            type: 'feature',
            priority: 'high',
            githubIssueNumber: 670,
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: true,
        data: { id: 'dev-67', status: 'closed' },
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: { id: 'dev-67', githubStatus: 'closed' },
      });

      try {
        await adminService.updateDevelopmentRequestStatus(
          'dev-67',
          { status: 'closed', adminComment: 'Terminé' },
          { email: 'super67@example.org', role: 'super_admin' },
        );

        expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith(
          'dev-67',
          expect.objectContaining({
            githubStatus: 'closed',
            lastSyncedAt: expect.any(Date),
          }),
        );
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration68: updateDevelopmentRequestStatus should not call GitHub update when request has no githubIssueNumber', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-68', status: 'open', type: 'feature', priority: 'low' }],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: true,
        data: { id: 'dev-68', status: 'closed' },
      });

      const result = await adminService.updateDevelopmentRequestStatus(
        'dev-68',
        { status: 'closed' },
        { email: 'super68@example.org', role: 'super_admin' },
      );

      expect(storageService.instance.updateDevelopmentRequest).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'dev-68',
        status: 'done',
      });
    });

    it('iteration69: updateDevelopmentRequestStatus should pass undefined adminComment when omitted', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-69', status: 'open', type: 'feature', priority: 'low' }],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: true,
        data: { id: 'dev-69', status: 'open' },
      });

      await adminService.updateDevelopmentRequestStatus(
        'dev-69',
        { status: 'open' },
        { email: 'super69@example.org', role: 'super_admin' },
      );

      expect(storageService.instance.updateDevelopmentRequestStatus).toHaveBeenCalledWith(
        'dev-69',
        'open',
        undefined,
        'super69@example.org',
      );
    });

    it('iteration70: updateDevelopmentRequestStatus should map cancelled storage status back to cancelled API status', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-70', status: 'open', type: 'feature', priority: 'medium' }],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequestStatus).mockResolvedValue({
        success: true,
        data: { id: 'dev-70', status: 'cancelled' },
      });

      const result = await adminService.updateDevelopmentRequestStatus(
        'dev-70',
        { status: 'cancelled', adminComment: 'Annulée' },
        { email: 'super70@example.org', role: 'super_admin' },
      );

      expect(result).toEqual({
        id: 'dev-70',
        status: 'cancelled',
      });
    });

    it('iteration71: updateDevelopmentRequestStatus should throw NotFoundException before any status update when id is unknown', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [{ id: 'dev-known-71', status: 'open', type: 'feature', priority: 'low' }],
      });

      await expect(
        adminService.updateDevelopmentRequestStatus(
          'dev-71',
          { status: 'in_progress' },
          { email: 'super71@example.org', role: 'super_admin' },
        ),
      ).rejects.toThrow(NotFoundException);

      expect(storageService.instance.updateDevelopmentRequestStatus).not.toHaveBeenCalled();
    });
  });

  describe('New cycle iterations 72-81', () => {
    it('iteration72: updateDevelopmentRequest should build GitHub body with bug marker when content fields are updated', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-72',
            title: 'Titre initial',
            description: 'Description initiale',
            type: 'feature',
            status: 'open',
            priority: 'low',
            requestedBy: 'author72@example.org',
            requestedByName: 'Author 72',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-72',
          title: 'Titre bug',
          description: 'Description bug détaillée',
          type: 'bug',
          status: 'in_progress',
          priority: 'high',
          requestedBy: 'author72@example.org',
          requestedByName: 'Author 72',
          githubIssueNumber: 720,
        },
      });

      const result = await adminService.updateDevelopmentRequest('dev-72', {
        title: 'Titre bug',
        description: 'Description bug détaillée',
        type: 'bug',
        priority: 'high',
      });

      expect(result.status).toBe('in_progress');
    });

    it('iteration73: updateDevelopmentRequest should build GitHub body with feature marker when type is feature', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-73',
            title: 'Titre initial',
            description: 'Description initiale',
            type: 'bug',
            status: 'open',
            priority: 'medium',
            requestedBy: 'author73@example.org',
            requestedByName: 'Author 73',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-73',
          title: 'Titre feature',
          description: 'Description feature',
          type: 'feature',
          status: 'open',
          priority: 'medium',
          requestedBy: 'author73@example.org',
          requestedByName: 'Author 73',
          githubIssueNumber: 730,
        },
      });

      const result = await adminService.updateDevelopmentRequest('dev-73', {
        description: 'Description feature',
        type: 'feature',
      });

      expect(result.status).toBe('pending');
    });

    it('iteration74: updateDevelopmentRequest should keep GitHub body undefined when only title changes', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-74',
            title: 'Titre initial',
            description: 'Description initiale',
            type: 'feature',
            status: 'open',
            priority: 'low',
            requestedBy: 'author74@example.org',
            requestedByName: 'Author 74',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-74',
          title: 'Titre mis à jour',
          description: 'Description initiale',
          type: 'feature',
          status: 'open',
          priority: 'low',
          requestedBy: 'author74@example.org',
          requestedByName: 'Author 74',
          githubIssueNumber: 740,
        },
      });

      const result = await adminService.updateDevelopmentRequest('dev-74', {
        title: 'Titre mis à jour',
      });

      expect(result.status).toBe('pending');
    });

    it('iteration75: updateDevelopmentRequest should send closed state to GitHub for cancelled requests', async () => {
      const updateGitHubIssueDetailsMock = vi.fn().mockResolvedValue({ number: 750, state: 'closed' });
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          updateGitHubIssueDetails: updateGitHubIssueDetailsMock,
        };
      });

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-75',
              title: 'Titre',
              description: 'Description',
              type: 'feature',
              status: 'open',
              priority: 'critical',
              requestedBy: 'author75@example.org',
              requestedByName: 'Author 75',
            },
          ],
        });
        vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
          success: true,
          data: {
            id: 'dev-75',
            title: 'Titre',
            description: 'Description',
            type: 'feature',
            status: 'cancelled',
            priority: 'critical',
            requestedBy: 'author75@example.org',
            requestedByName: 'Author 75',
            githubIssueNumber: 750,
          },
        });

        await adminService.updateDevelopmentRequest('dev-75', {
          status: 'cancelled',
          priority: 'critical',
        });

        expect(updateGitHubIssueDetailsMock).toHaveBeenCalledWith(
          750,
          expect.objectContaining({
            state: 'closed',
            labels: expect.arrayContaining(['status-cancelled']),
          }),
        );
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration76: syncDevelopmentRequestWithGitHub should fallback to Unknown error when list retrieval fails without error payload', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getDevelopmentRequests>>);

      await expect(adminService.syncDevelopmentRequestWithGitHub('dev-76')).rejects.toThrow(
        'Unknown error',
      );
    });

    it('iteration77: syncDevelopmentRequestWithGitHub should fallback to Unknown error when storage update fails without error payload', async () => {
      const syncGitHubIssueStatusMock = vi.fn().mockResolvedValue({
        status: 'closed',
        labels: ['status-done'],
      });
      vi.doMock('../../utils/github-integration', () => ({
        syncGitHubIssueStatus: syncGitHubIssueStatusMock,
      }));

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-77',
              title: 'Issue 77',
              description: 'Desc 77',
              type: 'feature',
              status: 'open',
              priority: 'high',
              requestedBy: 'author77@example.org',
              requestedByName: 'Author 77',
              githubIssueNumber: 770,
            },
          ],
        });
        vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.updateDevelopmentRequest>>);

        await expect(adminService.syncDevelopmentRequestWithGitHub('dev-77')).rejects.toThrow(
          'Unknown error',
        );
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration78: syncDevelopmentRequestWithGitHub should map closed GitHub state without labels to done', async () => {
      const syncGitHubIssueStatusMock = vi.fn().mockResolvedValue({
        status: 'closed',
        labels: [],
      });
      vi.doMock('../../utils/github-integration', () => ({
        syncGitHubIssueStatus: syncGitHubIssueStatusMock,
      }));

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-78',
              title: 'Issue 78',
              description: 'Desc 78',
              type: 'feature',
              status: 'open',
              priority: 'medium',
              requestedBy: 'author78@example.org',
              requestedByName: 'Author 78',
              githubIssueNumber: 780,
            },
          ],
        });
        vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
          success: true,
          data: {
            id: 'dev-78',
            status: 'closed',
          },
        });

        const result = await adminService.syncDevelopmentRequestWithGitHub('dev-78');

        expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith(
          'dev-78',
          expect.objectContaining({
            status: 'closed',
          }),
        );
        expect(result.data.status).toBe('done');
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration79: syncDevelopmentRequestWithGitHub should map explicit pending label to open storage status', async () => {
      const syncGitHubIssueStatusMock = vi.fn().mockResolvedValue({
        status: 'open',
        labels: ['status-pending'],
      });
      vi.doMock('../../utils/github-integration', () => ({
        syncGitHubIssueStatus: syncGitHubIssueStatusMock,
      }));

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-79',
              title: 'Issue 79',
              description: 'Desc 79',
              type: 'bug',
              status: 'in_progress',
              priority: 'low',
              requestedBy: 'author79@example.org',
              requestedByName: 'Author 79',
              githubIssueNumber: 790,
            },
          ],
        });
        vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
          success: true,
          data: {
            id: 'dev-79',
            status: 'open',
          },
        });

        const result = await adminService.syncDevelopmentRequestWithGitHub('dev-79');

        expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith(
          'dev-79',
          expect.objectContaining({
            status: 'open',
          }),
        );
        expect(result.data.status).toBe('pending');
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration80: updateDevelopmentRequest should throw Unknown error when storage update fails without error payload', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-80',
            title: 'Titre',
            description: 'Description',
            type: 'feature',
            status: 'open',
            priority: 'low',
            requestedBy: 'author80@example.org',
            requestedByName: 'Author 80',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.updateDevelopmentRequest>>);

      await expect(adminService.updateDevelopmentRequest('dev-80', { title: 'Nouveau titre' })).rejects.toThrow(
        'Unknown error',
      );
    });

    it('iteration81: updateDevelopmentRequest should skip GitHub sync when githubIssueNumber is absent even with sync-triggering fields', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-81',
            title: 'Titre initial',
            description: 'Description initiale',
            type: 'feature',
            status: 'open',
            priority: 'medium',
            requestedBy: 'author81@example.org',
            requestedByName: 'Author 81',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-81',
          title: 'Titre sync',
          description: 'Description sync',
          type: 'bug',
          status: 'in_progress',
          priority: 'high',
          requestedBy: 'author81@example.org',
          requestedByName: 'Author 81',
        },
      });

      const result = await adminService.updateDevelopmentRequest('dev-81', {
        description: 'Description sync',
        type: 'bug',
        priority: 'high',
      });

      expect(result.status).toBe('in_progress');
    });
  });

  describe('New cycle iterations 82-91', () => {
    it('iteration82: getEventUnsubscriptions should throw Unknown error fallback when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.getEventUnsubscriptions).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getEventUnsubscriptions>>);

      await expect(adminService.getEventUnsubscriptions('event-82')).rejects.toThrow('Unknown error');
    });

    it('iteration83: deleteUnsubscription should throw Unknown error fallback when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.deleteUnsubscription).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.deleteUnsubscription>>);

      await expect(adminService.deleteUnsubscription('uns-83')).rejects.toThrow('Unknown error');
    });

    it('iteration84: updateDevelopmentRequest should execute GitHub body branch with bug type when description is updated', async () => {
      const updateGitHubIssueDetailsMock = vi.fn().mockResolvedValue({ number: 840, state: 'open' });
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          updateGitHubIssueDetails: updateGitHubIssueDetailsMock,
        };
      });

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-84',
            title: 'Titre initial 84',
            description: 'Description initiale 84 suffisamment longue',
            type: 'feature',
            status: 'open',
            priority: 'low',
            requestedBy: 'author84@example.org',
            requestedByName: 'Author 84',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-84',
          title: 'Titre 84 mis à jour',
          description: 'Description 84 mise à jour, suffisamment longue pour la validation',
          type: 'bug',
          status: 'in_progress',
          priority: 'high',
          requestedBy: 'author84@example.org',
          requestedByName: 'Author 84',
          githubIssueNumber: 840,
        },
      });

      const parseSpy = vi.spyOn(adminDto.updateDevelopmentRequestDto, 'parse').mockReturnValue({
        description: 'Description 84 mise à jour, suffisamment longue pour la validation',
        type: 'bug',
        priority: 'high',
      });

      try {
        const result = await adminService.updateDevelopmentRequest('dev-84', {
          description: 'Description 84 mise à jour, suffisamment longue pour la validation',
          type: 'bug',
          priority: 'high',
        });

        expect(result.status).toBe('in_progress');
        expect(updateGitHubIssueDetailsMock).toHaveBeenCalledWith(
          840,
          expect.objectContaining({
            body: expect.stringContaining('**Description:**'),
            state: 'open',
          }),
        );
      } finally {
        parseSpy.mockRestore();
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration85: updateDevelopmentRequest should execute GitHub body branch with feature type when type is feature', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-85',
            title: 'Titre initial 85',
            description: 'Description initiale 85 suffisamment longue',
            type: 'bug',
            status: 'open',
            priority: 'medium',
            requestedBy: 'author85@example.org',
            requestedByName: 'Author 85',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-85',
          title: 'Titre 85',
          description: 'Description 85 mise à jour avec assez de contenu',
          type: 'feature',
          status: 'open',
          priority: 'medium',
          requestedBy: 'author85@example.org',
          requestedByName: 'Author 85',
          githubIssueNumber: 850,
        },
      });

      const result = await adminService.updateDevelopmentRequest('dev-85', {
        description: 'Description 85 mise à jour avec assez de contenu',
        type: 'feature',
      });

      expect(result.status).toBe('pending');
      expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith('dev-85', {
        status: undefined,
      });
    });

    it('iteration86: updateDevelopmentRequest should map closed storage status to done when sync fields are present', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-86',
            title: 'Titre 86',
            description: 'Description 86 initiale suffisamment longue',
            type: 'feature',
            status: 'open',
            priority: 'critical',
            requestedBy: 'author86@example.org',
            requestedByName: 'Author 86',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-86',
          title: 'Titre 86',
          description: 'Description 86 mise à jour suffisamment longue',
          type: 'feature',
          status: 'closed',
          priority: 'critical',
          requestedBy: 'author86@example.org',
          requestedByName: 'Author 86',
          githubIssueNumber: 860,
        },
      });

      const result = await adminService.updateDevelopmentRequest('dev-86', {
        description: 'Description 86 mise à jour suffisamment longue',
        priority: 'critical',
      });

      expect(result.status).toBe('done');
    });

    it('iteration87: updateDevelopmentRequest should map open storage status to pending when sync fields are present', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-87',
            title: 'Titre 87',
            description: 'Description 87 initiale suffisamment longue',
            type: 'feature',
            status: 'in_progress',
            priority: 'low',
            requestedBy: 'author87@example.org',
            requestedByName: 'Author 87',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-87',
          title: 'Titre 87',
          description: 'Description 87 mise à jour suffisamment longue',
          type: 'feature',
          status: 'open',
          priority: 'low',
          requestedBy: 'author87@example.org',
          requestedByName: 'Author 87',
          githubIssueNumber: 870,
        },
      });

      const result = await adminService.updateDevelopmentRequest('dev-87', {
        description: 'Description 87 mise à jour suffisamment longue',
      });

      expect(result.status).toBe('pending');
    });

    it('iteration88: updateDevelopmentRequest should use provided title and status normalization when closing request', async () => {
      const updateGitHubIssueDetailsMock = vi.fn().mockResolvedValue({ number: 880, state: 'closed' });
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          updateGitHubIssueDetails: updateGitHubIssueDetailsMock,
        };
      });

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-88',
            title: 'Titre 88 initial',
            description: 'Description 88 initiale suffisamment longue',
            type: 'feature',
            status: 'open',
            priority: 'medium',
            requestedBy: 'author88@example.org',
            requestedByName: 'Author 88',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-88',
          title: 'Titre 88 fermé',
          description: 'Description 88 inchangée mais valide',
          type: 'feature',
          status: 'closed',
          priority: 'medium',
          requestedBy: 'author88@example.org',
          requestedByName: 'Author 88',
          githubIssueNumber: 880,
        },
      });

      try {
        const result = await adminService.updateDevelopmentRequest('dev-88', {
          title: 'Titre 88 fermé',
          status: 'closed',
        });

        expect(storageService.instance.updateDevelopmentRequest).toHaveBeenCalledWith('dev-88', {
          status: 'closed',
        });
        expect(updateGitHubIssueDetailsMock).toHaveBeenCalledWith(
          880,
          expect.objectContaining({
            state: 'closed',
          }),
        );
        expect(result.status).toBe('done');
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration89: syncDevelopmentRequestWithGitHub should throw Unknown error fallback when list retrieval fails without error payload', async () => {
      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getDevelopmentRequests>>);

      await expect(adminService.syncDevelopmentRequestWithGitHub('dev-89')).rejects.toThrow(
        'Unknown error',
      );
    });

    it('iteration90: syncDevelopmentRequestWithGitHub should throw Unknown error fallback when storage update fails without error payload', async () => {
      const syncGitHubIssueStatusMock = vi.fn().mockResolvedValue({
        status: 'open',
        labels: ['status-in_progress'],
      });
      vi.doMock('../../utils/github-integration', () => ({
        syncGitHubIssueStatus: syncGitHubIssueStatusMock,
      }));

      try {
        vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
          success: true,
          data: [
            {
              id: 'dev-90',
              title: 'Issue 90',
              description: 'Desc 90',
              type: 'feature',
              status: 'open',
              priority: 'high',
              requestedBy: 'author90@example.org',
              requestedByName: 'Author 90',
              githubIssueNumber: 900,
            },
          ],
        });
        vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
          success: false,
        } as unknown as Awaited<ReturnType<typeof storageService.instance.updateDevelopmentRequest>>);

        await expect(adminService.syncDevelopmentRequestWithGitHub('dev-90')).rejects.toThrow(
          'Unknown error',
        );
      } finally {
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration91: getEventUnsubscriptions should still return data on success path after fallback scenarios', async () => {
      vi.mocked(storageService.instance.getEventUnsubscriptions).mockResolvedValue({
        success: true,
        data: [
          { id: 'u91-a', email: 'u91a@example.org' },
          { id: 'u91-b', email: 'u91b@example.org' },
        ],
      });

      const result = await adminService.getEventUnsubscriptions('event-91');
      expect(result).toEqual([
        { id: 'u91-a', email: 'u91a@example.org' },
        { id: 'u91-b', email: 'u91b@example.org' },
      ]);
    });
  });

  describe('New cycle iterations 92-101', () => {
    it('iteration92: updateIdea should throw Unknown error fallback when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.updateIdea).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.updateIdea>>);

      await expect(
        adminService.updateIdea('idea-92', {
          title: 'Titre robuste 92',
          proposedBy: 'Alice Martin',
          proposedByEmail: 'alice92@example.org',
          createdAt: '2032-01-01T10:00:00.000Z',
        }),
      ).rejects.toThrow('Unknown error');
    });

    it('iteration93: updateIdea should propagate storage error message when update fails with explicit error payload', async () => {
      vi.mocked(storageService.instance.updateIdea).mockResolvedValue({
        success: false,
        error: new Error('update idea explicit failure 93'),
      });

      await expect(
        adminService.updateIdea('idea-93', {
          title: 'Titre robuste 93',
          proposedBy: 'Bob Martin',
          proposedByEmail: 'bob93@example.org',
          createdAt: '2033-02-02T10:00:00.000Z',
        }),
      ).rejects.toThrow('update idea explicit failure 93');
    });

    it('iteration94: updateEventStatus should propagate storage error message when explicit error payload is present', async () => {
      vi.mocked(storageService.instance.updateEventStatus).mockResolvedValue({
        success: false,
        error: new Error('event status explicit failure 94'),
      });

      await expect(adminService.updateEventStatus('event-94', 'published')).rejects.toThrow(
        'event status explicit failure 94',
      );
    });

    it('iteration95: deleteUnsubscription should propagate storage error message when explicit error payload is present', async () => {
      vi.mocked(storageService.instance.deleteUnsubscription).mockResolvedValue({
        success: false,
        error: new Error('delete unsubscription explicit failure 95'),
      });

      await expect(adminService.deleteUnsubscription('uns-95')).rejects.toThrow(
        'delete unsubscription explicit failure 95',
      );
    });

    it('iteration96: updateDevelopmentRequest should build GitHub body with bug marker when request type is bug', async () => {
      const updateGitHubIssueDetailsMock = vi.fn().mockResolvedValue({ number: 960, state: 'open' });
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          updateGitHubIssueDetails: updateGitHubIssueDetailsMock,
        };
      });

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-96',
            title: 'Titre 96 initial',
            description: 'Description initiale 96 suffisamment longue',
            type: 'feature',
            status: 'open',
            priority: 'low',
            requestedBy: 'author96@example.org',
            requestedByName: 'Author 96',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-96',
          title: 'Titre 96',
          description: 'Description 96 mise à jour suffisamment longue pour le body',
          type: 'bug',
          status: 'in_progress',
          priority: 'high',
          requestedBy: 'author96@example.org',
          requestedByName: 'Author 96',
          githubIssueNumber: 960,
        },
      });

      const parseSpy = vi.spyOn(adminDto.updateDevelopmentRequestDto, 'parse').mockReturnValue({
        description: 'Description 96 mise à jour suffisamment longue pour le body',
        type: 'bug',
        priority: 'high',
      });

      try {
        await adminService.updateDevelopmentRequest('dev-96', {
          description: 'Description 96 mise à jour suffisamment longue pour le body',
          type: 'bug',
          priority: 'high',
        });

        expect(updateGitHubIssueDetailsMock).toHaveBeenCalledWith(
          960,
          expect.objectContaining({
            body: expect.stringContaining('**Type:** 🐛 Bug'),
            state: 'open',
          }),
        );
      } finally {
        parseSpy.mockRestore();
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration97: updateDevelopmentRequest should build GitHub body with feature marker when request type is feature', async () => {
      const updateGitHubIssueDetailsMock = vi.fn().mockResolvedValue({ number: 970, state: 'open' });
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          updateGitHubIssueDetails: updateGitHubIssueDetailsMock,
        };
      });

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-97',
            title: 'Titre 97 initial',
            description: 'Description initiale 97 suffisamment longue',
            type: 'bug',
            status: 'open',
            priority: 'medium',
            requestedBy: 'author97@example.org',
            requestedByName: 'Author 97',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-97',
          title: 'Titre 97',
          description: 'Description 97 mise à jour suffisamment longue pour le body',
          type: 'feature',
          status: 'open',
          priority: 'medium',
          requestedBy: 'author97@example.org',
          requestedByName: 'Author 97',
          githubIssueNumber: 970,
        },
      });

      const parseSpy = vi.spyOn(adminDto.updateDevelopmentRequestDto, 'parse').mockReturnValue({
        description: 'Description 97 mise à jour suffisamment longue pour le body',
        type: 'feature',
      });

      try {
        await adminService.updateDevelopmentRequest('dev-97', {
          description: 'Description 97 mise à jour suffisamment longue pour le body',
          type: 'feature',
        });

        expect(updateGitHubIssueDetailsMock).toHaveBeenCalledWith(
          970,
          expect.objectContaining({
            body: expect.stringContaining('**Type:** ✨ Fonctionnalité'),
            state: 'open',
          }),
        );
      } finally {
        parseSpy.mockRestore();
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration98: updateDevelopmentRequest should set GitHub body when only priority is provided', async () => {
      const updateGitHubIssueDetailsMock = vi.fn().mockResolvedValue({ number: 980, state: 'open' });
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          updateGitHubIssueDetails: updateGitHubIssueDetailsMock,
        };
      });

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-98',
            title: 'Titre 98 initial',
            description: 'Description initiale 98 suffisamment longue',
            type: 'feature',
            status: 'open',
            priority: 'low',
            requestedBy: 'author98@example.org',
            requestedByName: 'Author 98',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-98',
          title: 'Titre 98 initial',
          description: 'Description initiale 98 suffisamment longue',
          type: 'feature',
          status: 'open',
          priority: 'critical',
          requestedBy: 'author98@example.org',
          requestedByName: 'Author 98',
          githubIssueNumber: 980,
        },
      });

      const parseSpy = vi.spyOn(adminDto.updateDevelopmentRequestDto, 'parse').mockReturnValue({
        priority: 'critical',
      });

      try {
        await adminService.updateDevelopmentRequest('dev-98', {
          priority: 'critical',
        });

        expect(updateGitHubIssueDetailsMock).toHaveBeenCalledWith(
          980,
          expect.objectContaining({
            body: expect.any(String),
            state: 'open',
          }),
        );
      } finally {
        parseSpy.mockRestore();
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration99: updateDevelopmentRequest should keep GitHub body undefined when only title changes', async () => {
      const updateGitHubIssueDetailsMock = vi.fn().mockResolvedValue({ number: 990, state: 'open' });
      vi.doMock('../../utils/github-integration', async () => {
        const actual = await vi.importActual<typeof import('../../utils/github-integration')>(
          '../../utils/github-integration',
        );
        return {
          ...actual,
          updateGitHubIssueDetails: updateGitHubIssueDetailsMock,
        };
      });

      vi.mocked(storageService.instance.getDevelopmentRequests).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'dev-99',
            title: 'Titre 99 initial',
            description: 'Description initiale 99 suffisamment longue',
            type: 'feature',
            status: 'open',
            priority: 'medium',
            requestedBy: 'author99@example.org',
            requestedByName: 'Author 99',
          },
        ],
      });
      vi.mocked(storageService.instance.updateDevelopmentRequest).mockResolvedValue({
        success: true,
        data: {
          id: 'dev-99',
          title: 'Titre 99 final',
          description: 'Description initiale 99 suffisamment longue',
          type: 'feature',
          status: 'open',
          priority: 'medium',
          requestedBy: 'author99@example.org',
          requestedByName: 'Author 99',
          githubIssueNumber: 990,
        },
      });

      const parseSpy = vi.spyOn(adminDto.updateDevelopmentRequestDto, 'parse').mockReturnValue({
        title: 'Titre 99 final',
      });

      try {
        await adminService.updateDevelopmentRequest('dev-99', {
          title: 'Titre 99 final',
        });

        expect(updateGitHubIssueDetailsMock).toHaveBeenCalledWith(
          990,
          expect.objectContaining({
            title: 'Titre 99 final',
            body: undefined,
            state: 'open',
          }),
        );
      } finally {
        parseSpy.mockRestore();
        vi.doUnmock('../../utils/github-integration');
      }
    });

    it('iteration100: updateEventStatus should call storage with validated status on success path', async () => {
      vi.mocked(storageService.instance.updateEventStatus).mockResolvedValue({
        success: true,
      });

      await expect(adminService.updateEventStatus('event-100', 'published')).resolves.toBeUndefined();
      expect(storageService.instance.updateEventStatus).toHaveBeenCalledWith('event-100', 'published');
    });

    it('iteration101: deleteUnsubscription should still return success message after explicit-error branch coverage', async () => {
      vi.mocked(storageService.instance.deleteUnsubscription).mockResolvedValue({
        success: true,
      });

      const result = await adminService.deleteUnsubscription('uns-101');
      expect(result).toEqual({ message: 'Absence supprimée avec succès' });
    });
  });

  describe('New cycle iterations 102-111', () => {
    it('iteration102: toggleIdeaFeatured should propagate explicit storage error message', async () => {
      vi.mocked(storageService.instance.toggleIdeaFeatured).mockResolvedValue({
        success: false,
        error: new Error('toggle explicit failure 102'),
      });

      await expect(adminService.toggleIdeaFeatured('idea-102')).rejects.toThrow('toggle explicit failure 102');
    });

    it('iteration103: transformIdeaToEvent should propagate explicit storage error message', async () => {
      vi.mocked(storageService.instance.transformIdeaToEvent).mockResolvedValue({
        success: false,
        error: new Error('transform explicit failure 103'),
      });

      await expect(adminService.transformIdeaToEvent('idea-103')).rejects.toThrow(
        'transform explicit failure 103',
      );
    });

    it('iteration104: toggleIdeaFeatured should return featured false when storage data is false', async () => {
      vi.mocked(storageService.instance.toggleIdeaFeatured).mockResolvedValue({
        success: true,
        data: false,
      });

      const result = await adminService.toggleIdeaFeatured('idea-104');
      expect(result).toEqual({ featured: false });
    });

    it('iteration105: transformIdeaToEvent should map event id from success payload', async () => {
      vi.mocked(storageService.instance.transformIdeaToEvent).mockResolvedValue({
        success: true,
        data: { id: 'evt-105' },
      });

      const result = await adminService.transformIdeaToEvent('idea-105');
      expect(result).toEqual({ success: true, eventId: 'evt-105' });
    });

    it('iteration106: toggleIdeaFeatured should call storage with provided idea id', async () => {
      vi.mocked(storageService.instance.toggleIdeaFeatured).mockResolvedValue({
        success: true,
        data: true,
      });

      await adminService.toggleIdeaFeatured('idea-106');
      expect(storageService.instance.toggleIdeaFeatured).toHaveBeenCalledWith('idea-106');
    });

    it('iteration107: transformIdeaToEvent should call storage with provided idea id', async () => {
      vi.mocked(storageService.instance.transformIdeaToEvent).mockResolvedValue({
        success: true,
        data: { id: 'evt-107' },
      });

      await adminService.transformIdeaToEvent('idea-107');
      expect(storageService.instance.transformIdeaToEvent).toHaveBeenCalledWith('idea-107');
    });

    it('iteration108: toggleIdeaFeatured should rethrow rejected storage promise as-is', async () => {
      const rejection = new Error('toggle rejection 108');
      vi.mocked(storageService.instance.toggleIdeaFeatured).mockRejectedValue(rejection);

      await expect(adminService.toggleIdeaFeatured('idea-108')).rejects.toThrow('toggle rejection 108');
    });

    it('iteration109: transformIdeaToEvent should rethrow rejected storage promise as-is', async () => {
      const rejection = new Error('transform rejection 109');
      vi.mocked(storageService.instance.transformIdeaToEvent).mockRejectedValue(rejection);

      await expect(adminService.transformIdeaToEvent('idea-109')).rejects.toThrow('transform rejection 109');
    });

    it('iteration110: toggleIdeaFeatured should keep explicit error precedence over Unknown fallback', async () => {
      vi.mocked(storageService.instance.toggleIdeaFeatured).mockResolvedValue({
        success: false,
        error: new Error('priority explicit error 110'),
      });

      await expect(adminService.toggleIdeaFeatured('idea-110')).rejects.toThrow('priority explicit error 110');
    });

    it('iteration111: transformIdeaToEvent should keep explicit error precedence over Unknown fallback', async () => {
      vi.mocked(storageService.instance.transformIdeaToEvent).mockResolvedValue({
        success: false,
        error: new Error('priority explicit error 111'),
      });

      await expect(adminService.transformIdeaToEvent('idea-111')).rejects.toThrow('priority explicit error 111');
    });
  });

  describe('New cycle iterations 112-121', () => {
    it('iteration112: updateEventStatus should reject invalid status and avoid storage call', async () => {
      await expect(adminService.updateEventStatus('event-112', 'invalid-status-112')).rejects.toThrow();
      expect(storageService.instance.updateEventStatus).not.toHaveBeenCalled();
    });

    it('iteration113: updateEventStatus should propagate explicit storage error message', async () => {
      vi.mocked(storageService.instance.updateEventStatus).mockResolvedValue({
        success: false,
        error: new Error('event status explicit failure 113'),
      });

      await expect(adminService.updateEventStatus('event-113', 'published')).rejects.toThrow(
        'event status explicit failure 113',
      );
    });

    it('iteration114: updateEventStatus should call storage with validated status when successful', async () => {
      vi.mocked(storageService.instance.updateEventStatus).mockResolvedValue({
        success: true,
      });

      await expect(adminService.updateEventStatus('event-114', 'published')).resolves.toBeUndefined();
      expect(storageService.instance.updateEventStatus).toHaveBeenCalledWith('event-114', 'published');
    });

    it('iteration115: deleteInscription should return success payload when storage deletion succeeds', async () => {
      vi.mocked(storageService.instance.deleteInscription).mockResolvedValue({
        success: true,
      });

      const result = await adminService.deleteInscription('ins-115');
      expect(result).toEqual({ success: true });
    });

    it('iteration116: deleteInscription should propagate explicit storage failure message', async () => {
      vi.mocked(storageService.instance.deleteInscription).mockResolvedValue({
        success: false,
        error: new Error('delete inscription explicit failure 116'),
      });

      await expect(adminService.deleteInscription('ins-116')).rejects.toThrow(
        'delete inscription explicit failure 116',
      );
    });

    it('iteration117: deleteInscription should use Unknown error fallback when storage error payload is missing', async () => {
      vi.mocked(storageService.instance.deleteInscription).mockResolvedValue({
        success: false,
      });

      await expect(adminService.deleteInscription('ins-117')).rejects.toThrow('Unknown error');
    });

    it('iteration118: getAllIdeas should compute totalPages using Math.ceil for non-divisible totals', async () => {
      vi.mocked(storageService.instance.getAllIdeas).mockResolvedValue({
        success: true,
        data: {
          data: [{ id: 'idea-118' }],
          total: 15,
          page: 2,
          limit: 7,
        },
      });

      const result = await adminService.getAllIdeas(2, 7);
      expect(result).toEqual({
        success: true,
        data: [{ id: 'idea-118' }],
        total: 15,
        page: 2,
        limit: 7,
        totalPages: 3,
      });
    });

    it('iteration119: getAllIdeas should pass optional status and featured filters to storage', async () => {
      vi.mocked(storageService.instance.getAllIdeas).mockResolvedValue({
        success: true,
        data: {
          data: [],
          total: 0,
          page: 1,
          limit: 20,
        },
      });

      await adminService.getAllIdeas(1, 20, 'approved', 'true');
      expect(storageService.instance.getAllIdeas).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'approved',
        featured: 'true',
      });
    });

    it('iteration120: getAllEvents should compute totalPages using Math.ceil for non-divisible totals', async () => {
      vi.mocked(storageService.instance.getAllEvents).mockResolvedValue({
        success: true,
        data: {
          data: [{ id: 'event-120' }],
          total: 41,
          page: 3,
          limit: 20,
        },
      });

      const result = await adminService.getAllEvents(3, 20);
      expect(result).toEqual({
        success: true,
        data: [{ id: 'event-120' }],
        total: 41,
        page: 3,
        limit: 20,
        totalPages: 3,
      });
    });

    it('iteration121: getAllEvents should propagate explicit storage failure message', async () => {
      vi.mocked(storageService.instance.getAllEvents).mockResolvedValue({
        success: false,
        error: new Error('events explicit failure 121'),
      });

      await expect(adminService.getAllEvents(1, 10)).rejects.toThrow('events explicit failure 121');
    });
  });

  describe('New cycle iterations 122-131', () => {
    it('iteration122: updateEvent should call storage with event id and validated payload on success', async () => {
      const payload = {
        title: 'Événement 122',
        description: 'Description robuste iteration 122',
        date: '2030-01-01T10:00:00.000Z',
        location: 'Paris',
        maxParticipants: 42,
        isActive: false,
      };

      vi.mocked(storageService.instance.updateEvent).mockResolvedValue({
        success: true,
        data: { id: 'event-122', ...payload },
      });

      await adminService.updateEvent('event-122', payload);
      expect(storageService.instance.updateEvent).toHaveBeenCalledWith(
        'event-122',
        expect.objectContaining({
          title: 'Événement 122',
          description: 'Description robuste iteration 122',
          date: '2030-01-01T10:00:00.000Z',
          location: 'Paris',
          maxParticipants: 42,
        }),
      );
    });

    it('iteration123: updateEvent should propagate explicit storage failure message', async () => {
      vi.mocked(storageService.instance.updateEvent).mockResolvedValue({
        success: false,
        error: new Error('event explicit failure 123'),
      });

      await expect(
        adminService.updateEvent('event-123', {
          title: 'Événement 123',
          description: 'Description robuste iteration 123',
          date: '2030-02-01T10:00:00.000Z',
          location: 'Lyon',
          maxParticipants: 30,
          isActive: true,
        }),
      ).rejects.toThrow('event explicit failure 123');
    });

    it('iteration124: updateEvent should fallback to Unknown error when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.updateEvent).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.updateEvent>>);

      await expect(
        adminService.updateEvent('event-124', {
          title: 'Événement 124',
          description: 'Description robuste iteration 124',
          date: '2030-03-01T10:00:00.000Z',
          location: 'Nantes',
          maxParticipants: 25,
          isActive: true,
        }),
      ).rejects.toThrow('Unknown error');
    });

    it('iteration125: getEventInscriptions should propagate explicit storage failure message', async () => {
      vi.mocked(storageService.instance.getEventInscriptions).mockResolvedValue({
        success: false,
        error: new Error('inscriptions explicit failure 125'),
      });

      await expect(adminService.getEventInscriptions('event-125')).rejects.toThrow(
        'inscriptions explicit failure 125',
      );
    });

    it('iteration126: getEventInscriptions should fallback to Unknown error when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.getEventInscriptions).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getEventInscriptions>>);

      await expect(adminService.getEventInscriptions('event-126')).rejects.toThrow('Unknown error');
    });

    it('iteration127: createInscription should fallback to Unknown error when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.createInscription).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.createInscription>>);

      await expect(
        adminService.createInscription({
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Creator 127',
          email: 'creator127@example.org',
        }),
      ).rejects.toThrow('Unknown error');
    });

    it('iteration128: createInscription should return storage payload unchanged on success', async () => {
      const createdInscription = {
        id: 'ins-128',
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Creator 128',
        email: 'creator128@example.org',
        company: 'UGC Co',
        phone: '+33123456789',
        comments: 'ok',
        status: 'confirmed',
        createdAt: new Date('2030-01-01T10:00:00.000Z'),
        updatedAt: new Date('2030-01-01T10:00:00.000Z'),
      };

      vi.mocked(storageService.instance.createInscription).mockResolvedValue({
        success: true,
        data: createdInscription,
      });

      const result = await adminService.createInscription({
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Creator 128',
        email: 'creator128@example.org',
      });

      expect(result).toEqual(createdInscription);
    });

    it('iteration129: bulkCreateInscriptions should return success false when every entry is invalid', async () => {
      const result = await adminService.bulkCreateInscriptions('event-129', [{}, { name: 'OnlyName' }]);

      expect(result).toEqual({
        success: false,
        created: 0,
        errors: 2,
        errorMessages: expect.arrayContaining([
          expect.stringContaining('nom et email requis'),
          expect.stringContaining('OnlyName'),
        ]),
        data: [],
      });
      expect(storageService.instance.createInscription).not.toHaveBeenCalled();
    });

    it('iteration130: bulkCreateInscriptions should include Unknown error fallback when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.createInscription).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.createInscription>>);

      const result = await adminService.bulkCreateInscriptions('event-130', [
        { name: 'Creator 130', email: 'creator130@example.org' },
      ]);

      expect(result.success).toBe(false);
      expect(result.created).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.errorMessages[0]).toContain('Creator 130');
      expect(result.errorMessages[0]).toContain('Unknown error');
    });

    it('iteration131: deleteVote should fallback to Unknown error when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.deleteVote).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.deleteVote>>);

      await expect(adminService.deleteVote('vote-131')).rejects.toThrow('Unknown error');
    });
  });

  describe('New cycle iterations 132-141', () => {
    it('iteration132: getAllIdeas should use defaults when called without params', async () => {
      vi.mocked(storageService.instance.getAllIdeas).mockResolvedValue({
        success: true,
        data: {
          data: [],
          total: 0,
          page: 1,
          limit: 20,
        },
      });

      await adminService.getAllIdeas();
      expect(storageService.instance.getAllIdeas).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined,
        featured: undefined,
      });
    });

    it('iteration133: getAllIdeas should fallback to Unknown error when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.getAllIdeas).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getAllIdeas>>);

      await expect(adminService.getAllIdeas(1, 20)).rejects.toThrow('Unknown error');
    });

    it('iteration134: getAllEvents should use defaults when called without params', async () => {
      vi.mocked(storageService.instance.getAllEvents).mockResolvedValue({
        success: true,
        data: {
          data: [],
          total: 0,
          page: 1,
          limit: 20,
        },
      });

      await adminService.getAllEvents();
      expect(storageService.instance.getAllEvents).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('iteration135: getAllEvents should fallback to Unknown error when storage fails without error payload', async () => {
      vi.mocked(storageService.instance.getAllEvents).mockResolvedValue({
        success: false,
      } as unknown as Awaited<ReturnType<typeof storageService.instance.getAllEvents>>);

      await expect(adminService.getAllEvents(1, 20)).rejects.toThrow('Unknown error');
    });

    it('iteration136: updateEventStatus should rethrow non-zod storage rejection as-is', async () => {
      const rejection = new Error('status rejection 136');
      vi.mocked(storageService.instance.updateEventStatus).mockRejectedValue(rejection);

      await expect(adminService.updateEventStatus('event-136', 'published')).rejects.toThrow(
        'status rejection 136',
      );
    });

    it('iteration137: updateEventStatus should reject undefined status and avoid storage call', async () => {
      await expect(adminService.updateEventStatus('event-137', undefined)).rejects.toThrow();
      expect(storageService.instance.updateEventStatus).not.toHaveBeenCalled();
    });

    it('iteration138: deleteInscription should call storage with provided inscription id', async () => {
      vi.mocked(storageService.instance.deleteInscription).mockResolvedValue({
        success: true,
      });

      await adminService.deleteInscription('ins-138');
      expect(storageService.instance.deleteInscription).toHaveBeenCalledWith('ins-138');
    });

    it('iteration139: deleteVote should propagate explicit storage failure message', async () => {
      vi.mocked(storageService.instance.deleteVote).mockResolvedValue({
        success: false,
        error: new Error('delete vote explicit failure 139'),
      });

      await expect(adminService.deleteVote('vote-139')).rejects.toThrow('delete vote explicit failure 139');
    });

    it('iteration140: createInscription should reject invalid payload and avoid storage call', async () => {
      await expect(
        adminService.createInscription({
          eventId: 'invalid-event-id',
          name: '',
          email: 'invalid-email',
        }),
      ).rejects.toThrow();
      expect(storageService.instance.createInscription).not.toHaveBeenCalled();
    });

    it('iteration141: createInscription should propagate explicit storage failure message', async () => {
      vi.mocked(storageService.instance.createInscription).mockResolvedValue({
        success: false,
        error: new Error('create inscription explicit failure 141'),
      });

      await expect(
        adminService.createInscription({
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Creator 141',
          email: 'creator141@example.org',
        }),
      ).rejects.toThrow('create inscription explicit failure 141');
    });
  });
});
