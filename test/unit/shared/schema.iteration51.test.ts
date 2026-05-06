import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { getTableConfig } from 'drizzle-orm/pg-core';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 51 - stubborn lines and status schema behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 callback execution by alternating referenced category ids', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = tableConfig.foreignKeys[0];
    const originalId = schema.financialCategories.id;

    expect(tableConfig.foreignKeys).toHaveLength(1);

    const values = [
      { name: 'iteration51-id-a' } as unknown as typeof originalId,
      { name: 'iteration51-id-b' } as unknown as typeof originalId,
      originalId,
    ];

    const enumerable = Object.prototype.propertyIsEnumerable.call(schema.financialCategories, 'id');
    let callIndex = 0;
    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      get() {
        const value = values[callIndex] ?? originalId;
        callIndex += 1;
        return value;
      },
    });

    const ref1 = foreignKey?.reference();
    const ref2 = foreignKey?.reference();
    const ref3 = foreignKey?.reference();

    expect(callIndex).toBe(3);
    expect(ref1?.foreignColumns[0]?.name).toBe('iteration51-id-a');
    expect(ref2?.foreignColumns[0]?.name).toBe('iteration51-id-b');
    expect(ref3?.foreignColumns[0]).toBe(originalId);

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      writable: true,
      value: originalId,
    });
  });

  it('proves lines 1600-1605 by observing refine pass/fail with parse spy', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration51-force-catch') {
        throw new Error('iteration51 forced');
      }

      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration51-valid',
      config: '{"theme":"light"}',
    });
    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration51-forced',
      config: 'iteration51-force-catch',
    });
    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration51-malformed',
      config: '{"theme":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"theme":"light"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration51-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"theme":}');
  });

  it('adds practical behavior: statusResponseSchema accepts healthy payload and rejects invalid overallStatus', () => {
    const valid = schema.statusResponseSchema.safeParse({
      timestamp: '2026-05-02T00:00:00.000Z',
      uptime: 456,
      environment: 'test',
      overallStatus: 'healthy',
      checks: {
        application: {
          name: 'api',
          status: 'healthy',
          message: 'ok',
          responseTime: 12,
        },
      },
    });

    const invalid = schema.statusResponseSchema.safeParse({
      timestamp: '2026-05-02T00:00:00.000Z',
      uptime: 456,
      environment: 'test',
      overallStatus: 'degraded',
      checks: {},
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
