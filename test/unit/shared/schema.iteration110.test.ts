import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 110', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers role helper branches including invalid role warning/default fallbacks', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(schema.hasPermission(schema.ADMIN_ROLES.SUPER_ADMIN, 'ideas.read')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_READER, 'ideas.read')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_MANAGER, 'events.manage')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_MANAGER, 'admin.manage')).toBe(false);
    expect(schema.hasPermission('invalid-role', 'ideas.read')).toBe(false);
    expect(warnSpy).toHaveBeenCalled();

    expect(schema.getRoleDisplayName(schema.ADMIN_ROLES.EVENTS_READER)).toBe('Consultation des événements');
    expect(schema.getRoleDisplayName('unknown-role')).toBe('Rôle inconnu');

    expect(schema.getRolePermissions(schema.ADMIN_ROLES.IDEAS_MANAGER)).toContain('Gestion des votes');
    expect(schema.getRolePermissions(schema.ADMIN_ROLES.EVENTS_MANAGER)).toContain(
      'Gestion des inscriptions et absences',
    );
    expect(schema.getRolePermissions('unknown-role')).toEqual([]);
  });
});
