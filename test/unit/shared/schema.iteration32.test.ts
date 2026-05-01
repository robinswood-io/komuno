import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 32 - runtime and partial schema edge paths', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('parses feature config with explicit enabled=false and createdAt', () => {
    const createdAt = new Date('2036-03-01T10:00:00.000Z');
    const parsed = schema.insertFeatureConfigSchema.parse({
      featureKey: 'feature-flag-x',
      enabled: false,
      createdAt,
    });

    expect(parsed.featureKey).toBe('feature-flag-x');
    expect(parsed.enabled).toBe(false);
    expect(parsed.createdAt).toEqual(createdAt);
  });

  it('accepts empty and nullable partial updates for financial forecast schema', () => {
    const emptyPatch = schema.updateFinancialForecastSchema.parse({});
    expect(emptyPatch).toEqual({
      confidence: 'medium',
      basedOn: 'estimate',
    });

    const nullablePatch = schema.updateFinancialForecastSchema.parse({
      month: null,
      quarter: null,
      notes: null,
    });

    expect(nullablePatch.month).toBeNull();
    expect(nullablePatch.quarter).toBeNull();
    expect(nullablePatch.notes).toBeNull();
  });

  it('validates status response using optional checks and overallStatus=error', () => {
    const parsed = schema.statusResponseSchema.parse({
      timestamp: '2036-03-01T10:00:00.000Z',
      uptime: 0,
      environment: 'test',
      overallStatus: 'error',
      checks: {},
    });

    expect(parsed.overallStatus).toBe('error');
    expect(parsed.checks).toEqual({});
  });

  it('rejects invalid status check enum values', () => {
    const result = schema.statusCheckSchema.safeParse({
      name: 'minio',
      status: 'critical',
      message: 'not allowed enum value',
    });

    expect(result.success).toBe(false);
  });

  it('rejects frontend error payload with overlong fields and invalid datetime', () => {
    const result = schema.frontendErrorSchema.safeParse({
      message: 'x'.repeat(1001),
      stack: 'stack',
      componentStack: 'component stack',
      url: 'https://example.org/path',
      userAgent: 'ua',
      timestamp: '2036-03-01',
    });

    expect(result.success).toBe(false);
  });
});
