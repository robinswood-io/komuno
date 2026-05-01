import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

type TransformContainer = {
  _def?: {
    out?: {
      _def?: {
        transform?: (value: string | undefined) => string | undefined;
      };
    };
  };
};

type OptionalWrapper = {
  unwrap?: () => unknown;
};

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

function extractTransform(field: unknown): (value: string | undefined) => string | undefined {
  const wrapper = field as OptionalWrapper;
  if (typeof wrapper.unwrap !== 'function') {
    throw new Error('Expected optional wrapper with unwrap()');
  }

  const unwrapped = wrapper.unwrap() as TransformContainer;
  const transform = unwrapped._def?.out?._def?.transform;

  if (typeof transform !== 'function') {
    throw new Error('Expected transform function on unwrapped schema');
  }

  return transform;
}

describe('shared/schema.js iteration 20 - hard-to-hit transform fallback branches', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('executes logoUrl transform false/true ternary branches directly', () => {
    const logoTransform = extractTransform(schema.insertEventSponsorshipSchema.shape.logoUrl);

    expect(logoTransform(undefined)).toBeUndefined();
    expect(logoTransform('https://example.org/logo.png')).toBe('https://example.org/logo.png');
  });

  it('executes websiteUrl transform false/true ternary branches directly', () => {
    const websiteTransform = extractTransform(schema.insertEventSponsorshipSchema.shape.websiteUrl);

    expect(websiteTransform(undefined)).toBeUndefined();
    expect(websiteTransform('https://example.org')).toBe('https://example.org');
  });
});
