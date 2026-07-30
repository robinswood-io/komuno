import { describe, expect, it } from 'vitest';
import {
  isSafeTenantRedirectUrl,
  normalizeSlug,
  parseTenantRedirects,
  resolveDedicatedTenantRedirect,
} from '../../app/o/[slug]/page';

describe('tenant routing helpers', () => {
  it('normalizes safe tenant slugs only', () => {
    expect(normalizeSlug(' CJD-Hauts-de-France ')).toBe('cjd-hauts-de-france');
    expect(normalizeSlug('../admin')).toBeNull();
    expect(normalizeSlug('x')).toBeNull();
  });

  it('accepts https redirects and rejects unsafe URLs', () => {
    expect(isSafeTenantRedirectUrl('https://cjd-hdf.fr')).toBe(true);
    expect(isSafeTenantRedirectUrl('http://cjd-hdf.fr')).toBe(false);
    expect(isSafeTenantRedirectUrl('javascript:alert(1)')).toBe(false);
  });

  it('parses JSON and comma-separated redirect maps', () => {
    expect(parseTenantRedirects('{"CJD-Hauts-de-France":"https://cjd-hdf.fr","bad":"http://example.test"}')).toEqual({
      'cjd-hauts-de-france': 'https://cjd-hdf.fr',
    });
    expect(parseTenantRedirects('reseau-entreprendre-picardie=https://repicardie.fr, bad=http://example.test')).toEqual({
      'reseau-entreprendre-picardie': 'https://repicardie.fr',
    });
  });

  it('resolves dedicated tenant redirects without fallback', () => {
    const redirects = { 'cjd-hauts-de-france': 'https://cjd-hdf.fr' };
    expect(resolveDedicatedTenantRedirect('cjd-hauts-de-france', redirects)).toBe('https://cjd-hdf.fr');
    expect(resolveDedicatedTenantRedirect('unknown', redirects)).toBeNull();
  });
});
