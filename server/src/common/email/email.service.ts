import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT') ?? 587,
        secure: config.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: config.get<string>('SMTP_USER'),
          pass: config.get<string>('SMTP_PASS'),
        },
      });
    } else {
      this.logger.warn('SMTP_HOST non configuré — emails désactivés (mode log)');
    }
  }

  async sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[EMAIL SIMULÉ] To: ${options.to} | Sujet: ${options.subject}`);
      return;
    }
    const from = this.config.get<string>('SMTP_FROM') ?? 'noreply@cjd80.fr';
    await this.transporter.sendMail({ from, ...options });
    this.logger.log(`Email envoyé à ${options.to}`);
  }
}
