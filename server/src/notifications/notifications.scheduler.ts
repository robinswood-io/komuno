import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsGeneratorService } from './notifications-generator.service';
import { NotificationsService } from './notifications.service';

/**
 * Scheduler pour la génération automatique de notifications
 * Exécute les tâches de génération à intervalles réguliers
 */
@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private notificationsGenerator: NotificationsGeneratorService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Génération quotidienne de toutes les notifications
   * Exécuté tous les jours à 8h00
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, {
    name: 'daily-notifications',
    timeZone: 'Europe/Paris',
  })
  async handleDailyNotifications() {
    this.logger.log('Début de la génération quotidienne de notifications...');

    try {
      const result = await this.notificationsGenerator.generateAllNotifications();

      this.logger.log(
        `Génération quotidienne terminée: ${result.total} notification(s) créée(s) ` +
        `(cotisations: ${result.memberSubscriptions}, tâches à venir: ${result.upcomingTasks}, ` +
        `tâches en retard: ${result.overdueTasks}, événements: ${result.upcomingEvents})`
      );
    } catch (error) {
      this.logger.error(`Erreur lors de la génération quotidienne de notifications: ${error}`);
    }
  }

  /**
   * Vérification des tâches en retard
   * Exécuté toutes les heures pendant les heures de travail (8h-18h)
   */
  @Cron('0 8-18 * * *', {
    name: 'hourly-overdue-tasks',
    timeZone: 'Europe/Paris',
  })
  async handleHourlyOverdueTasks() {
    this.logger.debug('Vérification des tâches en retard...');

    try {
      const count = await this.notificationsGenerator.generateOverdueTaskReminders();

      if (count > 0) {
        this.logger.log(`${count} alerte(s) de tâches en retard créée(s)`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification des tâches en retard: ${error}`);
    }
  }

  /**
   * Rappel des événements à venir
   * Exécuté tous les jours à 18h00
   */
  @Cron(CronExpression.EVERY_DAY_AT_6PM, {
    name: 'daily-upcoming-events',
    timeZone: 'Europe/Paris',
  })
  async handleDailyUpcomingEvents() {
    this.logger.debug('Vérification des événements à venir...');

    try {
      const count = await this.notificationsGenerator.generateUpcomingEventReminders();

      if (count > 0) {
        this.logger.log(`${count} rappel(s) d'événements à venir créé(s)`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification des événements à venir: ${error}`);
    }
  }

  /**
   * Nettoyage des anciennes notifications
   * Exécuté tous les dimanches à 2h00 du matin
   * Supprime les notifications lues de plus de 30 jours
   */
  @Cron('0 2 * * 0', {
    name: 'weekly-cleanup',
    timeZone: 'Europe/Paris',
  })
  async handleWeeklyCleanup() {
    this.logger.log('Nettoyage des anciennes notifications...');

    try {
      const count = await this.notificationsService.deleteOldNotifications(30);
      this.logger.log(`${count} notification(s) ancienne(s) supprimée(s)`);
    } catch (error) {
      this.logger.error(`Erreur lors du nettoyage des anciennes notifications: ${error}`);
    }
  }
}
