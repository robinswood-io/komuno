"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const branding_core_1 = require("../lib/config/branding-core");
const logger_1 = require("./lib/logger");
class EmailService {
    constructor() {
        this.transporter = null;
        this.config = null;
        this.storage = null;
        // Initialisation différée pour permettre l'injection du storage
    }
    setStorage(storage) {
        this.storage = storage;
        void this.initializeTransporter().catch((error) => {
            logger_1.logger.error('[Email] Erreur initialisation asynchrone du service', { error });
        });
    }
    async initializeTransporter() {
        try {
            // Charger la configuration depuis la DB si disponible
            let dbConfig = null;
            if (this.storage) {
                const result = await this.storage.getEmailConfig();
                if (result.success && result.data) {
                    dbConfig = result.data;
                }
                else if (!result.success) {
                    logger_1.logger.warn('[Email] Impossible de charger la configuration SMTP depuis la base', {
                        error: String(result.error),
                    });
                }
            }
            // Configuration SMTP avec priorité: DB > Env vars
            const port = this.parsePort(dbConfig?.port, process.env.SMTP_PORT);
            // Déterminer secure: DB > Env > Défaut basé sur le port (465=true, autres=false)
            let secure;
            if (dbConfig?.secure !== undefined) {
                secure = dbConfig.secure;
            }
            else if (process.env.SMTP_SECURE !== undefined) {
                secure = process.env.SMTP_SECURE === 'true';
            }
            else {
                secure = port === 465; // Port 465 utilise SSL/TLS par défaut
            }
            this.config = {
                host: dbConfig?.host || process.env.SMTP_HOST || 'ssl0.ovh.net',
                port,
                secure,
                auth: {
                    user: dbConfig?.username || process.env.SMTP_USER || '',
                    pass: dbConfig?.password || process.env.SMTP_PASSWORD || ''
                },
                fromName: dbConfig?.fromName || process.env.SMTP_FROM_NAME || (0, branding_core_1.getShortAppName)(),
                fromEmail: dbConfig?.fromEmail || process.env.SMTP_FROM_EMAIL || 'noreply@cjd-amiens.fr'
            };
            if (!this.config.auth.user || !this.config.auth.pass) {
                this.transporter = null;
                logger_1.logger.warn('[Email] Configuration SMTP incomplète, envoi d\'emails désactivé');
                return;
            }
            this.transporter = nodemailer_1.default.createTransport({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
                auth: this.config.auth,
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
                connectionTimeout: 10_000,
                greetingTimeout: 10_000,
                socketTimeout: 20_000,
            });
            const source = dbConfig ? 'base de données' : 'variables d\'environnement';
            logger_1.logger.info('[Email] Service email initialisé', {
                source,
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure,
            });
            // Vérifier la connexion
            await this.verifyConnection();
        }
        catch (error) {
            this.transporter = null;
            logger_1.logger.error('[Email] Erreur lors de l\'initialisation', { error });
        }
    }
    async verifyConnection() {
        if (!this.transporter)
            return false;
        try {
            await this.transporter.verify();
            logger_1.logger.info('[Email] Connexion SMTP vérifiée');
            return true;
        }
        catch (error) {
            logger_1.logger.error('[Email] Erreur de connexion SMTP', { error });
            return false;
        }
    }
    async sendEmail(emailData) {
        if (!this.transporter || !this.config) {
            return {
                success: false,
                error: new Error('Service email non configuré')
            };
        }
        const recipients = this.normalizeRecipients(emailData.to);
        if (recipients.length === 0) {
            return {
                success: false,
                error: new Error('Aucun destinataire valide fourni')
            };
        }
        try {
            const fromName = this.config.fromName || (0, branding_core_1.getShortAppName)();
            const fromEmail = this.config.fromEmail || this.config.auth.user;
            const mailOptions = {
                from: `"${fromName}" <${fromEmail}>`,
                to: recipients.join(', '),
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text || this.stripHtml(emailData.html)
            };
            const info = await this.transporter.sendMail(mailOptions);
            logger_1.logger.info('[Email] Email envoyé', {
                messageId: info.messageId,
                recipients: recipients.length,
            });
            return {
                success: true,
                data: {
                    messageId: info.messageId,
                    accepted: info.accepted.map(String),
                    rejected: info.rejected.map(String),
                    response: info.response,
                }
            };
        }
        catch (error) {
            logger_1.logger.error('[Email] Erreur lors de l\'envoi SMTP', { error });
            return {
                success: false,
                error: new Error(`Erreur envoi email: ${String(error)}`)
            };
        }
    }
    // Méthode utilitaire pour extraire le texte du HTML
    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, '\'')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
    }
    // Test de connectivité
    async testConnection() {
        if (!this.transporter) {
            return {
                success: false,
                error: new Error('Transporter non initialisé')
            };
        }
        try {
            await this.transporter.verify();
            return { success: true, data: true };
        }
        catch (error) {
            return {
                success: false,
                error: new Error(`Test connexion échoué: ${String(error)}`)
            };
        }
    }
    // Recharger la configuration depuis la base de données
    async reloadConfig() {
        await this.initializeTransporter();
    }
    // Réinitialiser la configuration (pour compatibilité)
    async reinitialize() {
        await this.reloadConfig();
    }
    parsePort(dbPort, envPort) {
        if (typeof dbPort === 'number' && Number.isFinite(dbPort) && dbPort > 0) {
            return dbPort;
        }
        const parsedEnvPort = Number.parseInt(envPort ?? '', 10);
        if (Number.isFinite(parsedEnvPort) && parsedEnvPort > 0) {
            return parsedEnvPort;
        }
        return 465;
    }
    normalizeRecipients(recipients) {
        return Array.from(new Set(recipients
            .map((recipient) => recipient.trim().toLowerCase())
            .filter((recipient) => recipient.length > 0)));
    }
}
// Instance singleton
exports.emailService = new EmailService();
