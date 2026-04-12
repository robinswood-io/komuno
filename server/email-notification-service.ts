import { emailService } from './email-service';
import { storage } from './storage';
import { createNewIdeaEmailTemplate, createNewEventEmailTemplate, createNewMemberProposalEmailTemplate, createNewLoanItemEmailTemplate, type NotificationContext } from './email-templates';
import type { Idea, Event, Result, LoanItem } from '@shared/schema';
import { CJD_ROLES } from '@shared/schema';
import { logger } from './lib/logger';

class EmailNotificationService {
  private context: NotificationContext;
  private adminEmailCache: { emails: string[]; expiresAt: number } | null = null;
  private readonly ADMIN_EMAIL_CACHE_TTL_MS = 60_000;

  constructor() {
    this.context = {
      baseUrl: process.env.BASE_URL || 'http://localhost:5000',
      adminDashboardUrl: process.env.BASE_URL ? `${process.env.BASE_URL}/admin` : 'http://localhost:5000/admin',
    };
    // Charger le branding depuis la DB au démarrage (async, best-effort)
    this.loadBranding();
  }

  private async loadBranding(): Promise<void> {
    try {
      const result = await storage.getBrandingConfig();
      if (result.success && result.data) {
        const config = typeof result.data.config === 'string'
          ? JSON.parse(result.data.config)
          : result.data;
        this.context = {
          ...this.context,
          branding: {
            primaryColor: config?.colors?.primary,
            appName: config?.app?.shortName || config?.app?.name,
            orgFullName: config?.organization?.fullName || config?.organization?.name,
          },
        };
      }
    } catch (error) {
      logger.warn('[Email Notifications] Impossible de charger le branding depuis la base, fallback par défaut', {
        error: String(error),
      });
    }
  }

  // Récupérer tous les emails des administrateurs actifs
  private async getAdminEmails(options?: { forceRefresh?: boolean }): Promise<Result<string[]>> {
    if (!options?.forceRefresh && this.adminEmailCache && this.adminEmailCache.expiresAt > Date.now()) {
      return {
        success: true,
        data: this.adminEmailCache.emails,
      };
    }

    try {
      const adminsResult = await storage.getAllAdmins();
      
      if (!adminsResult.success) {
        return {
          success: false,
          error: 'error' in adminsResult ? adminsResult.error : new Error('Unknown error')
        };
      }

      // Filtrer les admins actifs uniquement
      const activeAdminEmails = adminsResult.data
        .filter(admin => admin.isActive && admin.status === 'active')
        .map(admin => admin.email.trim().toLowerCase())
        .filter((email) => email.length > 0);

      const uniqueAdminEmails = Array.from(new Set(activeAdminEmails));
      this.adminEmailCache = {
        emails: uniqueAdminEmails,
        expiresAt: Date.now() + this.ADMIN_EMAIL_CACHE_TTL_MS,
      };

      logger.info('[Email Notifications] Destinataires administrateurs chargés', {
        count: uniqueAdminEmails.length,
      });

      return {
        success: true,
        data: uniqueAdminEmails
      };
    } catch (error) {
      logger.error('[Email Notifications] Erreur lors de la récupération des administrateurs', { error });
      return {
        success: false,
        error: new Error(`Erreur récupération admins: ${String(error)}`)
      };
    }
  }

  private normalizeRecipients(recipients: string[]): string[] {
    return Array.from(
      new Set(
        recipients
          .map((recipient) => recipient.trim().toLowerCase())
          .filter((recipient) => recipient.length > 0)
      )
    );
  }

  private async sendToRecipients(
    recipients: string[],
    subject: string,
    html: string,
    context: string
  ): Promise<Result<unknown>> {
    const normalizedRecipients = this.normalizeRecipients(recipients);
    if (normalizedRecipients.length === 0) {
      logger.warn('[Email Notifications] Aucun destinataire trouvé, envoi ignoré', { context });
      return {
        success: true,
        data: { message: 'Aucun destinataire à notifier' },
      };
    }

    const emailResult = await emailService.sendEmail({
      to: normalizedRecipients,
      subject,
      html,
    });

    if (emailResult.success) {
      logger.info('[Email Notifications] Notification email envoyée', {
        context,
        recipients: normalizedRecipients.length,
        messageId: emailResult.data.messageId,
      });
      return emailResult;
    }

    logger.error('[Email Notifications] Échec envoi notification email', {
      context,
      recipients: normalizedRecipients.length,
      error: String(emailResult.error),
    });
    return emailResult;
  }

  // Notifier les admins d'une nouvelle idée par email
  async notifyNewIdea(idea: Idea): Promise<Result<unknown>> {
    try {
      logger.info('[Email Notifications] Préparation notification nouvelle idée', { title: idea.title });

      // Récupérer les emails des administrateurs
      const adminEmailsResult = await this.getAdminEmails();
      if (!adminEmailsResult.success) {
        return adminEmailsResult;
      }

      // Créer le template d'email
      const { subject, html } = createNewIdeaEmailTemplate(
        idea,
        idea.proposedBy,
        this.context
      );

      return this.sendToRecipients(adminEmailsResult.data, subject, html, 'new_idea');
    } catch (error) {
      logger.error('[Email Notifications] Erreur notification nouvelle idée', { error, title: idea.title });
      return {
        success: false,
        error: new Error(`Erreur notification idée: ${String(error)}`)
      };
    }
  }

  // Notifier les admins d'un nouvel événement par email
  async notifyNewEvent(event: Event, organizerName: string): Promise<Result<unknown>> {
    try {
      logger.info('[Email Notifications] Préparation notification nouvel événement', { title: event.title });

      // Récupérer les emails des administrateurs
      const adminEmailsResult = await this.getAdminEmails();
      if (!adminEmailsResult.success) {
        return adminEmailsResult;
      }

      // Créer le template d'email
      const { subject, html } = createNewEventEmailTemplate(
        event,
        organizerName,
        this.context
      );

      return this.sendToRecipients(adminEmailsResult.data, subject, html, 'new_event');
    } catch (error) {
      logger.error('[Email Notifications] Erreur notification nouvel événement', { error, title: event.title });
      return {
        success: false,
        error: new Error(`Erreur notification événement: ${String(error)}`)
      };
    }
  }

  // Récupérer l'email du responsable recrutement
  private async getRecruitmentManagerEmail(): Promise<Result<string | null>> {
    try {
      // Utiliser la méthode dédiée pour récupérer le responsable recrutement
      const memberResult = await storage.getMemberByCjdRole(CJD_ROLES.RESPONSABLE_RECRUTEMENT);
      
      if (!memberResult.success) {
        return {
          success: false,
          error: 'error' in memberResult ? memberResult.error : new Error('Unknown error')
        };
      }

      const recruitmentManager = memberResult.data;
      logger.info('[Email Notifications] Responsable recrutement résolu', {
        hasRecruitmentManager: Boolean(recruitmentManager?.email),
      });

      return {
        success: true,
        data: recruitmentManager?.email || null
      };
    } catch (error) {
      logger.error('[Email Notifications] Erreur lors de la récupération du responsable recrutement', { error });
      return {
        success: false,
        error: new Error(`Erreur récupération responsable recrutement: ${String(error)}`)
      };
    }
  }

  // Notifier le responsable recrutement d'un nouveau membre proposé
  async notifyNewMemberProposal(memberData: {
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    phone?: string;
    role?: string;
    notes?: string;
    proposedBy: string;
  }): Promise<Result<unknown>> {
    try {
      logger.info('[Email Notifications] Préparation notification nouvelle proposition membre', {
        fullName: `${memberData.firstName} ${memberData.lastName}`,
      });

      // Récupérer l'email du responsable recrutement
      const recruitmentManagerEmailResult = await this.getRecruitmentManagerEmail();
      
      if (!recruitmentManagerEmailResult.success) {
        return recruitmentManagerEmailResult;
      }

      // Si aucun responsable recrutement défini, envoyer aux admins
      let recipients: string[];
      if (recruitmentManagerEmailResult.data) {
        recipients = [recruitmentManagerEmailResult.data];
        logger.info('[Email Notifications] Envoi dirigé vers le responsable recrutement');
      } else {
        const adminEmailsResult = await this.getAdminEmails();
        if (!adminEmailsResult.success) {
          return adminEmailsResult;
        }
        recipients = adminEmailsResult.data;
        logger.warn('[Email Notifications] Aucun responsable recrutement défini, fallback vers administrateurs', {
          recipients: recipients.length,
        });
      }

      // Créer le template d'email
      const { subject, html } = createNewMemberProposalEmailTemplate(
        memberData,
        this.context
      );

      return this.sendToRecipients(
        recipients,
        subject,
        html,
        'new_member_proposal'
      );
    } catch (error) {
      logger.error('[Email Notifications] Erreur notification nouvelle proposition membre', { error });
      return {
        success: false,
        error: new Error(`Erreur notification proposition membre: ${String(error)}`)
      };
    }
  }

  // Tester la configuration email
  async testEmailConfiguration(): Promise<Result<unknown>> {
    try {
      logger.info('[Email Notifications] Démarrage test de configuration email');

      // Récupérer les emails des administrateurs
      const adminEmailsResult = await this.getAdminEmails({ forceRefresh: true });
      if (!adminEmailsResult.success) {
        return adminEmailsResult;
      }

      if (adminEmailsResult.data.length === 0) {
        return {
          success: false,
          error: new Error('Aucun administrateur actif trouvé pour le test')
        };
      }

      // Utiliser le template de test
      const { createTestEmailTemplate } = await import('./email-templates');
      const { subject, html } = createTestEmailTemplate(this.context);

      const testRecipient = adminEmailsResult.data[0];
      const testEmailResult = await emailService.sendEmail({
        to: [testRecipient],
        subject,
        html
      });

      if (testEmailResult.success) {
        logger.info('[Email Notifications] Test email envoyé avec succès', {
          recipient: testRecipient,
          messageId: testEmailResult.data.messageId,
        });
      } else {
        logger.error('[Email Notifications] Échec du test email', {
          recipient: testRecipient,
          error: String(testEmailResult.error),
        });
      }

      return testEmailResult;
    } catch (error) {
      logger.error('[Email Notifications] Erreur lors du test email', { error });
      return {
        success: false,
        error: new Error(`Erreur test email: ${String(error)}`)
      };
    }
  }

  // Notifier les admins d'un nouveau matériel proposé au prêt
  async notifyNewLoanItem(loanItem: LoanItem): Promise<Result<unknown>> {
    try {
      logger.info('[Email Notifications] Préparation notification nouveau matériel', {
        title: loanItem.title,
      });

      // Récupérer les emails des administrateurs
      const adminEmailsResult = await this.getAdminEmails();
      if (!adminEmailsResult.success) {
        return adminEmailsResult;
      }

      // Créer le template d'email
      const { subject, html } = createNewLoanItemEmailTemplate(
        loanItem,
        this.context
      );

      return this.sendToRecipients(adminEmailsResult.data, subject, html, 'new_loan_item');
    } catch (error) {
      logger.error('[Email Notifications] Erreur notification nouveau matériel', { error, title: loanItem.title });
      return {
        success: false,
        error: new Error(`Erreur notification matériel: ${String(error)}`)
      };
    }
  }

  // Mise à jour du contexte (utile si l'URL de base change)
  updateContext(newContext: Partial<NotificationContext>): void {
    this.context = { ...this.context, ...newContext };
    logger.info('[Email Notifications] Contexte des notifications mis à jour');
  }
}

// Instance singleton
export const emailNotificationService = new EmailNotificationService();
