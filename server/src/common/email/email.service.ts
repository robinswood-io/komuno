import { Injectable, Logger, Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { DATABASE } from '../database/database.providers';
import type { DrizzleDb } from '../database/types';
import { emailConfig } from '../../../../shared/schema';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress = 'noreply@cjd80.fr';
  private initialized = false;

  constructor(
    private readonly config: ConfigService,
    @Inject(DATABASE) private readonly db: DrizzleDb,
  ) {}

  /**
   * Initialisation différée (lazy) — tente d'abord la config DB, fallback env vars.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Priorité 1 : config SMTP en base de données
    try {
      const [dbConfig] = await this.db.select().from(emailConfig).limit(1);
      if (dbConfig?.username && dbConfig?.password) {
        const port = dbConfig.port ?? 465;
        const secure = dbConfig.secure ?? (port === 465);
        this.transporter = nodemailer.createTransport({
          host: dbConfig.host ?? 'ssl0.ovh.net',
          port,
          secure,
          auth: { user: dbConfig.username, pass: dbConfig.password },
        });
        const name = dbConfig.fromName ?? 'Komuno';
        const addr = dbConfig.fromEmail ?? dbConfig.username;
        this.fromAddress = `"${name}" <${addr}>`;
        this.logger.log(`Email service initialisé depuis la DB (${dbConfig.host}:${port})`);
        return;
      }
    } catch {
      this.logger.warn('Config email DB indisponible — fallback variables d\'environnement');
    }

    // Priorité 2 : variables d'environnement
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get('SMTP_PORT') ?? 587),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
      this.fromAddress = this.config.get<string>('SMTP_FROM') ?? 'noreply@cjd80.fr';
      this.logger.log(`Email service initialisé depuis les variables d'environnement`);
    } else {
      this.logger.warn('SMTP_HOST non configuré — emails désactivés (mode log)');
    }
  }

  async sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
    await this.ensureInitialized();
    if (!this.transporter) {
      this.logger.log(`[EMAIL SIMULÉ] To: ${options.to} | Sujet: ${options.subject}`);
      return;
    }
    await this.transporter.sendMail({ from: this.fromAddress, ...options });
    this.logger.log(`Email envoyé à ${options.to}`);
  }
}
