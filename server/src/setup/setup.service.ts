import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import { emailService } from '../../email-service';
import { logger } from '../../lib/logger';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class SetupService {
  constructor(private readonly storageService: StorageService) {}

  async getSetupStatus() {
    // Vérifier si le branding est configuré
    const brandingResult = await this.storageService.instance.getBrandingConfig();
    let hasBranding = false;
    if (brandingResult.success && brandingResult.data) {
      try {
        const config = JSON.parse(brandingResult.data.config);
        const { brandingCore } = await import('../../../lib/config/branding-core');
        hasBranding = config.organization?.name !== brandingCore.organization.name ||
                     config.organization?.email !== brandingCore.organization.email ||
                     config.colors?.primary !== brandingCore.colors.primary;
      } catch {
        hasBranding = false;
      }
    }
    
    // Vérifier si l'email est configuré
    const emailResult = await this.storageService.instance.getEmailConfig();
    let hasEmailConfig = false;
    if (emailResult.success && emailResult.data) {
      const defaultHost = process.env.SMTP_HOST || 'ssl0.ovh.net';
      const defaultFromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@cjd-amiens.fr';
      hasEmailConfig = emailResult.data.host !== defaultHost ||
                      emailResult.data.fromEmail !== defaultFromEmail;
    }
    
    // Vérifier s'il y a des admins
    const adminsResult = await this.storageService.instance.getAllAdmins();
    const hasAdmins = adminsResult.success && adminsResult.data && adminsResult.data.length > 0;
    
    const isFirstInstall = !hasAdmins; // Only admin is required, email and branding are optional
    
    return {
      isFirstInstall,
      hasBranding,
      hasEmailConfig,
      hasAdmins,
      completedSteps: {
        branding: hasBranding,
        email: hasEmailConfig,
        admins: hasAdmins
      }
    };
  }

  async createFirstAdmin(email: string, firstName: string, lastName: string) {
    // Vérifier s'il y a déjà des admins
    const adminsResult = await this.storageService.instance.getAllAdmins();
    if (adminsResult.success && adminsResult.data && adminsResult.data.length > 0) {
      throw new BadRequestException("Des administrateurs existent déjà. Utilisez la page d'administration pour créer de nouveaux admins.");
    }

    if (!email || !firstName || !lastName) {
      throw new BadRequestException("Tous les champs sont requis (email, firstName, lastName)");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException("Format d'email invalide");
    }

    const result = await this.storageService.instance.createUser({
      email,
      password: undefined,
      firstName,
      lastName,
      role: 'super_admin',
      addedBy: 'system'
    });

    if (!result.success) {
      throw new BadRequestException(('error' in result ? result.error : new Error('Unknown error')).message);
    }

    return {
      email: result.data.email,
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      role: result.data.role
    };
  }

  async testEmail(email: string) {
    await this.assertFirstInstall('Le test email public n’est disponible que lors de la première installation');

    if (!email) {
      throw new BadRequestException("Email de test requis");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException("Format d'email invalide");
    }

    const emailConfigResult = await this.storageService.instance.getEmailConfig();
    if (emailConfigResult.success && emailConfigResult.data) {
      await emailService.reloadConfig();
    }

    const { createTestEmailTemplate } = await import('../../email-templates');
    const { subject, html } = createTestEmailTemplate();

    const testResult = await emailService.sendEmail({
      to: [email],
      subject: `[Test] ${subject}`,
      html
    });

    if (!testResult.success) {
      const error = 'error' in testResult ? testResult.error : new Error('Unknown error');
      throw new InternalServerErrorException(error.message || "Erreur lors de l'envoi de l'email de test");
    }

    return { message: `Email de test envoyé avec succès à ${email}` };
  }

  async generateConfig() {
    await this.assertFirstInstall('La génération de configuration publique n’est disponible que lors de la première installation');

    const brandingResult = await this.storageService.instance.getBrandingConfig();
    let brandingConfig: Record<string, unknown> = {};
    
    if (brandingResult.success && brandingResult.data) {
      try {
        brandingConfig = JSON.parse(brandingResult.data.config);
      } catch {
        const { brandingCore } = await import('../../../lib/config/branding-core');
        brandingConfig = brandingCore;
      }
    } else {
      const { brandingCore } = await import('../../../lib/config/branding-core');
      brandingConfig = brandingCore;
    }

    try {
      const projectRoot = join(__dirname, '../../..');
      const scriptPath = join(projectRoot, 'scripts/generate-static-config.ts');
      const { stdout, stderr } = await execAsync(`npx tsx "${scriptPath}"`, {
        cwd: projectRoot,
        env: { ...process.env }
      });
      
      if (stderr && !stderr.includes('warning') && !stderr.includes('Generated')) {
        logger.warn('Warnings lors de la génération', { stderr });
      }
      
      return {
        message: "Fichiers statiques générés avec succès",
        output: stdout || stderr
      };
    } catch (error) {
      logger.error('Erreur lors de la génération des fichiers statiques', { error });
      throw new InternalServerErrorException(error instanceof Error ? error.message : "Erreur lors de la génération des fichiers statiques. Vous pouvez les générer manuellement avec 'npm run generate:config'.");
    }
  }

  private async assertFirstInstall(message: string) {
    const status = await this.getSetupStatus();
    if (!status.isFirstInstall) {
      throw new BadRequestException(message);
    }
  }

  async saveBrandingConfig(config: string) {
    try {
      // Validate JSON
      JSON.parse(config);
    } catch {
      throw new BadRequestException("Configuration branding invalide (JSON malformé)");
    }

    const result = await this.storageService.instance.updateBrandingConfig(config, "setup");
    if (!result.success) {
      throw new BadRequestException(("error" in result ? result.error : new Error("Unknown error")).message);
    }

    return result.data;
  }
}


