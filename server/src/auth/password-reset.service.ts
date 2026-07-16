import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { StorageService } from '../common/storage/storage.service';
import { PasswordService } from './password.service';
import { emailService } from '../../email-service';
import { logger } from '../../lib/logger';
import { db } from '../../db';
import { passwordResetTokens } from '../../../shared/schema';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';

export interface PasswordResetRequestResult {
  accountExists: boolean;
  emailSent: boolean;
}

interface BrandingIdentity {
  shortName: string;
  organizationName: string;
}

@Injectable()
export class PasswordResetService {
  constructor(
    private storageService: StorageService,
    private passwordService: PasswordService,
  ) {}

  /**
   * Demande de réinitialisation de mot de passe.
   * Le résultat détaillé est réservé aux appels internes authentifiés ; la route
   * publique conserve une réponse générique pour éviter l'énumération de comptes.
   */
  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    logger.info('[PasswordReset] Demande de reset', { email });

    // Vérifier la disponibilité avant la recherche utilisateur afin que l'absence
    // de SMTP ne permette pas de déduire si un compte existe.
    if (!emailService.isConfigured()) {
      logger.warn('[PasswordReset] Service email non configuré');
      throw new ServiceUnavailableException(
        "Le service d'envoi d'emails n'est pas configuré. Contactez un administrateur.",
      );
    }

    const userResult = await this.storageService.storage.getUser(email);
    if (!userResult.success) {
      logger.error('[PasswordReset] Erreur de lecture utilisateur', { email });
      throw new ServiceUnavailableException('Le service de réinitialisation est temporairement indisponible.');
    }

    if (!userResult.data) {
      logger.info('[PasswordReset] Demande traitée sans compte correspondant');
      return { accountExists: false, emailSent: false };
    }

    const rawToken = this.passwordService.generateSecureToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, email));

    await db.insert(passwordResetTokens).values({
      email,
      token: tokenHash,
      expiresAt,
    });

    const resetUrl = this.buildResetUrl(rawToken);
    const branding = await this.resolveBrandingIdentity();
    const htmlContent = this.generateResetEmailHtml(
      userResult.data.firstName,
      resetUrl,
      branding,
    );

    const sendResult = await emailService.sendEmail({
      to: [email],
      subject: `Réinitialisation de votre mot de passe - ${branding.shortName}`,
      html: htmlContent,
    });

    if (!sendResult.success) {
      // Ne pas laisser de jeton utilisable si le message n'a pas été envoyé.
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, tokenHash));
      logger.error('[PasswordReset] Échec de livraison de l’email', {
        email,
        error: sendResult.error.message,
      });
      return { accountExists: true, emailSent: false };
    }

    logger.info('[PasswordReset] Email de reset envoyé', {
      email,
      messageId: sendResult.data.messageId,
    });
    return { accountExists: true, emailSent: true };
  }

  /**
   * Réinitialisation du mot de passe avec le token.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    logger.info('[PasswordReset] Tentative de reset avec token');

    const passwordError = this.passwordService.validatePasswordStrength(newPassword);
    if (passwordError) {
      throw new BadRequestException(passwordError);
    }

    const tokenHash = this.hashToken(token);
    const [tokenRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, tokenHash),
          gt(passwordResetTokens.expiresAt, sql`NOW()`),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    if (!tokenRecord) {
      logger.warn('[PasswordReset] Token invalide ou expiré');
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }

    const hashedPassword = await this.passwordService.hashPassword(newPassword);
    const updateResult = await this.storageService.storage.updateAdminPassword(
      tokenRecord.email,
      hashedPassword,
    );

    if (!updateResult.success) {
      logger.error('[PasswordReset] Échec de mise à jour du mot de passe', {
        email: tokenRecord.email,
      });
      throw new ServiceUnavailableException('Impossible de mettre à jour le mot de passe. Réessayez plus tard.');
    }

    await db.execute(sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${tokenRecord.id}`);

    logger.info('[PasswordReset] Mot de passe réinitialisé avec succès', { email: tokenRecord.email });
  }

  /**
   * Vérifie si un token est valide sans révéler l'identité associée.
   */
  async validateToken(token: string): Promise<{ valid: boolean }> {
    const tokenHash = this.hashToken(token);
    const [tokenRecord] = await db
      .select({ id: passwordResetTokens.id })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, tokenHash),
          gt(passwordResetTokens.expiresAt, sql`NOW()`),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    return { valid: Boolean(tokenRecord) };
  }

  /**
   * Nettoie les tokens expirés.
   */
  async cleanExpiredTokens(): Promise<number> {
    const result = await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, sql`NOW()`))
      .returning();

    logger.info('[PasswordReset] Tokens expirés nettoyés', { count: result.length });
    return result.length;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private buildResetUrl(token: string): string {
    const configuredBaseUrl = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:5000';

    try {
      const resetUrl = new URL('/reset-password', configuredBaseUrl);
      resetUrl.searchParams.set('token', token);
      return resetUrl.toString();
    } catch {
      logger.error('[PasswordReset] BASE_URL invalide');
      throw new ServiceUnavailableException('La réinitialisation de mot de passe est mal configurée.');
    }
  }

  private async resolveBrandingIdentity(): Promise<BrandingIdentity> {
    const fallback = this.fallbackBrandingIdentity();

    try {
      const brandingResult = await this.storageService.storage.getBrandingConfig();
      if (!brandingResult.success || !brandingResult.data) {
        return fallback;
      }

      const parsed = JSON.parse(brandingResult.data.config) as {
        app?: { shortName?: unknown; name?: unknown };
        organization?: { name?: unknown; fullName?: unknown };
      };

      const shortName = this.nonEmptyString(parsed.app?.shortName)
        ?? this.nonEmptyString(parsed.app?.name)
        ?? fallback.shortName;
      const organizationName = this.nonEmptyString(parsed.organization?.fullName)
        ?? this.nonEmptyString(parsed.organization?.name)
        ?? shortName;

      return { shortName, organizationName };
    } catch (error) {
      logger.warn('[PasswordReset] Branding indisponible, utilisation du fallback d’instance', {
        error: error instanceof Error ? error.message : String(error),
      });
      return fallback;
    }
  }

  private fallbackBrandingIdentity(): BrandingIdentity {
    const configuredName = process.env.APP_DISPLAY_NAME || process.env.APP_NAME || 'Komuno';
    const normalizedName = configuredName.trim().toLowerCase();
    const knownNames: Record<string, BrandingIdentity> = {
      'cjd-hdf': { shortName: 'CJD HDF', organizationName: 'CJD Hauts de France' },
      cjd80: { shortName: 'CJD80', organizationName: 'CJD Amiens' },
      'cjd-amiens': { shortName: 'CJD Amiens', organizationName: 'CJD Amiens' },
      repicardie: { shortName: 'REP Picardie', organizationName: 'Réseau Entreprendre Picardie' },
      'rep-picardie': { shortName: 'REP Picardie', organizationName: 'Réseau Entreprendre Picardie' },
      'komuno-demo': { shortName: 'Komuno Démo', organizationName: 'Komuno Démo' },
      komuno: { shortName: 'Komuno', organizationName: 'Komuno' },
    };

    return knownNames[normalizedName] ?? {
      shortName: configuredName.trim() || 'Komuno',
      organizationName: configuredName.trim() || 'Komuno',
    };
  }

  private nonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Génère le HTML de l'email de reset.
   */
  private generateResetEmailHtml(
    firstName: string,
    resetUrl: string,
    branding: BrandingIdentity,
  ): string {
    const safeFirstName = this.escapeHtml(firstName);
    const safeResetUrl = this.escapeHtml(resetUrl);
    const safeShortName = this.escapeHtml(branding.shortName);
    const safeOrganizationName = this.escapeHtml(branding.organizationName);

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de mot de passe</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #00a844; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">${safeShortName}</h1>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #008835; margin-top: 0;">Bonjour ${safeFirstName},</h2>

          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeResetUrl}" style="background: #00a844; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Réinitialiser mon mot de passe
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Ce lien est valable pendant <strong>1 heure</strong> et ne peut être utilisé qu’une seule fois.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            ${safeOrganizationName}
          </p>
        </div>
      </body>
      </html>
    `;
  }
}
