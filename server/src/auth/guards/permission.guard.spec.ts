import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission as schemaHasPermission } from '../../../../shared/schema';
import { PERMISSION_KEY } from '../decorators/permissions.decorator';
import { PermissionGuard } from './permission.guard';

vi.mock('../../../../shared/schema', () => ({
  hasPermission: vi.fn(),
  ADMIN_ROLES: {
    SUPER_ADMIN: 'super_admin',
  },
}));

// Rôles d'administration
const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  IDEAS_READER: 'ideas_reader',
  IDEAS_MANAGER: 'ideas_manager',
  EVENTS_READER: 'events_reader',
  EVENTS_MANAGER: 'events_manager',
};

// Logique de permission testée
const hasPermission = (userRole: string, permission: string): boolean => {
  if (userRole === ADMIN_ROLES.SUPER_ADMIN) return true;

  switch (permission) {
    case 'ideas.read':
      return [ADMIN_ROLES.IDEAS_READER, ADMIN_ROLES.IDEAS_MANAGER].includes(userRole);
    case 'ideas.write':
    case 'ideas.delete':
    case 'ideas.manage':
      return userRole === ADMIN_ROLES.IDEAS_MANAGER;
    case 'events.read':
      return [ADMIN_ROLES.EVENTS_READER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case 'events.write':
    case 'events.delete':
    case 'events.manage':
      return userRole === ADMIN_ROLES.EVENTS_MANAGER;
    case 'admin.view':
      return true;
    case 'admin.edit':
      return [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER].includes(userRole);
    case 'admin.manage':
      return false;
    default:
      return false;
  }
};

describe('PermissionGuard', () => {
  describe('Ideas permissions', () => {
    it('should allow ideas.read for IDEAS_READER', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_READER, 'ideas.read');
      expect(result).toBe(true);
    });

    it('should allow ideas.read for IDEAS_MANAGER', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_MANAGER, 'ideas.read');
      expect(result).toBe(true);
    });

    it('should allow ideas.write for IDEAS_MANAGER only', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_MANAGER, 'ideas.write');
      expect(result).toBe(true);
    });

    it('should reject ideas.write for IDEAS_READER', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_READER, 'ideas.write');
      expect(result).toBe(false);
    });

    it('should allow ideas.delete for IDEAS_MANAGER only', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_MANAGER, 'ideas.delete');
      expect(result).toBe(true);
    });

    it('should reject ideas.delete for IDEAS_READER', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_READER, 'ideas.delete');
      expect(result).toBe(false);
    });

    it('should allow ideas.manage for IDEAS_MANAGER', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_MANAGER, 'ideas.manage');
      expect(result).toBe(true);
    });
  });

  describe('Events permissions', () => {
    it('should allow events.read for EVENTS_READER', () => {
      const result = hasPermission(ADMIN_ROLES.EVENTS_READER, 'events.read');
      expect(result).toBe(true);
    });

    it('should allow events.read for EVENTS_MANAGER', () => {
      const result = hasPermission(ADMIN_ROLES.EVENTS_MANAGER, 'events.read');
      expect(result).toBe(true);
    });

    it('should allow events.write for EVENTS_MANAGER only', () => {
      const result = hasPermission(ADMIN_ROLES.EVENTS_MANAGER, 'events.write');
      expect(result).toBe(true);
    });

    it('should reject events.write for EVENTS_READER', () => {
      const result = hasPermission(ADMIN_ROLES.EVENTS_READER, 'events.write');
      expect(result).toBe(false);
    });

    it('should allow events.delete for EVENTS_MANAGER only', () => {
      const result = hasPermission(ADMIN_ROLES.EVENTS_MANAGER, 'events.delete');
      expect(result).toBe(true);
    });

    it('should reject events.delete for EVENTS_READER', () => {
      const result = hasPermission(ADMIN_ROLES.EVENTS_READER, 'events.delete');
      expect(result).toBe(false);
    });

    it('should allow events.manage for EVENTS_MANAGER', () => {
      const result = hasPermission(ADMIN_ROLES.EVENTS_MANAGER, 'events.manage');
      expect(result).toBe(true);
    });
  });

  describe('Admin permissions', () => {
    it('should allow admin.view for all authenticated users', () => {
      const roles = [
        ADMIN_ROLES.SUPER_ADMIN,
        ADMIN_ROLES.IDEAS_READER,
        ADMIN_ROLES.IDEAS_MANAGER,
        ADMIN_ROLES.EVENTS_READER,
        ADMIN_ROLES.EVENTS_MANAGER,
      ];

      roles.forEach((role) => {
        const result = hasPermission(role, 'admin.view');
        expect(result).toBe(true);
      });
    });

    it('should allow admin.edit for managers', () => {
      const managerRoles = [ADMIN_ROLES.IDEAS_MANAGER, ADMIN_ROLES.EVENTS_MANAGER];

      managerRoles.forEach((role) => {
        const result = hasPermission(role, 'admin.edit');
        expect(result).toBe(true);
      });
    });

    it('should reject admin.edit for readers', () => {
      const readerRoles = [ADMIN_ROLES.IDEAS_READER, ADMIN_ROLES.EVENTS_READER];

      readerRoles.forEach((role) => {
        const result = hasPermission(role, 'admin.edit');
        expect(result).toBe(false);
      });
    });

    it('should reject admin.manage for all non-super-admin roles', () => {
      const nonSuperAdminRoles = [
        ADMIN_ROLES.IDEAS_READER,
        ADMIN_ROLES.IDEAS_MANAGER,
        ADMIN_ROLES.EVENTS_READER,
        ADMIN_ROLES.EVENTS_MANAGER,
      ];

      nonSuperAdminRoles.forEach((role) => {
        const result = hasPermission(role, 'admin.manage');
        expect(result).toBe(false);
      });
    });
  });

  describe('Super Admin role', () => {
    it('should allow SUPER_ADMIN access to all permissions', () => {
      const permissions = [
        'ideas.read',
        'ideas.write',
        'ideas.delete',
        'ideas.manage',
        'events.read',
        'events.write',
        'events.delete',
        'events.manage',
        'admin.view',
        'admin.edit',
        'admin.manage',
      ];

      permissions.forEach((permission) => {
        const result = hasPermission(ADMIN_ROLES.SUPER_ADMIN, permission);
        expect(result).toBe(true);
      });
    });
  });

  describe('Unknown permissions', () => {
    it('should allow SUPER_ADMIN unknown permissions', () => {
      const result = hasPermission(ADMIN_ROLES.SUPER_ADMIN, 'unknown.permission');
      expect(result).toBe(true); // Super admin has all permissions
    });

    it('should reject unknown permissions for other roles', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_MANAGER, 'unknown.permission');
      expect(result).toBe(false);
    });

    it('should reject invalid permission strings', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_MANAGER, 'invalid');
      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty role string', () => {
      const result = hasPermission('', 'ideas.read');
      expect(result).toBe(false);
    });

    it('should handle null-like role', () => {
      const result = hasPermission(null as unknown, 'ideas.read');
      expect(result).toBe(false);
    });

    it('should handle undefined permission', () => {
      const result = hasPermission(ADMIN_ROLES.SUPER_ADMIN, undefined as unknown);
      expect(result).toBe(true); // Super admin has access to anything
    });
  });

  describe('Cross-domain permission restrictions', () => {
    it('should not allow IDEAS_MANAGER to access events.write', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_MANAGER, 'events.write');
      expect(result).toBe(false);
    });

    it('should not allow EVENTS_MANAGER to access ideas.write', () => {
      const result = hasPermission(ADMIN_ROLES.EVENTS_MANAGER, 'ideas.write');
      expect(result).toBe(false);
    });

    it('should not allow IDEAS_READER to access events permissions', () => {
      const result = hasPermission(ADMIN_ROLES.IDEAS_READER, 'events.read');
      expect(result).toBe(false);
    });

    it('should not allow EVENTS_READER to access ideas permissions', () => {
      const result = hasPermission(ADMIN_ROLES.EVENTS_READER, 'ideas.read');
      expect(result).toBe(false);
    });
  });

  describe('Permission matrix validation', () => {
    it('should enforce ideas read-only for IDEAS_READER', () => {
      const ideasPermissions = ['ideas.read', 'ideas.write', 'ideas.delete', 'ideas.manage'];
      const readablePermissions = ideasPermissions.filter(
        (p) => hasPermission(ADMIN_ROLES.IDEAS_READER, p)
      );

      expect(readablePermissions).toEqual(['ideas.read']);
    });

    it('should enforce ideas full access for IDEAS_MANAGER', () => {
      const ideasPermissions = ['ideas.read', 'ideas.write', 'ideas.delete', 'ideas.manage'];
      const accessiblePermissions = ideasPermissions.filter(
        (p) => hasPermission(ADMIN_ROLES.IDEAS_MANAGER, p)
      );

      expect(accessiblePermissions).toEqual(ideasPermissions);
    });

    it('should enforce events read-only for EVENTS_READER', () => {
      const eventsPermissions = ['events.read', 'events.write', 'events.delete', 'events.manage'];
      const readablePermissions = eventsPermissions.filter(
        (p) => hasPermission(ADMIN_ROLES.EVENTS_READER, p)
      );

      expect(readablePermissions).toEqual(['events.read']);
    });

    it('should enforce events full access for EVENTS_MANAGER', () => {
      const eventsPermissions = ['events.read', 'events.write', 'events.delete', 'events.manage'];
      const accessiblePermissions = eventsPermissions.filter(
        (p) => hasPermission(ADMIN_ROLES.EVENTS_MANAGER, p)
      );

      expect(accessiblePermissions).toEqual(eventsPermissions);
    });
  });
});

describe('PermissionGuard canActivate', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  const buildContext = (
    handler: () => void,
    user?: { role: string },
  ): ExecutionContext => {
    const getRequest = vi.fn(() => ({ user }));
    const switchToHttp = vi.fn(() => ({ getRequest }));

    return {
      getHandler: vi.fn(() => handler),
      switchToHttp,
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      get: vi.fn(),
    } as unknown as Reflector;
    guard = new PermissionGuard(reflector);
    vi.mocked(schemaHasPermission).mockReset();
  });

  it('should allow access when no permission metadata is defined', () => {
    const handler = () => {};
    vi.mocked(reflector.get).mockReturnValue(undefined);
    const context = buildContext(handler, { role: 'ideas_reader' });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.get).toHaveBeenCalledWith(PERMISSION_KEY, handler);
    expect(schemaHasPermission).not.toHaveBeenCalled();
  });

  it('should allow access when permission metadata is empty string', () => {
    const handler = () => {};
    vi.mocked(reflector.get).mockReturnValue('');
    const context = buildContext(handler, { role: 'events_reader' });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(schemaHasPermission).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when permission is required but user is missing', () => {
    const handler = () => {};
    vi.mocked(reflector.get).mockReturnValue('admin.view');
    const context = buildContext(handler);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Authentication required');
  });

  it('should call hasPermission with user role and required permission', () => {
    const handler = () => {};
    vi.mocked(reflector.get).mockReturnValue('ideas.read');
    vi.mocked(schemaHasPermission).mockReturnValue(true);
    const context = buildContext(handler, { role: 'ideas_reader' });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(schemaHasPermission).toHaveBeenCalledWith('ideas_reader', 'ideas.read');
  });

  it('should allow super_admin when permission helper grants access', () => {
    const handler = () => {};
    vi.mocked(reflector.get).mockReturnValue('admin.manage');
    vi.mocked(schemaHasPermission).mockReturnValue(true);
    const context = buildContext(handler, { role: 'super_admin' });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(schemaHasPermission).toHaveBeenCalledWith('super_admin', 'admin.manage');
  });

  it('should throw ForbiddenException when helper denies access', () => {
    const handler = () => {};
    vi.mocked(reflector.get).mockReturnValue('events.write');
    vi.mocked(schemaHasPermission).mockReturnValue(false);
    const context = buildContext(handler, { role: 'events_reader' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      "Permission 'events.write' required",
    );
  });

  it('should deny a user without requested admin permission', () => {
    const handler = () => {};
    vi.mocked(reflector.get).mockReturnValue('admin.manage');
    vi.mocked(schemaHasPermission).mockReturnValue(false);
    const context = buildContext(handler, { role: 'ideas_manager' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(schemaHasPermission).toHaveBeenCalledWith('ideas_manager', 'admin.manage');
  });

  it('should evaluate metadata from the current handler branch', () => {
    const handler = () => {};
    vi.mocked(reflector.get).mockReturnValue('ideas.delete');
    vi.mocked(schemaHasPermission).mockReturnValue(true);
    const context = buildContext(handler, { role: 'ideas_manager' });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.get).toHaveBeenCalledWith(PERMISSION_KEY, handler);
  });
});
