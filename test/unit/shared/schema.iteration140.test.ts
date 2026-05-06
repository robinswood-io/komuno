import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 140', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers additional role-helper switch branches and invalid role guard', () => {
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_MANAGER, 'admin.edit')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_READER, 'admin.edit')).toBe(false);
    expect(schema.hasPermission(42 as unknown as string, 'ideas.read')).toBe(false);

    expect(schema.getRoleDisplayName(schema.ADMIN_ROLES.SUPER_ADMIN)).toBe('Super Administrateur');
    expect(schema.getRoleDisplayName('other-role')).toBe('Rôle inconnu');

    expect(schema.getRolePermissions(schema.ADMIN_ROLES.SUPER_ADMIN)).toEqual([
      'Toutes les permissions',
      'Gestion des administrateurs',
    ]);
    expect(schema.getRolePermissions('other-role')).toEqual([]);
  });
});
