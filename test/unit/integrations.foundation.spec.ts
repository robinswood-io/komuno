import { describe, expect, it } from 'vitest';

import {
  buildIcsCalendar,
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  integrationSecretFingerprint,
  sanitizeIntegrationSettings,
  withoutIntegrationSecret,
} from '../../server/src/integrations/integrations.utils';
import {
  getHelloAssoBases,
  requestHelloAssoToken,
  syncHelloAssoCatalog,
  testHelloAssoConnection,
} from '../../server/src/integrations/providers/helloasso';
import {
  hasPermission,
  insertIntegrationAccountSchema,
  insertIntegrationWebhookEventSchema,
} from '../../shared/schema.ts';

describe('Intégrations — socle sécurisé', () => {
  it('chiffre les secrets, expose uniquement un fingerprint et fail-close avec une mauvaise clé', () => {
    const env = { INTEGRATION_SECRET_ENCRYPTION_KEY: 'x'.repeat(48) } as NodeJS.ProcessEnv;
    const wrongEnv = { INTEGRATION_SECRET_ENCRYPTION_KEY: 'y'.repeat(48) } as NodeJS.ProcessEnv;
    const encrypted = encryptIntegrationSecret('helloasso-client-secret', env);

    expect(encrypted).toBeTruthy();
    expect(encrypted?.encrypted).not.toContain('helloasso-client-secret');
    expect(decryptIntegrationSecret(encrypted!.encrypted, env)).toBe('helloasso-client-secret');
    expect(decryptIntegrationSecret(encrypted!.encrypted, wrongEnv)).toBeNull();
    expect(integrationSecretFingerprint('helloasso-client-secret')).toHaveLength(12);
  });

  it('masque les paramètres sensibles et les payloads chiffrés dans les réponses API', () => {
    const safe = withoutIntegrationSecret({
      id: 'account-1',
      provider: 'helloasso',
      secretEncryptedPayload: 'v1:iv:tag:payload',
      secretEncryptionKeyId: 'KEYID',
      secretEncrypted: true,
      settings: {
        environment: 'sandbox',
        apiKey: 'secret',
        client_secret: 'secret',
        token: 'secret',
      },
    });

    expect(safe).not.toHaveProperty('secretEncryptedPayload');
    expect(safe).not.toHaveProperty('secretEncryptionKeyId');
    expect(safe.hasSecret).toBe(true);
    expect(safe.settings).toEqual({ environment: 'sandbox' });
    expect(sanitizeIntegrationSettings({ password: 'x', publicBaseUrl: 'https://example.org' })).toEqual({ publicBaseUrl: 'https://example.org' });
  });

  it('valide les comptes et webhooks sans accepter de fournisseur implicite', () => {
    const account = insertIntegrationAccountSchema.parse({ provider: 'helloasso', label: 'HelloAsso CJD', authType: 'oauth' });
    expect(account.provider).toBe('helloasso');
    expect(account.enabled).toBe(true);
    expect(() => insertIntegrationAccountSchema.parse({ provider: 'unknown', label: 'X' })).toThrow();

    const webhook = insertIntegrationWebhookEventSchema.parse({
      provider: 'helloasso',
      externalEventId: 'evt_1',
      eventType: 'order.paid',
      payloadHash: 'a'.repeat(64),
      payload: { id: 'evt_1' },
    });
    expect(webhook.status).toBe('received');
  });

  it('réserve la gestion des intégrations aux managers et super admin', () => {
    expect(hasPermission('ideas_reader', 'integrations.view')).toBe(false);
    expect(hasPermission('events_reader', 'integrations.view')).toBe(false);
    expect(hasPermission('ideas_manager', 'integrations.view')).toBe(true);
    expect(hasPermission('events_manager', 'integrations.write')).toBe(true);
    expect(hasPermission('super_admin', 'integrations.manage')).toBe(true);
  });

  it('configure HelloAsso sur les bons endpoints sandbox/production', () => {
    expect(getHelloAssoBases('sandbox')).toEqual({
      oauth: 'https://api.helloasso-sandbox.com/oauth2',
      api: 'https://api.helloasso-sandbox.com/v5',
    });
    expect(getHelloAssoBases('production').api).toBe('https://api.helloasso.com/v5');
  });

  it('authentifie HelloAsso sans exposer le secret dans le résultat', async () => {
    const calls: Array<{ input: string; body?: string }> = [];
    const fetchImpl = async (input: string, init?: RequestInit) => {
      calls.push({ input, body: init?.body?.toString() });
      return { ok: true, status: 200, statusText: 'OK', json: async () => ({ access_token: 'access-token', token_type: 'Bearer', expires_in: 1800 }) } as any;
    };

    const result = await requestHelloAssoToken({
      settings: { environment: 'sandbox', clientId: 'client-id-123' },
      clientSecret: 'client-secret-456',
      fetchImpl,
    });

    expect(calls[0].input).toBe('https://api.helloasso-sandbox.com/oauth2/token');
    expect(calls[0].body).toContain('grant_type=client_credentials');
    expect(calls[0].body).toContain('client_id=client-id-123');
    expect(calls[0].body).toContain('client_secret=client-secret-456');
    expect(result).toEqual({ accessToken: 'access-token', tokenType: 'Bearer', expiresIn: 1800, environment: 'sandbox' });
  });

  it('teste et synchronise HelloAsso en ne conservant que des métadonnées publiques/agrégées', async () => {
    const calls: string[] = [];
    const fetchImpl = async (input: string) => {
      calls.push(input);
      if (input.endsWith('/oauth2/token')) return { ok: true, status: 200, statusText: 'OK', json: async () => ({ access_token: 'access-token' }) } as any;
      if (input.includes('/forms?')) return { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: [{ title: 'Billetterie', formSlug: 'billetterie', formType: 'Event', state: 'Public' }], pagination: { continuationToken: 'next-forms' } }) } as any;
      if (input.includes('/orders?')) return { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: [{ payer: { email: 'pii@example.org' } }], pagination: { continuationToken: 'next-orders' } }) } as any;
      throw new Error(`Unexpected call: ${input}`);
    };

    const settings = { environment: 'sandbox', clientId: 'client-id-123', organizationSlug: 'cjd-amiens', syncOrdersEnabled: true };
    const testResult = await testHelloAssoConnection({ settings, clientSecret: 'client-secret-456', fetchImpl });
    const syncResult = await syncHelloAssoCatalog({ settings, clientSecret: 'client-secret-456', fetchImpl });

    expect(testResult.verifiedScopes).toEqual(['oauth_token', 'organization_forms']);
    expect(syncResult.formsCount).toBe(1);
    expect(syncResult.ordersCount).toBe(1);
    expect(JSON.stringify(syncResult)).not.toContain('pii@example.org');
    expect(calls.some((call) => call.includes('/organizations/cjd-amiens/forms'))).toBe(true);
    expect(calls.some((call) => call.includes('/organizations/cjd-amiens/orders'))).toBe(true);
  });

  it('génère un calendrier ICS valide et échappe les champs texte', () => {
    const ics = buildIcsCalendar([
      {
        id: 'event-1',
        title: 'Soirée réseau, Amiens',
        description: 'Ligne 1\nLigne 2; test',
        location: 'Amiens, France',
        date: '2026-07-01T18:00:00.000Z',
        updatedAt: '2026-06-30T12:00:00.000Z',
        url: 'https://cjd80.fr/events#event-1',
      },
    ], { calendarName: 'Agenda CJD' });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Soirée réseau\\, Amiens');
    expect(ics).toContain('DESCRIPTION:Ligne 1\\nLigne 2\\; test');
    expect(ics).toContain('DTSTART:20260701T180000Z');
    expect(ics).toContain('END:VCALENDAR');
  });
});
