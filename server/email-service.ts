import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Result, EmailConfig } from '@shared/schema';
import { getShortAppName } from '../lib/config/branding-core';
import type { IStorage } from './storage';
import { logger } from './lib/logger';

interface TransporterConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  fromName?: string;
  fromEmail?: string;
}

export interface EmailData {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

interface EmailSendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: TransporterConfig | null = null;
  private storage: IStorage | null = null;

  constructor() {
    // Initialisation différée pour permettre l'injection du storage
  }

  setStorage(storage: IStorage) {
    this.storage = storage;
    void this.initializeTransporter().catch((error: unknown) => {
      logger.error('[Email] Erreur initialisation asynchrone du service', { error });
    });
  }

  private async initializeTransporter() {
    try {
      // Charger la configuration depuis la DB si disponible
      let dbConfig: EmailConfig | null = null;
      if (this.storage) {
        const result = await this.storage.getEmailConfig();
        if (result.success && result.data) {
          dbConfig = result.data;
        } else if (!result.success) {
          logger.warn('[Email] Impossible de charger la configuration SMTP depuis la base', {
            error: String(result.error),
          });
        }
      }

      // Configuration SMTP avec priorité: DB > Env vars
      const port = this.parsePort(dbConfig?.port, process.env.SMTP_PORT);
      
      // Déterminer secure: DB > Env > Défaut basé sur le port (465=true, autres=false)
      let secure: boolean;
      if (dbConfig?.secure !== undefined) {
        secure = dbConfig.secure;
      } else if (process.env.SMTP_SECURE !== undefined) {
        secure = process.env.SMTP_SECURE === 'true';
      } else {
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
        fromName: dbConfig?.fromName || process.env.SMTP_FROM_NAME || getShortAppName(),
        fromEmail: dbConfig?.fromEmail || process.env.SMTP_FROM_EMAIL || 'noreply@cjd-amiens.fr'
      };

      if (!this.config.auth.user || !this.config.auth.pass) {
        this.transporter = null;
        logger.warn('[Email] Configuration SMTP incomplète, envoi d\'emails désactivé');
        return;
      }

      this.transporter = nodemailer.createTransport({
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
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      
      const source = dbConfig ? 'base de données' : 'variables d\'environnement';
      logger.info('[Email] Service email initialisé', {
        source,
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
      });

      // Vérifier la connexion
      await this.verifyConnection();
    } catch (error) {
      this.transporter = null;
      logger.error('[Email] Erreur lors de l\'initialisation', { error });
    }
  }

  private async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      logger.info('[Email] Connexion SMTP vérifiée');
      return true;
    } catch (error) {
      logger.error('[Email] Erreur de connexion SMTP', { error });
      return false;
    }
  }

  async sendEmail(emailData: EmailData): Promise<Result<EmailSendResult, Error>> {
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
      const fromName = this.sanitizeHeaderValue(this.config.fromName || getShortAppName()).replace(/"/g, "'");
      const fromEmail = this.normalizeEmailAddress(this.config.fromEmail || this.config.auth.user) || this.config.auth.user;
      
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: recipients.join(', '),
        subject: this.sanitizeHeaderValue(emailData.subject),
        html: emailData.html,
        text: emailData.text || this.stripHtml(emailData.html),
        disableFileAccess: true,
        disableUrlAccess: true,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('[Email] Email envoyé', {
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
    } catch (error) {
      logger.error('[Email] Erreur lors de l\'envoi SMTP', { error });
      return {
        success: false,
        error: new Error(`Erreur envoi email: ${String(error)}`)
      };
    }
  }

  // Méthode utilitaire pour extraire le texte du HTML
  private stripHtml(html: string): string {
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
  async testConnection(): Promise<Result<boolean>> {
    if (!this.transporter) {
      return {
        success: false,
        error: new Error('Transporter non initialisé')
      };
    }

    try {
      await this.transporter.verify();
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: new Error(`Test connexion échoué: ${String(error)}`)
      };
    }
  }

  // Recharger la configuration depuis la base de données
  async reloadConfig(): Promise<void> {
    await this.initializeTransporter();
  }

  // Réinitialiser la configuration (pour compatibilité)
  async reinitialize(): Promise<void> {
    await this.reloadConfig();
  }

  private parsePort(dbPort: number | null | undefined, envPort: string | undefined): number {
    if (typeof dbPort === 'number' && Number.isFinite(dbPort) && dbPort > 0) {
      return dbPort;
    }

    const parsedEnvPort = Number.parseInt(envPort ?? '', 10);
    if (Number.isFinite(parsedEnvPort) && parsedEnvPort > 0) {
      return parsedEnvPort;
    }

    return 465;
  }

  private normalizeRecipients(recipients: string[]): string[] {
    return Array.from(
      new Set(
        recipients
          .map((recipient) => this.normalizeEmailAddress(recipient))
          .filter((recipient): recipient is string => Boolean(recipient))
      )
    );
  }

  private sanitizeHeaderValue(value: string): string {
    return value.replace(/[\r\n]+/g, ' ').trim();
  }

  private normalizeEmailAddress(value: string | null | undefined): string | null {
    if (!value) return null;
    const normalized = this.sanitizeHeaderValue(value).trim().toLowerCase();
    if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(normalized)) {
      return null;
    }
    return normalized;
  }
}

// Instance singleton
export const emailService = new EmailService();
