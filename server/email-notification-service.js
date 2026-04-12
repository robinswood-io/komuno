"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailNotificationService = void 0;
const email_service_1 = require("./email-service");
const storage_1 = require("./storage");
const email_templates_1 = require("./email-templates");
const schema_1 = require("../shared/schema");
const logger_1 = require("./lib/logger");
class EmailNotificationService {
    constructor() {
        this.adminEmailCache = null;
        this.ADMIN_EMAIL_CACHE_TTL_MS = 60_000;
        this.context = {
            baseUrl: process.env.BASE_URL || 'http://localhost:5000',
            adminDashboardUrl: process.env.BASE_URL ? `${process.env.BASE_URL}/admin` : 'http://localhost:5000/admin',
        };
        // Charger le branding depuis la DB au démarrage (async, best-effort)
        this.loadBranding();
    }
    async loadBranding() {
        try {
            const result = await storage_1.storage.getBrandingConfig();
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
        }
        catch (error) {
            logger_1.logger.warn('[Email Notifications] Impossible de charger le branding depuis la base, fallback par défaut', {
                error: String(error),
            });
        }
    }
    // Récupérer tous les emails des administrateurs actifs
    async getAdminEmails(options) {
        if (!options?.forceRefresh && this.adminEmailCache && this.adminEmailCache.expiresAt > Date.now()) {
            return {
                success: true,
                data: this.adminEmailCache.emails,
            };
        }
        try {
            const adminsResult = await storage_1.storage.getAllAdmins();
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
            logger_1.logger.info('[Email Notifications] Destinataires administrateurs chargés', {
                count: uniqueAdminEmails.length,
            });
            return {
                success: true,
                data: uniqueAdminEmails
            };
        }
        catch (error) {
            logger_1.logger.error('[Email Notifications] Erreur lors de la récupération des administrateurs', { error });
            return {
                success: false,
                error: new Error(`Erreur récupération admins: ${String(error)}`)
            };
        }
    }
    normalizeRecipients(recipients) {
        return Array.from(new Set(recipients
            .map((recipient) => recipient.trim().toLowerCase())
            .filter((recipient) => recipient.length > 0)));
    }
    async sendToRecipients(recipients, subject, html, context) {
        const normalizedRecipients = this.normalizeRecipients(recipients);
        if (normalizedRecipients.length === 0) {
            logger_1.logger.warn('[Email Notifications] Aucun destinataire trouvé, envoi ignoré', { context });
            return {
                success: true,
                data: { message: 'Aucun destinataire à notifier' },
            };
        }
        const emailResult = await email_service_1.emailService.sendEmail({
            to: normalizedRecipients,
            subject,
            html,
        });
        if (emailResult.success) {
            logger_1.logger.info('[Email Notifications] Notification email envoyée', {
                context,
                recipients: normalizedRecipients.length,
                messageId: emailResult.data.messageId,
            });
            return emailResult;
        }
        logger_1.logger.error('[Email Notifications] Échec envoi notification email', {
            context,
            recipients: normalizedRecipients.length,
            error: String(emailResult.error),
        });
        return emailResult;
    }
    // Notifier les admins d'une nouvelle idée par email
    async notifyNewIdea(idea) {
        try {
            logger_1.logger.info('[Email Notifications] Préparation notification nouvelle idée', { title: idea.title });
            // Récupérer les emails des administrateurs
            const adminEmailsResult = await this.getAdminEmails();
            if (!adminEmailsResult.success) {
                return adminEmailsResult;
            }
            // Créer le template d'email
            const { subject, html } = (0, email_templates_1.createNewIdeaEmailTemplate)(idea, idea.proposedBy, this.context);
            return this.sendToRecipients(adminEmailsResult.data, subject, html, 'new_idea');
        }
        catch (error) {
            logger_1.logger.error('[Email Notifications] Erreur notification nouvelle idée', { error, title: idea.title });
            return {
                success: false,
                error: new Error(`Erreur notification idée: ${String(error)}`)
            };
        }
    }
    // Notifier les admins d'un nouvel événement par email
    async notifyNewEvent(event, organizerName) {
        try {
            logger_1.logger.info('[Email Notifications] Préparation notification nouvel événement', { title: event.title });
            // Récupérer les emails des administrateurs
            const adminEmailsResult = await this.getAdminEmails();
            if (!adminEmailsResult.success) {
                return adminEmailsResult;
            }
            // Créer le template d'email
            const { subject, html } = (0, email_templates_1.createNewEventEmailTemplate)(event, organizerName, this.context);
            return this.sendToRecipients(adminEmailsResult.data, subject, html, 'new_event');
        }
        catch (error) {
            logger_1.logger.error('[Email Notifications] Erreur notification nouvel événement', { error, title: event.title });
            return {
                success: false,
                error: new Error(`Erreur notification événement: ${String(error)}`)
            };
        }
    }
    // Récupérer l'email du responsable recrutement
    async getRecruitmentManagerEmail() {
        try {
            // Utiliser la méthode dédiée pour récupérer le responsable recrutement
            const memberResult = await storage_1.storage.getMemberByCjdRole(schema_1.CJD_ROLES.RESPONSABLE_RECRUTEMENT);
            if (!memberResult.success) {
                return {
                    success: false,
                    error: 'error' in memberResult ? memberResult.error : new Error('Unknown error')
                };
            }
            const recruitmentManager = memberResult.data;
            logger_1.logger.info('[Email Notifications] Responsable recrutement résolu', {
                hasRecruitmentManager: Boolean(recruitmentManager?.email),
            });
            return {
                success: true,
                data: recruitmentManager?.email || null
            };
        }
        catch (error) {
            logger_1.logger.error('[Email Notifications] Erreur lors de la récupération du responsable recrutement', { error });
            return {
                success: false,
                error: new Error(`Erreur récupération responsable recrutement: ${String(error)}`)
            };
        }
    }
    // Notifier le responsable recrutement d'un nouveau membre proposé
    async notifyNewMemberProposal(memberData) {
        try {
            logger_1.logger.info('[Email Notifications] Préparation notification nouvelle proposition membre', {
                fullName: `${memberData.firstName} ${memberData.lastName}`,
            });
            // Récupérer l'email du responsable recrutement
            const recruitmentManagerEmailResult = await this.getRecruitmentManagerEmail();
            if (!recruitmentManagerEmailResult.success) {
                return recruitmentManagerEmailResult;
            }
            // Si aucun responsable recrutement défini, envoyer aux admins
            let recipients;
            if (recruitmentManagerEmailResult.data) {
                recipients = [recruitmentManagerEmailResult.data];
                logger_1.logger.info('[Email Notifications] Envoi dirigé vers le responsable recrutement');
            }
            else {
                const adminEmailsResult = await this.getAdminEmails();
                if (!adminEmailsResult.success) {
                    return adminEmailsResult;
                }
                recipients = adminEmailsResult.data;
                logger_1.logger.warn('[Email Notifications] Aucun responsable recrutement défini, fallback vers administrateurs', {
                    recipients: recipients.length,
                });
            }
            // Créer le template d'email
            const { subject, html } = (0, email_templates_1.createNewMemberProposalEmailTemplate)(memberData, this.context);
            return this.sendToRecipients(recipients, subject, html, 'new_member_proposal');
        }
        catch (error) {
            logger_1.logger.error('[Email Notifications] Erreur notification nouvelle proposition membre', { error });
            return {
                success: false,
                error: new Error(`Erreur notification proposition membre: ${String(error)}`)
            };
        }
    }
    // Tester la configuration email
    async testEmailConfiguration() {
        try {
            logger_1.logger.info('[Email Notifications] Démarrage test de configuration email');
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
            const { createTestEmailTemplate } = await Promise.resolve().then(() => __importStar(require('./email-templates')));
            const { subject, html } = createTestEmailTemplate(this.context);
            const testRecipient = adminEmailsResult.data[0];
            const testEmailResult = await email_service_1.emailService.sendEmail({
                to: [testRecipient],
                subject,
                html
            });
            if (testEmailResult.success) {
                logger_1.logger.info('[Email Notifications] Test email envoyé avec succès', {
                    recipient: testRecipient,
                    messageId: testEmailResult.data.messageId,
                });
            }
            else {
                logger_1.logger.error('[Email Notifications] Échec du test email', {
                    recipient: testRecipient,
                    error: String(testEmailResult.error),
                });
            }
            return testEmailResult;
        }
        catch (error) {
            logger_1.logger.error('[Email Notifications] Erreur lors du test email', { error });
            return {
                success: false,
                error: new Error(`Erreur test email: ${String(error)}`)
            };
        }
    }
    // Notifier les admins d'un nouveau matériel proposé au prêt
    async notifyNewLoanItem(loanItem) {
        try {
            logger_1.logger.info('[Email Notifications] Préparation notification nouveau matériel', {
                title: loanItem.title,
            });
            // Récupérer les emails des administrateurs
            const adminEmailsResult = await this.getAdminEmails();
            if (!adminEmailsResult.success) {
                return adminEmailsResult;
            }
            // Créer le template d'email
            const { subject, html } = (0, email_templates_1.createNewLoanItemEmailTemplate)(loanItem, this.context);
            return this.sendToRecipients(adminEmailsResult.data, subject, html, 'new_loan_item');
        }
        catch (error) {
            logger_1.logger.error('[Email Notifications] Erreur notification nouveau matériel', { error, title: loanItem.title });
            return {
                success: false,
                error: new Error(`Erreur notification matériel: ${String(error)}`)
            };
        }
    }
    // Mise à jour du contexte (utile si l'URL de base change)
    updateContext(newContext) {
        this.context = { ...this.context, ...newContext };
        logger_1.logger.info('[Email Notifications] Contexte des notifications mis à jour');
    }
}
// Instance singleton
exports.emailNotificationService = new EmailNotificationService();
