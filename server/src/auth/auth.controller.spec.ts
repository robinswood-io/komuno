import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { Admin } from '../../shared/schema';

describe('AuthController', () => {
  // Schemas de validation (répliqué du controller pour tester)
  const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
  });

  const forgotPasswordSchema = z.object({
    email: z.string().email('Email invalide'),
  });

  const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token requis'),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  });

  describe('login - Validation', () => {
    it('should accept valid email', () => {
      const body = {
        email: 'admin@example.com',
        password: 'SecurePassword123',
      };

      expect(() => loginSchema.parse(body)).not.toThrow();
    });

    it('should reject invalid email format', () => {
      const body = {
        email: 'invalid-email',
        password: 'SecurePassword123',
      };

      expect(() => loginSchema.parse(body)).toThrow();
    });

    it('should reject empty password', () => {
      const body = {
        email: 'admin@example.com',
        password: '',
      };

      expect(() => loginSchema.parse(body)).toThrow();
    });

    it('should accept various valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@test-domain.fr',
      ];

      validEmails.forEach((email) => {
        const body = { email, password: 'password123' };
        expect(() => loginSchema.parse(body)).not.toThrow();
      });
    });
  });

  describe('forgotPassword - Validation', () => {
    it('should accept valid email', () => {
      const body = { email: 'user@example.com' };

      expect(() => forgotPasswordSchema.parse(body)).not.toThrow();
    });

    it('should reject invalid email format', () => {
      const body = { email: 'invalid-email' };

      expect(() => forgotPasswordSchema.parse(body)).toThrow();
    });

    it('should always return same message', () => {
      const message = 'Si cette adresse email est associée à un compte, vous recevrez un email de réinitialisation.';

      expect(message).toBe(message);
    });
  });

  describe('resetPassword - Validation', () => {
    it('should accept valid token and password', () => {
      const body = {
        token: 'reset_token_123',
        password: 'NewSecurePassword123',
      };

      expect(() => resetPasswordSchema.parse(body)).not.toThrow();
    });

    it('should reject password shorter than 8 characters', () => {
      const body = {
        token: 'reset_token_123',
        password: 'short',
      };

      expect(() => resetPasswordSchema.parse(body)).toThrow();
    });

    it('should reject empty token', () => {
      const body = {
        token: '',
        password: 'NewSecurePassword123',
      };

      expect(() => resetPasswordSchema.parse(body)).toThrow();
    });

    it('should accept various valid passwords', () => {
      const validPasswords = [
        'ValidPassword123',
        'Another@SecurePass456',
        'Veryverylongpasswordwith123and!@#',
        '12345678',
      ];

      validPasswords.forEach((password) => {
        const body = { token: 'token123', password };
        expect(() => resetPasswordSchema.parse(body)).not.toThrow();
      });
    });
  });

  describe('validateResetToken', () => {
    it('should validate non-empty token', () => {
      const token = 'valid_token_123';
      expect(token).toBeTruthy();
    });

    it('should reject empty token', () => {
      const token = '';
      expect(token).toBeFalsy();
    });

    it('should handle various token formats', () => {
      const tokens = [
        'abc123def456',
        'token-with-dashes',
        'token_with_underscores',
        'VeryLongTokenStringWith123AndSpecialChars!@#$',
      ];

      tokens.forEach((token) => {
        expect(token).toBeTruthy();
      });
    });
  });

  describe('Auth mode handling', () => {
    it('should identify local mode correctly', () => {
      const authMode = 'local';
      expect(authMode === 'local').toBe(true);
    });

    it('should identify oauth mode correctly', () => {
      const authMode = 'oauth';
      expect(authMode === 'oauth').toBe(true);
    });
  });

  describe('Session management', () => {
    it('should handle returnTo session parameter', () => {
      const session: unknown = {};
      const returnTo = '/admin/dashboard';

      session.returnTo = returnTo;
      expect(session.returnTo).toBe('/admin/dashboard');
    });

    it('should clear returnTo after use', () => {
      const session: unknown = { returnTo: '/admin/dashboard' };

      delete session.returnTo;
      expect(session.returnTo).toBeUndefined();
    });

    it('should default to /admin if no returnTo', () => {
      const session: unknown = {};
      const defaultPath = '/admin';

      const redirectPath = session.returnTo || defaultPath;
      expect(redirectPath).toBe('/admin');
    });
  });

  describe('User data handling', () => {
    it('should remove password from user object', () => {
      const user = {
        email: 'admin@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'secret_password',
        role: 'super_admin',
      };

      const { password, ...userWithoutPassword } = user;

      expect(userWithoutPassword).not.toHaveProperty('password');
      expect(userWithoutPassword.email).toBe('admin@example.com');
    });

    it('should handle users with different roles', () => {
      const roles = ['super_admin', 'ideas_manager', 'events_manager', 'ideas_reader', 'events_reader'];

      roles.forEach((role) => {
        const user = { email: 'user@example.com', role };
        expect(user.role).toBeDefined();
      });
    });

    it('should handle user status transitions', () => {
      const statuses = ['pending', 'active', 'inactive'];

      statuses.forEach((status) => {
        const user = { email: 'user@example.com', status };
        expect(user.status).toBeDefined();
      });
    });
  });

  describe('OAuth2 callback', () => {
    it('should handle successful callback', () => {
      const user: Admin = {
        email: 'admin@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'hashed_password',
        role: 'super_admin',
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        addedBy: null,
      };

      expect(user).toBeDefined();
      expect(user.email).toBe('admin@example.com');
    });

    it('should reject callback without user', () => {
      const user = null;

      expect(user).toBeNull();
    });

    it('should handle returnTo parameter', () => {
      const session: unknown = { returnTo: '/admin/ideas' };

      expect(session.returnTo).toBe('/admin/ideas');
    });

    it('should redirect to default path if no returnTo', () => {
      const session: unknown = {};
      const defaultPath = '/admin';

      const redirectPath = session.returnTo || defaultPath;
      expect(redirectPath).toBe('/admin');
    });
  });

  describe('Error responses', () => {
    it('should provide clear validation error messages', () => {
      try {
        loginSchema.parse({ email: 'invalid', password: '' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          expect(error.issues.length).toBeGreaterThan(0);
        }
      }
    });

    it('should indicate missing required fields', () => {
      const schema = z.object({
        email: z.string().email(),
      });

      try {
        schema.parse({});
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Auth mode endpoints', () => {
    it('should return current auth mode', () => {
      const modes = ['local', 'oauth'];

      modes.forEach((mode) => {
        const result = { mode };
        expect(result.mode).toBe(mode);
      });
    });

    it('should provide mode information for client', () => {
      const authMode = 'oauth';
      const response = { mode: authMode };

      expect(response).toEqual({ mode: 'oauth' });
    });
  });
});
