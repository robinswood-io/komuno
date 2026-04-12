import webpush from 'web-push';
import { db, runDbQuery } from './db';
import { eq } from 'drizzle-orm';
import { pushSubscriptions } from '../shared/schema';
import { logger } from './lib/logger';

const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY ?? '').trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY ?? '').trim();
const VAPID_SUBJECT = (process.env.VAPID_SUBJECT ?? '').trim();
const hasVapidConfig = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
const PERMANENT_SUBSCRIPTION_ERROR_CODES = new Set([400, 404, 410]);

let isPushEnabled = false;

// Configuration de web-push seulement si les clés sont valides
if (hasVapidConfig) {
  try {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    isPushEnabled = true;
    logger.info('[Notifications] Configuration VAPID chargée');
  } catch (error) {
    logger.error('[Notifications] Échec configuration VAPID, push désactivé', { error });
  }
} else {
  logger.warn('[Notifications] Configuration VAPID absente, envoi push désactivé');
}

interface PushSubscription {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string;
  createdAt?: Date;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class NotificationService {
  private subscriptions: Map<string, PushSubscription> = new Map();
  private isLoaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;
  private readonly batchSize = this.resolveBatchSize(process.env.PUSH_BATCH_SIZE);

  constructor() {
    // Ne rien charger dans le constructor pour éviter de bloquer le démarrage
    // Les abonnements seront chargés en background au premier accès
  }

  /**
   * Charge les abonnements en background avec timeout court et fallback gracieux
   */
  private async loadSubscriptions(): Promise<void> {
    // Éviter les chargements multiples simultanés
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        logger.info('[Notifications] Démarrage du chargement des abonnements...');
        
        // Utiliser runDbQuery avec profil 'background' (15s timeout, avec retry)
        const subs = await runDbQuery(
          async () => db.select().from(pushSubscriptions),
          'background'
        );
        
        // Remplir le cache en mémoire
        subs.forEach(sub => {
          this.subscriptions.set(sub.endpoint, {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
            userId: sub.userEmail || undefined
          });
        });
        
        this.isLoaded = true;
        logger.info(`[Notifications] Service initialisé avec ${subs.length} abonnements`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn('[Notifications] Impossible de charger les abonnements (fallback: mode dégradé)', {
          error: errorMessage,
          message: 'Le service fonctionnera en mode dégradé - les nouveaux abonnements seront ajoutés au fur et à mesure'
        });
        
        // Mode dégradé: continuer avec un cache vide
        // Les abonnements seront chargés lors du prochain ajout
        this.isLoaded = true;
      } finally {
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * S'assure que les abonnements sont chargés avant d'effectuer une opération
   */
  private async ensureLoaded(): Promise<void> {
    if (!this.isLoaded) {
      await this.loadSubscriptions();
    }
  }

  /**
   * Démarre le chargement des abonnements en arrière-plan (non-bloquant)
   */
  startBackgroundLoad(): void {
    this.loadSubscriptions().catch(error => {
      logger.error('[Notifications] Erreur fatale lors du chargement background', { error });
    });
  }

  // Ajouter un nouvel abonnement
  async addSubscription(subscription: Omit<PushSubscription, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      await this.ensureLoaded();

      // Vérifier que l'abonnement est valide
      if (!subscription.endpoint || !subscription.p256dh || !subscription.auth) {
        throw new Error('Abonnement invalide');
      }

      // Vérifier si l'abonnement existe déjà
      const existing = await runDbQuery(
        async () =>
          db.select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
            .limit(1),
        'normal'
      );

      const now = new Date();
      
      if (existing.length === 0) {
        // Insérer dans la base de données
        await runDbQuery(
          async () =>
            db.insert(pushSubscriptions).values({
              endpoint: subscription.endpoint,
              p256dh: subscription.p256dh,
              auth: subscription.auth,
              userEmail: subscription.userId ?? null,
              createdAt: now,
              updatedAt: now,
            }),
          'complex'
        );
      } else {
        // Mettre à jour l'abonnement existant
        await runDbQuery(
          async () =>
            db.update(pushSubscriptions)
              .set({
                p256dh: subscription.p256dh,
                auth: subscription.auth,
                userEmail: subscription.userId ?? null,
                updatedAt: now,
              })
              .where(eq(pushSubscriptions.endpoint, subscription.endpoint)),
          'complex'
        );
      }

      // Mettre à jour le cache en mémoire
      this.subscriptions.set(subscription.endpoint, {
        ...subscription,
        createdAt: now
      });

      logger.info('[Notifications] Nouvel abonnement push ajouté', {
        endpoint: this.getEndpointPreview(subscription.endpoint),
        totalSubscriptions: this.subscriptions.size,
      });
      return true;
    } catch (error) {
      logger.error('[Notifications] Erreur ajout abonnement push', { error });
      return false;
    }
  }

  // Supprimer un abonnement
  async removeSubscription(endpoint: string): Promise<boolean> {
    try {
      // Supprimer de la base de données
      await runDbQuery(
        async () =>
          db.delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, endpoint)),
        'complex'
      );
      
      // Supprimer du cache en mémoire
      const removed = this.subscriptions.delete(endpoint);
      logger.info('[Notifications] Abonnement push supprimé', {
        endpoint: this.getEndpointPreview(endpoint),
        totalSubscriptions: this.subscriptions.size,
      });
      return removed;
    } catch (error) {
      logger.error('[Notifications] Erreur suppression abonnement push', { error });
      return false;
    }
  }

  // Envoyer une notification à tous les abonnés
  async sendToAll(payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
    // S'assurer que les abonnements sont chargés
    await this.ensureLoaded();
    
    const results = { sent: 0, failed: 0 };
    const subscriptions = Array.from(this.subscriptions.values());

    if (subscriptions.length === 0) {
      logger.info('[Notifications] Aucun abonnement push actif');
      return results;
    }

    if (!isPushEnabled) {
      logger.warn('[Notifications] Envoi push ignoré: configuration VAPID absente');
      return {
        sent: 0,
        failed: subscriptions.length,
      };
    }

    logger.info(`[Notifications] Envoi à ${subscriptions.length} abonnés: ${payload.title}`);

    // Envoyer en parallèle avec limite de concurrent
    for (let i = 0; i < subscriptions.length; i += this.batchSize) {
      const batch = subscriptions.slice(i, i + this.batchSize);
      const promises = batch.map(subscription => this.sendToSubscription(subscription, payload));
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          results.sent++;
        } else {
          results.failed++;
        }
      });
    }

    logger.info(`[Notifications] Résultats: ${results.sent} envoyées, ${results.failed} échouées`);
    return results;
  }

  // Envoyer une notification à un abonnement spécifique
  private async sendToSubscription(subscription: PushSubscription, payload: NotificationPayload): Promise<boolean> {
    try {
      const pushConfig = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192.svg',
        badge: payload.badge || '/icon-192.svg',
        tag: payload.tag || 'default',
        data: payload.data || {},
        actions: payload.actions || []
      });

      await webpush.sendNotification(pushConfig, notificationPayload, {
        TTL: 24 * 60 * 60, // 24 heures
        urgency: 'normal'
      });

      return true;
    } catch (error: unknown) {
      const statusCode = this.getStatusCode(error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.warn('[Notifications] Échec envoi push vers un abonnement', {
        endpoint: this.getEndpointPreview(subscription.endpoint),
        statusCode,
        error: errorMessage,
      });
      
      // Supprimer les abonnements invalides (410 Gone, 400 Bad Request)
      if (statusCode !== null && PERMANENT_SUBSCRIPTION_ERROR_CODES.has(statusCode)) {
        await this.removeSubscription(subscription.endpoint);
      }
      
      return false;
    }
  }

  // Méthodes spécialisées pour les événements de l'app
  async notifyNewIdea(idea: { title: string; proposedBy: string }): Promise<void> {
    await this.sendToAll({
      title: '💡 Nouvelle idée proposée',
      body: `"${idea.title}" par ${idea.proposedBy}`,
      tag: 'new-idea',
      data: { type: 'new_idea', ideaTitle: idea.title },
      actions: [
        {
          action: 'view',
          title: 'Voir l\'idée'
        },
        {
          action: 'vote',
          title: 'Voter'
        }
      ]
    });
  }

  async notifyNewEvent(event: { title: string; date: string; location: string }): Promise<void> {
    const eventDate = new Date(event.date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    await this.sendToAll({
      title: '📅 Nouvel événement',
      body: `${event.title} - ${eventDate} à ${event.location}`,
      tag: 'new-event',
      data: { type: 'new_event', eventTitle: event.title },
      actions: [
        {
          action: 'view',
          title: 'Voir l\'événement'
        },
        {
          action: 'register',
          title: 'S\'inscrire'
        }
      ]
    });
  }

  async notifyNewLoanItem(loanItem: { title: string; lenderName: string }): Promise<void> {
    await this.sendToAll({
      title: '📦 Nouveau matériel proposé au prêt',
      body: `"${loanItem.title}" prêté par ${loanItem.lenderName}`,
      tag: 'new-loan-item',
      data: { type: 'new_loan_item', loanItemTitle: loanItem.title },
      actions: [
        {
          action: 'view',
          title: 'Voir le matériel'
        }
      ]
    });
  }

  async notifyIdeaStatusChange(idea: { title: string; status: string; proposedBy: string }): Promise<void> {
    const statusMessages = {
      'approuvée': '✅ Votre idée a été approuvée',
      'rejetée': '❌ Votre idée a été rejetée',
      'en_cours_etude': '🔍 Votre idée est en cours d\'étude',
      'reportée': '⏳ Votre idée a été reportée',
      'réalisée': '🎉 Votre idée a été réalisée'
    };

    const title = statusMessages[idea.status as keyof typeof statusMessages] || 'Statut de votre idée mis à jour';

    await this.sendToAll({
      title,
      body: `"${idea.title}"`,
      tag: 'idea-status-change',
      data: { type: 'idea_status_change', status: idea.status }
    });
  }

  // Obtenir les statistiques
  getStats(): { totalSubscriptions: number; activeSubscriptions: number } {
    return {
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions: this.subscriptions.size // Tous actifs pour l'instant
    };
  }

  // Obtenir la clé publique VAPID
  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  private resolveBatchSize(rawBatchSize: string | undefined): number {
    const parsed = Number.parseInt(rawBatchSize ?? '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 10;
    }
    return Math.min(parsed, 100);
  }

  private getEndpointPreview(endpoint: string): string {
    return endpoint.length <= 60 ? endpoint : `${endpoint.slice(0, 60)}...`;
  }

  private getStatusCode(error: unknown): number | null {
    if (typeof error !== 'object' || error === null) {
      return null;
    }
    const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof maybeStatusCode === 'number' ? maybeStatusCode : null;
  }
}

// Instance singleton
export const notificationService = new NotificationService();

// Démarrer le chargement en arrière-plan (non-bloquant)
notificationService.startBackgroundLoad();
