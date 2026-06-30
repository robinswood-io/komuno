import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import { FederationService } from '../federation/federation.service';
import {
  EVENT_STATUS,
  insertEventSchema,
  createEventWithInscriptionsSchema,
  insertInscriptionSchema,
  insertUnsubscriptionSchema,
  type Event,
  type Inscription,
  events,
  inscriptions,
} from '../../../shared/schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { logger } from '../../lib/logger';
import { notificationService } from '../../notification-service';
import { emailNotificationService } from '../../email-notification-service';
import { asc, count, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { buildIcsCalendar } from '../integrations/integrations.utils';

@Injectable()
export class EventsService {
  constructor(
    private readonly storageService: StorageService,
    private readonly federationService: FederationService,
  ) {}

  private async autoShareEventToParentBestEffort(eventId: string, userEmail?: string) {
    try {
      await this.federationService.autoShareEventToParent(eventId, userEmail);
    } catch (error) {
      logger.warn('Federation auto-share failed', { eventId, error });
    }
  }

  async getEvents(page: number = 1, limit: number = 20) {
    return await this.storageService.instance.getEvents({ page, limit });
  }

  private publicEventUrl(eventId: string): string | null {
    const baseUrl = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : null);
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}/events#${eventId}` : null;
  }

  async getEventsCalendarIcs() {
    const publishedEvents = await db.select().from(events)
      .where(eq(events.status, EVENT_STATUS.PUBLISHED))
      .orderBy(asc(events.date))
      .limit(500);

    return buildIcsCalendar(publishedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      updatedAt: event.updatedAt,
      url: this.publicEventUrl(event.id),
    })), { calendarName: 'Événements Komuno' });
  }

  async getEventCalendarIcs(id: string) {
    const [event] = await db.select().from(events)
      .where(eq(events.id, id))
      .limit(1);
    if (!event || event.status !== EVENT_STATUS.PUBLISHED) throw new NotFoundException('Événement introuvable ou non publié');

    return buildIcsCalendar([{ 
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      updatedAt: event.updatedAt,
      url: this.publicEventUrl(event.id),
    }], { calendarName: event.title });
  }

  async createEvent(data: unknown, user?: { firstName?: string; lastName?: string; email?: string }) {
    try {
      const validatedData = insertEventSchema.parse(data);
      const result = await this.storageService.instance.createEvent(validatedData);
      
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      // Envoyer notifications pour nouvel événement
      try {
        const dateString = typeof result.data.date === 'string' 
          ? result.data.date 
          : result.data.date.toISOString();
        
        await notificationService.notifyNewEvent({
          title: result.data.title,
          date: dateString,
          location: result.data.location || 'Lieu à définir'
        });
        
        const organizerName = user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.email || 'Organisateur inconnu';
        await emailNotificationService.notifyNewEvent(result.data, organizerName);
      } catch (notifError) {
        logger.warn('Event notification failed', { eventId: result.data.id, error: notifError });
      }

      await this.autoShareEventToParentBestEffort(result.data.id, user?.email);
      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async createEventWithInscriptions(
    data: unknown,
    user?: { firstName?: string; lastName?: string; email?: string }
  ) {
    try {
      const validatedData = createEventWithInscriptionsSchema.parse(data);
      const result = await this.storageService.instance.createEventWithInscriptions(
        validatedData.event,
        validatedData.initialInscriptions
      );
      
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }

      // Envoyer notifications pour nouvel événement
      try {
        const dateString = typeof result.data.event.date === 'string' 
          ? result.data.event.date 
          : result.data.event.date.toISOString();
        
        await notificationService.notifyNewEvent({
          title: result.data.event.title,
          date: dateString,
          location: result.data.event.location || 'Lieu à définir'
        });
        
        const organizerName = user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.email || 'Organisateur inconnu';
        await emailNotificationService.notifyNewEvent(result.data.event, organizerName);
      } catch (notifError) {
        logger.warn('Event notification failed', { eventId: result.data.event.id, error: notifError });
      }

      await this.autoShareEventToParentBestEffort(result.data.event.id, user?.email);
      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async updateEvent(id: string, data: unknown) {
    try {
      const validatedData = insertEventSchema.parse(data);
      const result = await this.storageService.instance.updateEvent(id, validatedData);
      if (!result.success) {
        if (('error' in result ? result.error : new Error('Unknown error')).name === 'NotFoundError') {
          throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
        }
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      await this.autoShareEventToParentBestEffort(result.data.id);
      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async deleteEvent(id: string) {
    const result = await this.storageService.instance.deleteEvent(id);
    if (!result.success) {
      if (('error' in result ? result.error : new Error('Unknown error')).name === 'NotFoundError') {
        throw new NotFoundException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
  }

  async getEventInscriptions(eventId: string): Promise<Inscription[]> {
    const result = await this.storageService.instance.getEventInscriptions(eventId);
    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }
    return result.data;
  }

  async createInscription(data: unknown) {
    try {
      const validatedData = insertInscriptionSchema.parse(data);
      const result = await this.storageService.instance.createInscription(validatedData);
      
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      
      // Get event title for activity
      const eventResult = await this.storageService.instance.getEvent(validatedData.eventId);
      const eventTitle = eventResult.success ? eventResult.data?.title || 'Événement' : 'Événement';
      
      // Track member activity
      await this.trackMemberActivity(
        validatedData.email,
        validatedData.name,
        'event_registered',
        'event',
        result.data.id,
        eventTitle,
        validatedData.company,
        validatedData.phone
      );
      
      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async createUnsubscription(data: unknown) {
    try {
      const validatedData = insertUnsubscriptionSchema.parse(data);
      const result = await this.storageService.instance.createUnsubscription(validatedData);
      
      if (!result.success) {
        throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
      }
      
      // Get event title for activity
      const eventResult = await this.storageService.instance.getEvent(validatedData.eventId);
      const eventTitle = eventResult.success ? eventResult.data?.title || 'Événement' : 'Événement';
      
      // Track member activity
      await this.trackMemberActivity(
        validatedData.email,
        validatedData.name,
        'event_unregistered',
        'event',
        result.data.id,
        eventTitle
      );
      
      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw error;
    }
  }

  async getEventsStats() {
    try {
      const now = new Date();

      // Récupérer les statistiques des événements
      const [eventsStats] = await db.select({
        total: sql<number>`count(*)::int`,
        upcoming: sql<number>`count(*) FILTER (WHERE ${events.date} > ${now.toISOString()})::int`,
        past: sql<number>`count(*) FILTER (WHERE ${events.date} <= ${now.toISOString()})::int`,
      }).from(events);

      // Récupérer le total des inscriptions
      const [inscriptionsCount] = await db.select({ count: count() }).from(inscriptions);

      const total = eventsStats.total;
      const totalInscriptions = Number(inscriptionsCount.count);

      return {
        total,
        upcoming: eventsStats.upcoming,
        past: eventsStats.past,
        totalInscriptions,
        averageInscriptions: total > 0 ? Math.round(totalInscriptions / total) : 0,
      };
    } catch (error) {
      logger.error('Failed to get events stats', { error });
      throw new BadRequestException('Failed to retrieve events statistics');
    }
  }

  private async trackMemberActivity(
    email: string,
    name: string,
    activityType: 'idea_proposed' | 'vote_cast' | 'event_registered' | 'event_unregistered' | 'patron_suggested',
    entityType: 'idea' | 'vote' | 'event' | 'patron',
    entityId: string,
    entityTitle: string,
    company?: string,
    phone?: string
  ) {
    try {
      await this.storageService.instance.createOrUpdateMember({
        email,
        firstName: name.split(' ')[0] || name,
        lastName: name.split(' ').slice(1).join(' ') || '',
        company,
        phone,
      });

      const scoreImpact = {
        idea_proposed: 10,
        vote_cast: 2,
        event_registered: 5,
        event_unregistered: -3,
        patron_suggested: 8,
      }[activityType];

      await this.storageService.instance.trackMemberActivity({
        memberEmail: email,
        activityType,
        entityType,
        entityId,
        entityTitle,
        scoreImpact,
      });

      logger.info('Member activity tracked', { email, activityType, entityType, entityId });
    } catch (error) {
      logger.error('Member activity tracking failed', { email, activityType, error });
    }
  }
}


