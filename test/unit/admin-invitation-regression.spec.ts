import { existsSync, readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

describe('Administrateurs — invitation et définition du mot de passe', () => {
  it('ne crée plus de compte avec un mot de passe temporaire fixe ou en clair', () => {
    const source = readFileSync('server/src/admin/admin.service.ts', 'utf8');
    const creationBlock = source.match(/async createAdministrator[\s\S]*?async sendAdministratorInvitation/)?.[0] ?? '';

    expect(creationBlock).not.toContain('temporary-password-must-be-changed');
    expect(creationBlock).toContain('password: undefined');
    expect(creationBlock).toContain('approveAdmin(email, role)');
    expect(creationBlock).toContain('requestPasswordReset(email)');
    expect(creationBlock).toContain('invitationSent');
  });

  it('stocke seulement le hash SHA-256 du jeton et utilise le branding de l’instance', () => {
    const source = readFileSync('server/src/auth/password-reset.service.ts', 'utf8');

    expect(source).toContain("createHash('sha256')");
    expect(source).toContain('token: tokenHash');
    expect(source).toContain('eq(passwordResetTokens.token, tokenHash)');
    expect(source).toContain('resolveBrandingIdentity()');
    expect(source).toContain('branding.shortName');
    expect(source).not.toContain("subject: 'Réinitialisation de votre mot de passe - CJD80'");
  });

  it('supprime le jeton si la livraison email échoue et expose l’état réel à l’admin', () => {
    const resetSource = readFileSync('server/src/auth/password-reset.service.ts', 'utf8');
    const adminUiSource = readFileSync(
      'app/(protected)/admin/settings/_components/administrators-tab.tsx',
      'utf8',
    );

    expect(resetSource).toContain('if (!sendResult.success)');
    expect(resetSource).toContain('db.delete(passwordResetTokens)');
    expect(resetSource).toContain('emailSent: false');
    expect(adminUiSource).toContain('/invitation`');
    expect(adminUiSource).toContain('response.data.invitationSent');
  });

  it('publie les deux pages publiques nécessaires au parcours', () => {
    const forgotPath = 'app/(auth)/forgot-password/page.tsx';
    const resetPath = 'app/(auth)/reset-password/page.tsx';

    expect(existsSync(forgotPath)).toBe(true);
    expect(existsSync(resetPath)).toBe(true);
    expect(readFileSync(forgotPath, 'utf8')).toContain('/api/auth/forgot-password');
    expect(readFileSync(resetPath, 'utf8')).toContain('/api/auth/reset-password/validate');
    expect(readFileSync(resetPath, 'utf8')).toContain("'/api/auth/reset-password'");
  });
});
