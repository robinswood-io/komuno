import { emailService } from './email-service';
import { storage } from './storage';
import { createNewIdeaEmailTemplate, createNewEventEmailTemplate, createNewMemberProposalEmailTemplate, createNewLoanItemEmailTemplate, type NotificationContext } from './email-templates';
import type { Idea, Event, Result, Member, LoanItem } from '@shared/schema';
import { CJD_ROLES } from '@shared/schema';

class EmailNotificationService {
  private context: NotificationContext;

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
    } catch {
      // Fallback silencieux sur brandingCore
    }
  }

  // Récupérer tous les emails des administrateurs actifs
  private async getAdminEmails(): Promise<Result<string[]>> {
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
        .map(admin => admin.email);

      console.log(`[Email Notifications] ${activeAdminEmails.length} administrateurs actifs trouvés`);

      return {
        success: true,
        data: activeAdminEmails
      };
    } catch (error) {
      console.error('[Email Notifications] Erreur lors de la récupération des admins:', error);
      return {
        success: false,
        error: new Error(`Erreur récupération admins: ${error}`)
      };
    }
  }

  // Notifier les admins d'une nouvelle idée par email
  async notifyNewIdea(idea: Idea): Promise<Result<any>> {
    try {
      console.log(`[Email Notifications] Envoi notification nouvelle idée: ${idea.title}`);

      // Récupérer les emails des administrateurs
      const adminEmailsResult = await this.getAdminEmails();
      if (!adminEmailsResult.success) {
        return adminEmailsResult;
      }

      if (adminEmailsResult.data.length === 0) {
        console.warn('[Email Notifications] Aucun administrateur actif trouvé');
        return {
          success: true,
          data: { message: 'Aucun administrateur à notifier' }
        };
      }

      // Créer le template d'email
      const { subject, html } = createNewIdeaEmailTemplate(
        idea,
        idea.proposedBy,
        this.context
      );

      // Envoyer l'email à tous les administrateurs
      const emailResult = await emailService.sendEmail({
        to: adminEmailsResult.data,
        subject,
        html
      });

      if (emailResult.success) {
        console.log(`[Email Notifications] ✅ Notification idée envoyée à ${adminEmailsResult.data.length} administrateurs`);
      } else {
        const error = 'error' in emailResult ? emailResult.error : new Error('Unknown error');
        console.error('[Email Notifications] ❌ Erreur envoi notification idée:', error);
      }

      return emailResult;
    } catch (error) {
      console.error('[Email Notifications] Erreur notification nouvelle idée:', error);
      return {
        success: false,
        error: new Error(`Erreur notification idée: ${error}`)
      };
    }
  }

  // Notifier les admins d'un nouvel événement par email
  async notifyNewEvent(event: Event, organizerName: string): Promise<Result<any>> {
    try {
      console.log(`[Email Notifications] Envoi notification nouvel événement: ${event.title}`);

      // Récupérer les emails des administrateurs
      const adminEmailsResult = await this.getAdminEmails();
      if (!adminEmailsResult.success) {
        return adminEmailsResult;
      }

      if (adminEmailsResult.data.length === 0) {
        console.warn('[Email Notifications] Aucun administrateur actif trouvé');
        return {
          success: true,
          data: { message: 'Aucun administrateur à notifier' }
        };
      }

      // Créer le template d'email
      const { subject, html } = createNewEventEmailTemplate(
        event,
        organizerName,
        this.context
      );

      // Envoyer l'email à tous les administrateurs
      const emailResult = await emailService.sendEmail({
        to: adminEmailsResult.data,
        subject,
        html
      });

      if (emailResult.success) {
        console.log(`[Email Notifications] ✅ Notification événement envoyée à ${adminEmailsResult.data.length} administrateurs`);
      } else {
        const error = 'error' in emailResult ? emailResult.error : new Error('Unknown error');
        console.error('[Email Notifications] ❌ Erreur envoi notification événement:', error);
      }

      return emailResult;
    } catch (error) {
      console.error('[Email Notifications] Erreur notification nouvel événement:', error);
      return {
        success: false,
        error: new Error(`Erreur notification événement: ${error}`)
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
      console.log('[Email Notifications] Responsable recrutement:', recruitmentManager ? recruitmentManager.email : 'Non défini');

      return {
        success: true,
        data: recruitmentManager?.email || null
      };
    } catch (error) {
      console.error('[Email Notifications] Erreur lors de la récupération du responsable recrutement:', error);
      return {
        success: false,
        error: new Error(`Erreur récupération responsable recrutement: ${error}`)
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
  }): Promise<Result<any>> {
    try {
      console.log(`[Email Notifications] Envoi notification nouveau membre: ${memberData.firstName} ${memberData.lastName}`);

      // Récupérer l'email du responsable recrutement
      const recruitmentManagerEmailResult = await this.getRecruitmentManagerEmail();
      
      if (!recruitmentManagerEmailResult.success) {
        return recruitmentManagerEmailResult;
      }

      // Si aucun responsable recrutement défini, envoyer aux admins
      let recipients: string[];
      if (recruitmentManagerEmailResult.data) {
        recipients = [recruitmentManagerEmailResult.data];
        console.log(`[Email Notifications] Envoi au responsable recrutement: ${recruitmentManagerEmailResult.data}`);
      } else {
        const adminEmailsResult = await this.getAdminEmails();
        if (!adminEmailsResult.success) {
          return adminEmailsResult;
        }
        recipients = adminEmailsResult.data;
        console.log(`[Email Notifications] Aucun responsable recrutement défini, envoi aux admins (${recipients.length})`);
      }

      if (recipients.length === 0) {
        console.error('[Email Notifications] ❌ Configuration erreur: Aucun destinataire trouvé pour la proposition de membre');
        return {
          success: false,
          error: new Error('Aucun destinataire configuré pour les notifications de proposition de membre. Veuillez assigner un responsable recrutement ou activer des administrateurs.')
        };
      }

      // Créer le template d'email
      const { subject, html } = createNewMemberProposalEmailTemplate(
        memberData,
        this.context
      );

      // Envoyer l'email
      const emailResult = await emailService.sendEmail({
        to: recipients,
        subject,
        html
      });

      if (emailResult.success) {
        console.log(`[Email Notifications] ✅ Notification proposition membre envoyée à ${recipients.length} destinataire(s)`);
      } else {
        const error = 'error' in emailResult ? emailResult.error : new Error('Unknown error');
        console.error('[Email Notifications] ❌ Erreur envoi notification proposition membre:', error);
      }

      return emailResult;
    } catch (error) {
      console.error('[Email Notifications] Erreur notification nouvelle proposition membre:', error);
      return {
        success: false,
        error: new Error(`Erreur notification proposition membre: ${error}`)
      };
    }
  }

  // Tester la configuration email
  async testEmailConfiguration(): Promise<Result<any>> {
    try {
      console.log('[Email Notifications] Test de configuration email...');

      // Récupérer les emails des administrateurs
      const adminEmailsResult = await this.getAdminEmails();
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
      const { subject, html } = createTestEmailTemplate();

      // Envoyer uniquement au premier admin pour le test
      const testEmailResult = await emailService.sendEmail({
        to: [adminEmailsResult.data[0]], // Test sur le premier admin uniquement
        subject,
        html
      });

      if (testEmailResult.success) {
        console.log('[Email Notifications] ✅ Test email envoyé avec succès');
      }

      return testEmailResult;
    } catch (error) {
      console.error('[Email Notifications] Erreur lors du test email:', error);
      return {
        success: false,
        error: new Error(`Erreur test email: ${error}`)
      };
    }
  }

  // Notifier les admins d'un nouveau matériel proposé au prêt
  async notifyNewLoanItem(loanItem: LoanItem): Promise<Result<any>> {
    try {
      console.log(`[Email Notifications] Envoi notification nouveau matériel: ${loanItem.title}`);

      // Récupérer les emails des administrateurs
      const adminEmailsResult = await this.getAdminEmails();
      if (!adminEmailsResult.success) {
        return adminEmailsResult;
      }

      if (adminEmailsResult.data.length === 0) {
        console.warn('[Email Notifications] Aucun administrateur actif trouvé');
        return {
          success: true,
          data: { message: 'Aucun administrateur à notifier' }
        };
      }

      // Créer le template d'email
      const { subject, html } = createNewLoanItemEmailTemplate(
        loanItem,
        this.context
      );

      // Envoyer l'email à tous les administrateurs
      const emailResult = await emailService.sendEmail({
        to: adminEmailsResult.data,
        subject,
        html
      });

      if (emailResult.success) {
        console.log(`[Email Notifications] ✅ Notification matériel envoyée à ${adminEmailsResult.data.length} administrateurs`);
      } else {
        const error = 'error' in emailResult ? emailResult.error : new Error('Unknown error');
        console.error('[Email Notifications] ❌ Erreur envoi notification matériel:', error);
      }

      return emailResult;
    } catch (error) {
      console.error('[Email Notifications] Erreur notification nouveau matériel:', error);
      return {
        success: false,
        error: new Error(`Erreur notification matériel: ${error}`)
      };
    }
  }

  // Mise à jour du contexte (utile si l'URL de base change)
  updateContext(newContext: Partial<NotificationContext>): void {
    this.context = { ...this.context, ...newContext };
    console.log('[Email Notifications] Contexte mis à jour:', this.context);
  }
}

// Instance singleton
export const emailNotificationService = new EmailNotificationService();