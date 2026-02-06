import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE } from '../common/database/database.providers';
import { DrizzleDb } from '../common/database/types';
import { NotificationsService } from './notifications.service';
import { members, memberTasks, events, admins } from '../../../shared/schema';
import { sql, and, eq, lte, gte } from 'drizzle-orm';

/**
 * Service de génération automatique de notifications
 * Génère des alertes pour :
 * - Échéances de cotisations membres
 * - Tâches à faire / en retard
 * - Événements à venir
 * - Nouvelles idées / changements de statut
 */
@Injectable()
export class NotificationsGeneratorService {
  private readonly logger = new Logger(NotificationsGeneratorService.name);

  constructor(
    @Inject(DATABASE) private db: DrizzleDb,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Générer toutes les notifications automatiques
   */
  async generateAllNotifications(): Promise<{
    memberSubscriptions: number;
    upcomingTasks: number;
    overdueTasks: number;
    upcomingEvents: number;
    total: number;
  }> {
    this.logger.log('Génération de toutes les notifications automatiques...');

    const [memberSubscriptions, upcomingTasks, overdueTasks, upcomingEvents] = await Promise.all([
      this.generateMemberSubscriptionReminders(),
      this.generateUpcomingTaskReminders(),
      this.generateOverdueTaskReminders(),
      this.generateUpcomingEventReminders(),
    ]);

    const total = memberSubscriptions + upcomingTasks + overdueTasks + upcomingEvents;

    this.logger.log(
      `Génération terminée: ${total} notification(s) créée(s) (cotisations: ${memberSubscriptions}, tâches à venir: ${upcomingTasks}, tâches en retard: ${overdueTasks}, événements: ${upcomingEvents})`
    );

    return {
      memberSubscriptions,
      upcomingTasks,
      overdueTasks,
      upcomingEvents,
      total,
    };
  }

  /**
   * Générer des rappels pour les cotisations membres qui expirent bientôt
   * Alerte 30, 7 et 1 jour avant expiration
   */
  async generateMemberSubscriptionReminders(): Promise<number> {
    try {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Récupérer les admins pour leur envoyer les notifications
      const adminUsers = await this.db
        .select()
        .from(admins)
        .where(eq(admins.isActive, true));

      let notificationsCreated = 0;

      // Récupérer les membres actifs dont la cotisation expire dans les 30 prochains jours
      const expiringMembers = await this.db
        .select()
        .from(members)
        .where(
          and(
            eq(members.status, 'active'),
            gte(members.subscriptionEndDate, now),
            lte(members.subscriptionEndDate, in30Days)
          )
        );

      // Pour chaque membre dont la cotisation expire bientôt
      for (const member of expiringMembers) {
        if (!member.subscriptionEndDate) {
          continue; // Passer si pas de date d'expiration
        }

        const daysRemaining = Math.ceil(
          (member.subscriptionEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Ne notifier que pour 30, 7 et 1 jour avant expiration
        if (![30, 7, 1].includes(daysRemaining)) {
          continue;
        }

        // Notifier tous les admins actifs
        for (const admin of adminUsers) {
          // Vérifier si une notification a déjà été créée aujourd'hui pour ce membre
          const existingNotif = await this.notificationsService.searchNotifications(admin.email, {
            type: 'member_update',
            entityId: member.email,
            limit: 1,
            offset: 0,
          });

          if (existingNotif.notifications.length > 0) {
            const lastNotif = existingNotif.notifications[0];
            const lastNotifDate = new Date(lastNotif.createdAt);
            const today = new Date();

            if (
              lastNotifDate.getDate() === today.getDate() &&
              lastNotifDate.getMonth() === today.getMonth() &&
              lastNotifDate.getFullYear() === today.getFullYear()
            ) {
              continue; // Skip, notification déjà créée aujourd'hui
            }
          }

          await this.notificationsService.createNotification({
            userId: admin.email,
            type: 'member_update',
            title: `Cotisation à renouveler - ${member.firstName} ${member.lastName}`,
            body: `La cotisation de ${member.firstName} ${member.lastName} expire dans ${daysRemaining} jour(s)`,
            icon: '💳',
            isRead: false,
            metadata: {
              memberEmail: member.email,
              daysRemaining,
              subscriptionEndDate: member.subscriptionEndDate.toISOString(),
            } as Record<string, unknown>,
            entityType: 'member',
            entityId: member.email,
          });

          notificationsCreated++;
        }
      }

      this.logger.debug(`${notificationsCreated} rappel(s) de cotisations créé(s)`);
      return notificationsCreated;
    } catch (error) {
      this.logger.error(`Erreur lors de la génération des rappels de cotisations: ${error}`);
      return 0;
    }
  }

  /**
   * Générer des rappels pour les tâches à venir (dans les 3 prochains jours)
   */
  async generateUpcomingTaskReminders(): Promise<number> {
    try {
      const now = new Date();
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Récupérer les tâches non complétées avec une deadline dans les 3 prochains jours
      const upcomingTasks = await this.db
        .select()
        .from(memberTasks)
        .where(
          and(
            eq(memberTasks.status, 'todo'),
            gte(memberTasks.dueDate, now),
            lte(memberTasks.dueDate, in3Days)
          )
        );

      let notificationsCreated = 0;

      for (const task of upcomingTasks) {
        // Skip if no assignedTo or dueDate
        if (!task.assignedTo || !task.dueDate) {
          continue;
        }

        // Vérifier si une notification a déjà été créée pour cette tâche aujourd'hui
        const existingNotif = await this.notificationsService.searchNotifications(task.assignedTo, {
          type: 'task_reminder',
          entityId: task.id,
          limit: 1,
          offset: 0,
        });

        // Si une notification existe déjà et a été créée aujourd'hui, ne pas en créer une nouvelle
        if (existingNotif.notifications.length > 0) {
          const lastNotif = existingNotif.notifications[0];
          const lastNotifDate = new Date(lastNotif.createdAt);
          const today = new Date();

          if (
            lastNotifDate.getDate() === today.getDate() &&
            lastNotifDate.getMonth() === today.getMonth() &&
            lastNotifDate.getFullYear() === today.getFullYear()
          ) {
            continue; // Skip, notification déjà créée aujourd'hui
          }
        }

        const daysRemaining = Math.ceil(
          (new Date(task.dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        await this.notificationsService.createNotification({
          userId: task.assignedTo,
          type: 'task_reminder',
          title: `Tâche à effectuer - ${task.title}`,
          body: `Échéance dans ${daysRemaining} jour(s): ${task.description || task.title}`,
          icon: '⏰',
          isRead: false,
          metadata: {
            taskId: task.id,
            daysRemaining,
            dueDate: task.dueDate.toISOString(),
          } as Record<string, unknown>,
          entityType: 'task',
          entityId: task.id,
        });

        notificationsCreated++;
      }

      this.logger.debug(`${notificationsCreated} rappel(s) de tâches à venir créé(s)`);
      return notificationsCreated;
    } catch (error) {
      this.logger.error(`Erreur lors de la génération des rappels de tâches à venir: ${error}`);
      return 0;
    }
  }

  /**
   * Générer des alertes pour les tâches en retard
   */
  async generateOverdueTaskReminders(): Promise<number> {
    try {
      const now = new Date();

      // Récupérer les tâches non complétées dont la deadline est dépassée
      const overdueTasks = await this.db
        .select()
        .from(memberTasks)
        .where(
          and(
            eq(memberTasks.status, 'todo'),
            lte(memberTasks.dueDate, now)
          )
        );

      let notificationsCreated = 0;

      for (const task of overdueTasks) {
        // Skip if no assignedTo or dueDate
        if (!task.assignedTo || !task.dueDate) {
          continue;
        }

        // Vérifier si une notification de retard a déjà été créée aujourd'hui
        const existingNotif = await this.notificationsService.searchNotifications(task.assignedTo, {
          type: 'task_reminder',
          entityId: task.id,
          limit: 1,
          offset: 0,
        });

        if (existingNotif.notifications.length > 0) {
          const lastNotif = existingNotif.notifications[0];
          const lastNotifDate = new Date(lastNotif.createdAt);
          const today = new Date();

          if (
            lastNotifDate.getDate() === today.getDate() &&
            lastNotifDate.getMonth() === today.getMonth() &&
            lastNotifDate.getFullYear() === today.getFullYear()
          ) {
            continue;
          }
        }

        const daysOverdue = Math.floor(
          (now.getTime() - new Date(task.dueDate).getTime()) / (24 * 60 * 60 * 1000)
        );

        await this.notificationsService.createNotification({
          userId: task.assignedTo,
          type: 'task_reminder',
          title: `⚠️ Tâche en retard - ${task.title}`,
          body: `En retard de ${daysOverdue} jour(s): ${task.description || task.title}`,
          icon: '🚨',
          isRead: false,
          metadata: {
            taskId: task.id,
            daysOverdue,
            dueDate: task.dueDate.toISOString(),
            isOverdue: true,
          } as Record<string, unknown>,
          entityType: 'task',
          entityId: task.id,
        });

        notificationsCreated++;
      }

      this.logger.debug(`${notificationsCreated} alerte(s) de tâches en retard créée(s)`);
      return notificationsCreated;
    } catch (error) {
      this.logger.error(`Erreur lors de la génération des alertes de tâches en retard: ${error}`);
      return 0;
    }
  }

  /**
   * Générer des rappels pour les événements à venir (dans les 7 prochains jours)
   */
  async generateUpcomingEventReminders(): Promise<number> {
    try {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Récupérer les événements publiés dans les 7 prochains jours
      const upcomingEvents = await this.db
        .select()
        .from(events)
        .where(
          and(
            eq(events.status, 'published'),
            gte(events.date, now),
            lte(events.date, in7Days)
          )
        );

      let notificationsCreated = 0;

      // Récupérer tous les admins pour les notifier des événements à venir
      const adminUsers = await this.db
        .select()
        .from(admins)
        .where(eq(admins.isActive, true));

      for (const event of upcomingEvents) {
        const daysUntilEvent = Math.ceil(
          (new Date(event.date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Ne notifier que pour 7, 3 et 1 jour avant
        if (![7, 3, 1].includes(daysUntilEvent)) {
          continue;
        }

        for (const admin of adminUsers) {
          // Vérifier si une notification a déjà été créée pour cet événement aujourd'hui
          const existingNotif = await this.notificationsService.searchNotifications(admin.email, {
            type: 'event_update',
            entityId: event.id,
            limit: 1,
            offset: 0,
          });

          if (existingNotif.notifications.length > 0) {
            const lastNotif = existingNotif.notifications[0];
            const lastNotifDate = new Date(lastNotif.createdAt);
            const today = new Date();

            if (
              lastNotifDate.getDate() === today.getDate() &&
              lastNotifDate.getMonth() === today.getMonth() &&
              lastNotifDate.getFullYear() === today.getFullYear()
            ) {
              continue;
            }
          }

          await this.notificationsService.createNotification({
            userId: admin.email,
            type: 'event_update',
            title: `Événement dans ${daysUntilEvent} jour(s) - ${event.title}`,
            body: `${event.title} - ${event.location || 'Lieu non spécifié'}`,
            icon: '📅',
            isRead: false,
            metadata: {
              eventId: event.id,
              daysUntilEvent,
              eventDate: event.date.toISOString(),
              location: event.location,
            } as Record<string, unknown>,
            entityType: 'event',
            entityId: event.id,
          });

          notificationsCreated++;
        }
      }

      this.logger.debug(`${notificationsCreated} rappel(s) d'événements à venir créé(s)`);
      return notificationsCreated;
    } catch (error) {
      this.logger.error(`Erreur lors de la génération des rappels d'événements: ${error}`);
      return 0;
    }
  }

  /**
   * Générer une notification pour une nouvelle idée
   */
  async notifyNewIdea(ideaId: string, ideaTitle: string, proposedBy: string): Promise<void> {
    try {
      // Notifier tous les admins avec permission de gestion des idées
      const adminUsers = await this.db
        .select()
        .from(admins)
        .where(
          and(
            eq(admins.isActive, true),
            sql`(${admins.role} = 'super_admin' OR ${admins.role} = 'ideas_manager')`
          )
        );

      for (const admin of adminUsers) {
        await this.notificationsService.createNotification({
          userId: admin.email,
          type: 'idea_update',
          title: `💡 Nouvelle idée proposée`,
          body: `${ideaTitle} - Proposée par ${proposedBy}`,
          icon: '💡',
          isRead: false,
          metadata: {
            ideaId,
            proposedBy,
            action: 'created',
          } as Record<string, unknown>,
          entityType: 'idea',
          entityId: ideaId,
        });
      }

      this.logger.debug(`Notifications envoyées pour nouvelle idée: ${ideaId}`);
    } catch (error) {
      this.logger.error(`Erreur lors de la notification de nouvelle idée: ${error}`);
    }
  }

  /**
   * Générer une notification pour un changement de statut d'idée
   */
  async notifyIdeaStatusChange(
    ideaId: string,
    ideaTitle: string,
    oldStatus: string,
    newStatus: string,
    proposedByEmail: string
  ): Promise<void> {
    try {
      // Notifier le proposant de l'idée
      await this.notificationsService.createNotification({
        userId: proposedByEmail,
        type: 'idea_update',
        title: `Mise à jour de votre idée - ${ideaTitle}`,
        body: `Statut changé de "${oldStatus}" à "${newStatus}"`,
        icon: '🔄',
        isRead: false,
        metadata: {
          ideaId,
          oldStatus,
          newStatus,
          action: 'status_change',
        } as Record<string, unknown>,
        entityType: 'idea',
        entityId: ideaId,
      });

      this.logger.debug(`Notification de changement de statut envoyée pour idée: ${ideaId}`);
    } catch (error) {
      this.logger.error(`Erreur lors de la notification de changement de statut d'idée: ${error}`);
    }
  }
}
