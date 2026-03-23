import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Result, EmailConfig } from '@shared/schema';
import { DatabaseError } from '@shared/schema';
import { getShortAppName } from '../lib/config/branding-core';
import type { IStorage } from './storage';

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

class EmailService {
  private transporter: Transporter | null = null;
  private config: TransporterConfig | null = null;
  private storage: IStorage | null = null;

  constructor() {
    // Initialisation différée pour permettre l'injection du storage
  }

  setStorage(storage: IStorage) {
    this.storage = storage;
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Charger la configuration depuis la DB si disponible
      let dbConfig: EmailConfig | null = null;
      if (this.storage) {
        const result = await this.storage.getEmailConfig();
        if (result.success && result.data) {
          dbConfig = result.data;
        }
      }

      // Configuration SMTP avec priorité: DB > Env vars
      const port = dbConfig?.port || parseInt(process.env.SMTP_PORT || '465');
      
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
        console.warn('[Email] Configuration SMTP incomplète - emails désactivés');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth
      });
      
      const source = dbConfig ? 'base de données' : 'variables d\'environnement';
      console.log(`[Email] Service email initialisé depuis ${source} (${this.config.host}:${this.config.port})`);

      // Vérifier la connexion
      this.verifyConnection();
    } catch (error) {
      console.error('[Email] Erreur lors de l\'initialisation:', error);
    }
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter) return;

    try {
      await this.transporter.verify();
      console.log('[Email] ✅ Connexion SMTP OVH vérifiée');
    } catch (error) {
      console.error('[Email] ❌ Erreur de connexion SMTP:', error);
    }
  }

  async sendEmail(emailData: EmailData): Promise<Result<any>> {
    if (!this.transporter || !this.config) {
      return {
        success: false,
        error: new DatabaseError('Service email non configuré')
      };
    }

    try {
      const fromName = this.config.fromName || getShortAppName();
      const fromEmail = this.config.fromEmail || this.config.auth.user;
      
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: emailData.to.join(', '),
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || this.stripHtml(emailData.html)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('[Email] ✅ Email envoyé:', info.messageId);

      return {
        success: true,
        data: info
      };
    } catch (error) {
      console.error('[Email] ❌ Erreur envoi email:', error);
      return {
        success: false,
        error: new DatabaseError(`Erreur envoi email: ${error}`)
      };
    }
  }

  // Méthode utilitaire pour extraire le texte du HTML
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/g, '')
      .trim();
  }

  // Test de connectivité
  async testConnection(): Promise<Result<boolean>> {
    if (!this.transporter) {
      return {
        success: false,
        error: new DatabaseError('Transporter non initialisé')
      };
    }

    try {
      await this.transporter.verify();
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: new DatabaseError(`Test connexion échoué: ${error}`)
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
}

// Instance singleton
export const emailService = new EmailService();