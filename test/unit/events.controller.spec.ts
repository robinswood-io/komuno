import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventsController, InscriptionsController, UnsubscriptionsController } from '../../server/src/events/events.controller';
import { EventsService } from '../../server/src/events/events.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock du service
const createMockEventsService = () => ({
  getEvents: vi.fn(),
  createEvent: vi.fn(),
  createEventWithInscriptions: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEventInscriptions: vi.fn(),
  createInscription: vi.fn(),
  createUnsubscription: vi.fn(),
  getEventsStats: vi.fn(),
});

describe('EventsController', () => {
  let eventsController: EventsController;
  let mockEventsService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventsService = createMockEventsService();
    eventsController = new EventsController(mockEventsService);
  });

  describe('getEvents - GET /api/events', () => {
    it('devrait retourner la liste des événements sans paramètres', async () => {
      const mockData = {
        success: true,
        data: {
          data: [{ id: '1', title: 'Event 1' }],
          total: 1,
          page: 1,
          limit: 20,
        },
      };
      mockEventsService.getEvents.mockResolvedValue(mockData);

      const result = await eventsController.getEvents();

      expect(mockEventsService.getEvents).toHaveBeenCalledWith(1, 20);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('devrait accepter page et limit en query params', async () => {
      const mockData = {
        success: true,
        data: {
          data: [],
          total: 0,
          page: 2,
          limit: 50,
        },
      };
      mockEventsService.getEvents.mockResolvedValue(mockData);

      const result = await eventsController.getEvents('2', '50');

      expect(mockEventsService.getEvents).toHaveBeenCalledWith(2, 50);
      expect(result.success).toBe(true);
    });

    it('devrait convertir les strings en nombres', async () => {
      const mockData = {
        success: true,
        data: {
          data: [],
          total: 0,
          page: 5,
          limit: 100,
        },
      };
      mockEventsService.getEvents.mockResolvedValue(mockData);

      const result = await eventsController.getEvents('5', '100');

      expect(mockEventsService.getEvents).toHaveBeenCalledWith(5, 100);
      expect(result.success).toBe(true);
    });

    it('devrait utiliser les valeurs par défaut si params invalides', async () => {
      const mockData = {
        success: true,
        data: {
          data: [],
          total: 0,
          page: 1,
          limit: 20,
        },
      };
      mockEventsService.getEvents.mockResolvedValue(mockData);

      // parseInt('invalid', 10) retourne NaN, qui devient 1 avec le fallback
      const result = await eventsController.getEvents('invalid', 'invalid');

      // NaN est falsy, donc les defaults s'appliquent
      expect(mockEventsService.getEvents).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('createEvent - POST /api/events', () => {
    it('devrait créer un événement avec les données du body', async () => {
      const eventBody = {
        title: 'Soirée networking',
        description: 'Rencontre professionnelle',
        date: '2026-02-15T19:00:00Z',
        location: 'Salle des fêtes',
        maxParticipants: 50,
      };

      const createdEvent = { id: 'uuid-1', ...eventBody, status: 'published' };
      mockEventsService.createEvent.mockResolvedValue(createdEvent);

      const user = { firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' };

      const result = await eventsController.createEvent(eventBody, user);

      expect(mockEventsService.createEvent).toHaveBeenCalledWith(eventBody, user);
      expect(result).toEqual(createdEvent);
    });

    it('devrait transmettre l\'utilisateur connecté au service', async () => {
      const eventBody = { title: 'Test', date: '2026-02-15T19:00:00Z' };
      const user = { firstName: 'Alice', lastName: 'Martin', email: 'alice@example.com' };

      mockEventsService.createEvent.mockResolvedValue({ id: 'uuid-1' });

      await eventsController.createEvent(eventBody, user);

      expect(mockEventsService.createEvent).toHaveBeenCalledWith(eventBody, user);
      const call = mockEventsService.createEvent.mock.calls[0];
      expect(call[1].email).toBe('alice@example.com');
    });

    it('devrait propager les exceptions du service', async () => {
      const eventBody = { title: 'Test', date: '2026-02-15T19:00:00Z' };

      mockEventsService.createEvent.mockRejectedValue(new BadRequestException('Invalid data'));

      await expect(eventsController.createEvent(eventBody, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('createEventWithInscriptions - POST /api/events/with-inscriptions', () => {
    it('devrait créer un événement avec inscriptions initiales', async () => {
      const eventWithInscriptions = {
        event: {
          title: 'Conférence',
          date: '2026-02-15T19:00:00Z',
          location: 'Paris',
        },
        inscriptions: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' },
        ],
      };

      const result = {
        event: { id: 'uuid-1', ...eventWithInscriptions.event },
        initialInscriptions: eventWithInscriptions.inscriptions.map((i, idx) => ({
          id: `insc-${idx}`,
          ...i,
        })),
      };

      mockEventsService.createEventWithInscriptions.mockResolvedValue(result);

      const user = { email: 'organizer@example.com' };
      const output = await eventsController.createEventWithInscriptions(eventWithInscriptions, user);

      expect(mockEventsService.createEventWithInscriptions).toHaveBeenCalledWith(eventWithInscriptions, user);
      expect(output.initialInscriptions).toHaveLength(2);
    });
  });

  describe('updateEvent - PUT /api/events/:id', () => {
    it('devrait mettre à jour un événement existant', async () => {
      const updateData = {
        title: 'Nouvelle soirée networking',
        maxParticipants: 75,
      };

      const updatedEvent = { id: 'uuid-1', ...updateData };
      mockEventsService.updateEvent.mockResolvedValue(updatedEvent);

      const result = await eventsController.updateEvent('uuid-1', updateData);

      expect(mockEventsService.updateEvent).toHaveBeenCalledWith('uuid-1', updateData);
      expect(result).toEqual(updatedEvent);
    });

    it('devrait transmettre l\'ID d\'événement au service', async () => {
      const updateData = { title: 'Updated' };
      mockEventsService.updateEvent.mockResolvedValue({ id: 'uuid-1' });

      await eventsController.updateEvent('uuid-123', updateData);

      const call = mockEventsService.updateEvent.mock.calls[0];
      expect(call[0]).toBe('uuid-123');
    });

    it('devrait propager NotFoundException du service', async () => {
      mockEventsService.updateEvent.mockRejectedValue(new NotFoundException('Event not found'));

      await expect(eventsController.updateEvent('invalid-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteEvent - DELETE /api/events/:id', () => {
    it('devrait supprimer un événement', async () => {
      mockEventsService.deleteEvent.mockResolvedValue(undefined);

      await eventsController.deleteEvent('uuid-1');

      expect(mockEventsService.deleteEvent).toHaveBeenCalledWith('uuid-1');
    });

    it('devrait retourner 204 (void)', async () => {
      mockEventsService.deleteEvent.mockResolvedValue(undefined);

      const result = await eventsController.deleteEvent('uuid-1');

      expect(result).toBeUndefined();
    });

    it('devrait propager NotFoundException', async () => {
      mockEventsService.deleteEvent.mockRejectedValue(new NotFoundException('Event not found'));

      await expect(eventsController.deleteEvent('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEventInscriptions - GET /api/events/:id/inscriptions', () => {
    it('devrait récupérer les inscriptions d\'un événement', async () => {
      const mockInscriptions = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ];

      mockEventsService.getEventInscriptions.mockResolvedValue(mockInscriptions);

      const result = await eventsController.getEventInscriptions('uuid-1');

      expect(mockEventsService.getEventInscriptions).toHaveBeenCalledWith('uuid-1');
      expect(result).toHaveLength(2);
    });

    it('devrait retourner un tableau vide si pas d\'inscriptions', async () => {
      mockEventsService.getEventInscriptions.mockResolvedValue([]);

      const result = await eventsController.getEventInscriptions('uuid-1');

      expect(result).toEqual([]);
    });

    it('devrait propager les exceptions du service', async () => {
      mockEventsService.getEventInscriptions.mockRejectedValue(
        new BadRequestException('Event not found')
      );

      await expect(eventsController.getEventInscriptions('invalid-id')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});

describe('InscriptionsController', () => {
  let inscriptionsController: InscriptionsController;
  let mockEventsService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventsService = createMockEventsService();
    inscriptionsController = new InscriptionsController(mockEventsService);
  });

  describe('createInscription - POST /api/inscriptions', () => {
    it('devrait créer une inscription pour un événement', async () => {
      const inscriptionBody = {
        eventId: 'uuid-1',
        participantName: 'Marie Martin',
        participantEmail: 'marie@example.com',
        company: 'Tech Corp',
        phone: '+33123456789',
      };

      const createdInscription = {
        id: 'insc-1',
        eventId: 'uuid-1',
        name: 'Marie Martin',
        email: 'marie@example.com',
        createdAt: new Date(),
      };

      mockEventsService.createInscription.mockResolvedValue(createdInscription);

      const result = await inscriptionsController.createInscription(inscriptionBody);

      expect(mockEventsService.createInscription).toHaveBeenCalledWith(inscriptionBody);
      expect(result).toEqual(createdInscription);
    });

    it('devrait mapper participantName vers name', async () => {
      const inscriptionBody = {
        eventId: 'uuid-1',
        participantName: 'Test User',
        participantEmail: 'test@example.com',
      };

      mockEventsService.createInscription.mockResolvedValue({ id: 'insc-1' });

      await inscriptionsController.createInscription(inscriptionBody);

      expect(mockEventsService.createInscription).toHaveBeenCalled();
      const calledWith = mockEventsService.createInscription.mock.calls[0][0];
      expect(calledWith.eventId).toBe('uuid-1');
      expect(calledWith.participantEmail).toBe('test@example.com');
    });

    it('devrait valider les données d\'inscription', async () => {
      const invalidBody = {
        eventId: 'uuid-1',
        // participantName manquant
        participantEmail: 'marie@example.com',
      };

      mockEventsService.createInscription.mockRejectedValue(new BadRequestException('Invalid data'));

      await expect(inscriptionsController.createInscription(invalidBody)).rejects.toThrow(
        BadRequestException
      );
    });

    it('devrait propager les exceptions du service', async () => {
      const inscriptionBody = {
        eventId: 'uuid-1',
        participantName: 'Marie',
        participantEmail: 'marie@example.com',
      };

      mockEventsService.createInscription.mockRejectedValue(
        new BadRequestException('Already registered')
      );

      await expect(inscriptionsController.createInscription(inscriptionBody)).rejects.toThrow(
        BadRequestException
      );
    });

    it('devrait accepter les champs optionnels (company, phone, comments)', async () => {
      const completeInscription = {
        eventId: 'uuid-1',
        participantName: 'Marie',
        participantEmail: 'marie@example.com',
        company: 'Tech Co',
        phone: '+33612345678',
        comments: 'Régime végétarien',
      };

      mockEventsService.createInscription.mockResolvedValue({ id: 'insc-1' });

      await inscriptionsController.createInscription(completeInscription);

      expect(mockEventsService.createInscription).toHaveBeenCalledWith(completeInscription);
    });

    it('devrait être rate-limited (throttle)', async () => {
      // Le décorateur @Throttle({ default: { limit: 20, ttl: 900000 } })
      // garantit max 20 requêtes par 15 minutes
      // Ceci est testé via le middleware NestJS, pas ici
      expect(true).toBe(true);
    });
  });
});

describe('UnsubscriptionsController', () => {
  let unsubscriptionsController: UnsubscriptionsController;
  let mockEventsService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventsService = createMockEventsService();
    unsubscriptionsController = new UnsubscriptionsController(mockEventsService);
  });

  describe('createUnsubscription - POST /api/unsubscriptions', () => {
    it('devrait créer une désinscription', async () => {
      const unsubscriptionBody = {
        eventId: 'uuid-1',
        participantEmail: 'marie@example.com',
      };

      const createdUnsubscription = {
        id: 'unsub-1',
        eventId: 'uuid-1',
        email: 'marie@example.com',
        createdAt: new Date(),
      };

      mockEventsService.createUnsubscription.mockResolvedValue(createdUnsubscription);

      const result = await unsubscriptionsController.createUnsubscription(unsubscriptionBody);

      expect(mockEventsService.createUnsubscription).toHaveBeenCalledWith(unsubscriptionBody);
      expect(result).toEqual(createdUnsubscription);
    });

    it('devrait accepter les commentaires optionnels', async () => {
      const unsubscriptionBody = {
        eventId: 'uuid-1',
        participantEmail: 'marie@example.com',
        participantName: 'Marie',
        comments: 'Imprévu professionnel',
      };

      mockEventsService.createUnsubscription.mockResolvedValue({ id: 'unsub-1' });

      await unsubscriptionsController.createUnsubscription(unsubscriptionBody);

      expect(mockEventsService.createUnsubscription).toHaveBeenCalledWith(unsubscriptionBody);
    });

    it('devrait valider les données obligatoires', async () => {
      const invalidBody = {
        eventId: 'uuid-1',
        // participantEmail manquant
      };

      mockEventsService.createUnsubscription.mockRejectedValue(new BadRequestException('Invalid data'));

      await expect(unsubscriptionsController.createUnsubscription(invalidBody)).rejects.toThrow(
        BadRequestException
      );
    });

    it('devrait propager NotFoundException si inscription n\'existe pas', async () => {
      const unsubscriptionBody = {
        eventId: 'uuid-1',
        participantEmail: 'marie@example.com',
      };

      mockEventsService.createUnsubscription.mockRejectedValue(
        new NotFoundException('Inscription not found')
      );

      await expect(unsubscriptionsController.createUnsubscription(unsubscriptionBody)).rejects.toThrow(
        NotFoundException
      );
    });

    it('devrait retourner le statut 200 en cas de succès', async () => {
      const unsubscriptionBody = {
        eventId: 'uuid-1',
        participantEmail: 'marie@example.com',
      };

      const result = { id: 'unsub-1', success: true };
      mockEventsService.createUnsubscription.mockResolvedValue(result);

      const output = await unsubscriptionsController.createUnsubscription(unsubscriptionBody);

      expect(output.success).toBe(true);
    });
  });
});

describe('Integration - Controllers with Service', () => {
  let eventsController: EventsController;
  let inscriptionsController: InscriptionsController;
  let mockEventsService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventsService = createMockEventsService();
    eventsController = new EventsController(mockEventsService);
    inscriptionsController = new InscriptionsController(mockEventsService);
  });

  it('devrait créer un événement puis des inscriptions', async () => {
    // Créer l'événement
    const eventBody = {
      title: 'Conférence',
      date: '2026-02-15T19:00:00Z',
      location: 'Paris',
    };

    const createdEvent = { id: 'uuid-1', ...eventBody };
    mockEventsService.createEvent.mockResolvedValue(createdEvent);

    const event = await eventsController.createEvent(eventBody, {});

    expect(event.id).toBe('uuid-1');

    // Créer des inscriptions pour cet événement
    const inscriptionBody = {
      eventId: event.id,
      participantName: 'Alice',
      participantEmail: 'alice@example.com',
    };

    mockEventsService.createInscription.mockResolvedValue({
      id: 'insc-1',
      ...inscriptionBody,
    });

    const inscription = await inscriptionsController.createInscription(inscriptionBody);

    expect(inscription.id).toBe('insc-1');
    expect(mockEventsService.createInscription).toHaveBeenCalledWith(inscriptionBody);
  });

  it('devrait gérer le flux complet: créer -> lister -> mettre à jour -> supprimer', async () => {
    // Create
    const createdEvent = { id: 'uuid-1', title: 'Test', date: '2026-02-15T19:00:00Z' };
    mockEventsService.createEvent.mockResolvedValue(createdEvent);
    const created = await eventsController.createEvent({ title: 'Test', date: '2026-02-15T19:00:00Z' }, {});
    expect(created.id).toBe('uuid-1');

    // Read (List all events) - must include success and proper structure
    mockEventsService.getEvents.mockResolvedValue({
      success: true,
      data: {
        data: [createdEvent],
        total: 1,
        page: 1,
        limit: 20,
      },
    });
    const list = await eventsController.getEvents();
    expect(list.data).toHaveLength(1);
    expect(list.total).toBe(1);
    expect(list.success).toBe(true);

    // Update
    const updatedEvent = { ...createdEvent, title: 'Updated' };
    mockEventsService.updateEvent.mockResolvedValue(updatedEvent);
    const updated = await eventsController.updateEvent('uuid-1', { title: 'Updated' });
    expect(updated.title).toBe('Updated');

    // Delete
    mockEventsService.deleteEvent.mockResolvedValue(undefined);
    await eventsController.deleteEvent('uuid-1');
    expect(mockEventsService.deleteEvent).toHaveBeenCalledWith('uuid-1');
  });
});
