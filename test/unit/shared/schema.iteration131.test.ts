import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 131', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers error constructors and remaining role helper switch branches', () => {
    const dbError = new schema.DatabaseError('db error');
    const notFoundError = new schema.NotFoundError('missing');

    expect(dbError.name).toBe('DatabaseError');
    expect(notFoundError.name).toBe('NotFoundError');

    expect(schema.hasPermission(schema.ADMIN_ROLES.SUPER_ADMIN, 'admin.manage')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_READER, 'events.read')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_MANAGER, 'events.manage')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_MANAGER, 'ideas.manage')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_READER, 'ideas.read')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_READER, 'unknown.permission')).toBe(false);

    expect(schema.getRoleDisplayName(schema.ADMIN_ROLES.EVENTS_READER)).toBe('Consultation des événements');
    expect(schema.getRoleDisplayName(schema.ADMIN_ROLES.EVENTS_MANAGER)).toBe('Gestion des événements');

    const ideasManagerPermissions = schema.getRolePermissions(schema.ADMIN_ROLES.IDEAS_MANAGER);
    const eventsManagerPermissions = schema.getRolePermissions(schema.ADMIN_ROLES.EVENTS_MANAGER);

    expect(ideasManagerPermissions).toContain('Gestion des votes');
    expect(eventsManagerPermissions).toContain('Gestion des inscriptions et absences');
    expect(schema.getRolePermissions('role-inconnu')).toEqual([]);
  });
});
