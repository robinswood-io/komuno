import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type BrandingCore = {
  organization: {
    name: string;
    fullName: string;
    tagline: string;
    url: string;
    email: string;
  };
  app: {
    name: string;
    shortName: string;
    description: string;
    ideaBoxName: string;
  };
  colors: Record<string, string>;
  fonts: {
    primary: string;
    googleFontsUrl: string;
    weights: number[];
  };
  pwa: {
    themeColor: string;
    backgroundColor: string;
    display: string;
    orientation: string;
    categories: string[];
    lang: string;
  };
  social: {
    ogType: string;
    twitterCard: string;
  };
  links: {
    website: string;
    support: string;
  };
};

type BrandingCoreModule = {
  brandingCore: BrandingCore;
  getBrandColor: (colorName: string) => string | undefined;
  getAppName: () => string;
  getShortAppName: () => string;
  getOrgName: () => string;
  getSuccessColor: () => string;
  getWarningColor: () => string;
  getErrorColor: () => string;
  getInfoColor: () => string;
};

const cjsRequire = createRequire(import.meta.url);
const brandingCorePath = cjsRequire.resolve('../../../lib/config/branding-core.js');
const branding = cjsRequire(brandingCorePath) as BrandingCoreModule;

let initialSnapshot = '';

describe('lib/config/branding-core.js - iteration1', () => {
  beforeEach(() => {
    initialSnapshot = JSON.stringify(branding.brandingCore);
  });

  afterEach(() => {
    const restored = JSON.parse(initialSnapshot) as BrandingCore;

    const keys = Object.keys(branding.brandingCore) as Array<keyof BrandingCore>;
    for (const key of keys) {
      delete branding.brandingCore[key];
    }
    Object.assign(branding.brandingCore, restored);
  });

  it('returns base app and organization names through exported helpers', () => {
    expect(branding.getAppName()).toBe(branding.brandingCore.app.name);
    expect(branding.getShortAppName()).toBe(branding.brandingCore.app.shortName);
    expect(branding.getOrgName()).toBe(branding.brandingCore.organization.name);
  });

  it('returns configured primary color and semantic colors', () => {
    expect(branding.getBrandColor('primary')).toBe(branding.brandingCore.colors.primary);
    expect(branding.getSuccessColor()).toBe(branding.brandingCore.colors.success);
    expect(branding.getWarningColor()).toBe(branding.brandingCore.colors.warning);
    expect(branding.getErrorColor()).toBe(branding.brandingCore.colors.error);
    expect(branding.getInfoColor()).toBe(branding.brandingCore.colors.info);
  });

  it('returns undefined for unknown or case-mismatched color keys', () => {
    expect(branding.getBrandColor('doesNotExist')).toBeUndefined();
    expect(branding.getBrandColor('PRIMARY')).toBeUndefined();
  });

  it('uses latest runtime value when a semantic color is overridden', () => {
    branding.brandingCore.colors.success = '#10b981';
    expect(branding.getSuccessColor()).toBe('#10b981');
  });

  it('reads dynamic runtime updates for app and organization names', () => {
    branding.brandingCore.app.name = 'Komuno X';
    branding.brandingCore.app.shortName = 'KMX';
    branding.brandingCore.organization.name = 'Acme Org';

    expect(branding.getAppName()).toBe('Komuno X');
    expect(branding.getShortAppName()).toBe('KMX');
    expect(branding.getOrgName()).toBe('Acme Org');
  });

  it('keeps core sections populated for theme and metadata usage', () => {
    expect(branding.brandingCore.fonts.primary.length).toBeGreaterThan(0);
    expect(branding.brandingCore.fonts.weights.length).toBeGreaterThan(0);
    expect(branding.brandingCore.pwa.categories.length).toBeGreaterThan(0);
    expect(branding.brandingCore.social.ogType).toBe('website');
    expect(branding.brandingCore.links.website.startsWith('https://')).toBe(true);
  });

  it('allows retrieving dynamically injected color tokens via generic helper', () => {
    branding.brandingCore.colors.customAnalytics = '#123456';
    expect(branding.getBrandColor('customAnalytics')).toBe('#123456');
  });
});
