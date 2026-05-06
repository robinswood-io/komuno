import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 101', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers error helpers, role labels/permissions, and forced branding JSON catch branch', () => {
    const dbError = new schema.DatabaseError('db failure');
    const missingError = new schema.NotFoundError('not found');

    expect(dbError.name).toBe('DatabaseError');
    expect(missingError.name).toBe('NotFoundError');

    expect(schema.getRoleDisplayName(schema.ADMIN_ROLES.EVENTS_READER)).toBe('Consultation des événements');
    expect(schema.getRolePermissions(schema.ADMIN_ROLES.IDEAS_MANAGER)).toContain('Gestion des votes');
    expect(schema.getRolePermissions(schema.ADMIN_ROLES.EVENTS_MANAGER)).toContain('Gestion des inscriptions et absences');

    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation(() => {
      throw new SyntaxError('forced parse failure');
    });

    const brandingResult = schema.insertBrandingConfigSchema.safeParse({
      key: 'branding-iteration101',
      config: '{"force":"catch"}',
    });

    expect(parseSpy).toHaveBeenCalled();
    expect(brandingResult.success).toBe(false);
  });
});
