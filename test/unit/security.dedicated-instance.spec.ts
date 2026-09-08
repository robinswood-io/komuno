import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../../server/src/auth/guards/permission.guard';
import { ADMIN_ROLES, members, memberGroups } from '../../shared/schema';

function context(request: unknown): ExecutionContext {
  return { getHandler: () => function handler() {}, switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}
const guard = () => new PermissionGuard({ get: () => 'admin.view' } as unknown as Reflector);
describe('Dedicated instance authorization contract', () => {
  it('retains existing role access without requiring or injecting an organization', () => {
    const request = { user: { role: ADMIN_ROLES.EVENTS_MANAGER }, path: '/api/admin/members', query: {}, body: {} };
    expect(guard().canActivate(context(request))).toBe(true);
    expect(request.query).toEqual({});
    expect(request.body).toEqual({});
  });
  it('still rejects missing authentication', () => {
    expect(() => guard().canActivate(context({}))).toThrow(ForbiddenException);
  });

  it('documents the dedicated instance and database deployment contract in README', () => {
    const readme = readFileSync('README.md', 'utf8');
    expect(readme).toContain('instance et base de données dédiées par client');
    expect(readme).toContain('pas d’hébergement de clients indépendants dans une même base');
    expect(readme).not.toContain('Architecture multi-tenant');
    expect(readme).not.toContain('Plateforme collaborative multi-tenant');
  });

  it('does not introduce unrequested member/group database columns', () => {
    expect(members).not.toHaveProperty('organizationId');
    expect(memberGroups).not.toHaveProperty('organizationId');
  });
});
