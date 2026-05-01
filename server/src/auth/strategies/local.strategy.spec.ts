import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import type { StorageService } from '../../common/storage/storage.service';
import type { PasswordService } from '../password.service';
import type { Admin } from '../../../../shared/schema';

type UserLookupResult = {
  success: boolean;
  data: Admin | null;
};

const buildAdmin = (): Admin => ({
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  password: 'hashed-password',
  role: 'super_admin',
  status: 'active',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  addedBy: null,
});

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let getUserMock: ReturnType<typeof vi.fn<(email: string) => Promise<UserLookupResult>>>;
  let verifyPasswordMock: ReturnType<typeof vi.fn<(plainPassword: string, hashedPassword: string) => Promise<boolean>>>;

  beforeEach(() => {
    getUserMock = vi.fn<(email: string) => Promise<UserLookupResult>>();
    verifyPasswordMock = vi.fn<(plainPassword: string, hashedPassword: string) => Promise<boolean>>();

    const storageService = {
      storage: {
        getUser: getUserMock,
      },
    } as unknown as StorageService;

    const passwordService = {
      verifyPassword: verifyPasswordMock,
    } as unknown as PasswordService;

    strategy = new LocalStrategy(storageService, passwordService);
  });

  it('validate retourne l\'admin quand email et mot de passe sont valides', async () => {
    const admin = buildAdmin();

    getUserMock.mockResolvedValue({
      success: true,
      data: admin,
    });
    verifyPasswordMock.mockResolvedValue(true);

    const result = await strategy.validate('admin@example.com', 'plain-password');

    expect(result).toEqual(admin);
    expect(getUserMock).toHaveBeenCalledWith('admin@example.com');
    expect(verifyPasswordMock).toHaveBeenCalledWith('plain-password', 'hashed-password');
  });

  it('validate lève UnauthorizedException quand utilisateur introuvable', async () => {
    getUserMock.mockResolvedValue({
      success: false,
      data: null,
    });

    await expect(strategy.validate('missing@example.com', 'plain-password')).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate('missing@example.com', 'plain-password')).rejects.toThrow('Identifiants invalides');
  });

  it('validate lève UnauthorizedException quand mot de passe invalide', async () => {
    const admin = buildAdmin();

    getUserMock.mockResolvedValue({
      success: true,
      data: admin,
    });
    verifyPasswordMock.mockResolvedValue(false);

    await expect(strategy.validate('admin@example.com', 'wrong-password')).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate('admin@example.com', 'wrong-password')).rejects.toThrow('Identifiants invalides');
  });
});
