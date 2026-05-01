import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { StorageService } from '../common/storage/storage.service';
import { IdeasService } from '../ideas/ideas.service';
import { EventsService } from '../events/events.service';
import { checkDatabaseHealth } from '../../utils/db-health';
import { emailService } from '../../email-service';
import { emailNotificationService } from '../../email-notification-service';
import { promises as fs } from 'fs';

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

    it('getAllEvents should throw on storage failure', async () => {
      vi.mocked(storageService.instance.getAllEvents).mockResolvedValue({
        success: false,
        error: new Error('events error'),
      });

      await expect(adminService.getAllEvents()).rejects.toThrow(BadRequestException);
    });

    it('toggleIdeaFeatured should return featured value', async () => {
      vi.mocked(storageService.instance.toggleIdeaFeatured).mockResolvedValue({
        success: true,
        data: true,
      });

      const result = await adminService.toggleIdeaFeatured('idea-1');
      expect(result).toEqual({ featured: true });
    });

    it('transformIdeaToEvent should map event id', async () => {
      vi.mocked(storageService.instance.transformIdeaToEvent).mockResolvedValue({
        success: true,
        data: { id: 'event-10' },
      });

      const result = await adminService.transformIdeaToEvent('idea-1');
      expect(result).toEqual({ success: true, eventId: 'event-10' });
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

    it('getEmailConfig should throw when storage fails', async () => {
      vi.mocked(storageService.instance.getEmailConfig).mockResolvedValue({
        success: false,
        error: new Error('smtp read failed'),
      });

      await expect(adminService.getEmailConfig()).rejects.toThrow(BadRequestException);
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

    it('getFeatureConfig should throw BadRequestException on storage error', async () => {
      vi.mocked(storageService.instance.getFeatureConfig).mockResolvedValue({
        success: false,
        error: new Error('feature list failed'),
      });

      await expect(adminService.getFeatureConfig()).rejects.toThrow(BadRequestException);
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
  });
});
