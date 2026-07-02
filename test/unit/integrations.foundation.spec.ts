import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';

import {
  buildIcsCalendar,
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  integrationSecretFingerprint,
  sanitizeIntegrationSettings,
  withoutIntegrationSecret,
} from '../../server/src/integrations/integrations.utils';
import { syncBrevoLists, testBrevoConnection } from '../../server/src/integrations/providers/brevo';
import {
  getHelloAssoBases,
  requestHelloAssoToken,
  syncHelloAssoCatalog,
  testHelloAssoConnection,
} from '../../server/src/integrations/providers/helloasso';
import {
  buildOutboundWebhookPayload,
  deliverOutboundWebhook,
  eventMatchesWebhook,
  parseOutboundWebhookSecret,
  parseOutboundWebhookSettings,
  signOutboundWebhook,
} from '../../server/src/integrations/providers/outbound-webhook';
import { parseStripeCredentials, syncStripeCatalog, testStripeConnection, verifyStripeWebhookSignature } from '../../server/src/integrations/providers/stripe';
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
      return { ok: true, status: 200, statusText: 'OK', json: async () => ({ access_token: 'access-token', token_type: 'Bearer', expires_in: 1800 }) } as unknown;
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
      if (input.endsWith('/oauth2/token')) return { ok: true, status: 200, statusText: 'OK', json: async () => ({ access_token: 'access-token' }) } as unknown;
      if (input.includes('/forms?')) return { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: [{ title: 'Billetterie', formSlug: 'billetterie', formType: 'Event', state: 'Public' }], pagination: { continuationToken: 'next-forms' } }) } as unknown;
      if (input.includes('/orders?')) return { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: [{ payer: { email: 'pii@example.org' } }], pagination: { continuationToken: 'next-orders' } }) } as unknown;
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

  it('teste Brevo et synchronise uniquement les métadonnées de listes', async () => {
    const calls: Array<{ input: string; apiKey?: string }> = [];
    const fetchImpl = async (input: string, init?: RequestInit) => {
      calls.push({ input, apiKey: init?.headers ? (init.headers as Record<string, string>)['api-key'] : undefined });
      if (input.endsWith('/account')) return { ok: true, status: 200, statusText: 'OK', json: async () => ({ organization_id: 'org_1', companyName: 'Association', email: 'private@example.org', plan: [{}], relay: { enabled: true } }) } as unknown;
      if (input.includes('/contacts/lists')) return { ok: true, status: 200, statusText: 'OK', json: async () => ({ count: 1, lists: [{ id: 12, name: 'Membres', totalSubscribers: 42, folderId: 3 }] }) } as unknown;
      throw new Error(`Unexpected call: ${input}`);
    };

    const settings = { baseUrl: 'https://api.brevo.com/v3', senderEmail: 'notifications@example.org' };
    const testResult = await testBrevoConnection({ settings, apiKey: 'xkeysib-secret', fetchImpl });
    const syncResult = await syncBrevoLists({ settings, apiKey: 'xkeysib-secret', fetchImpl });

    expect(calls[0]).toEqual({ input: 'https://api.brevo.com/v3/account', apiKey: 'xkeysib-secret' });
    expect(testResult.verifiedScopes).toEqual(['account_read']);
    expect(JSON.stringify(testResult)).not.toContain('private@example.org');
    expect(syncResult).toMatchObject({ listsCount: 1, totalCount: 1, contactsSyncMode: 'list_metadata_only_no_contact_payload' });
    expect(JSON.stringify(syncResult)).not.toContain('private@example.org');
  });

  it('teste Stripe et synchronise produits/prix sans payload client', async () => {
    const calls: Array<{ input: string; authorization?: string }> = [];
    const fetchImpl = async (input: string, init?: RequestInit) => {
      calls.push({ input, authorization: init?.headers ? (init.headers as Record<string, string>).authorization : undefined });
      if (input.endsWith('/v1/account')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            id: 'acct_123',
            country: 'FR',
            default_currency: 'eur',
            charges_enabled: true,
            payouts_enabled: false,
            email: 'owner@example.org',
          }),
        } as unknown;
      }
      if (input.includes('/v1/products')) {
        return { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: [{ id: 'prod_1', name: 'Cotisation', active: true, type: 'service', created: 1770000000 }], has_more: false }) } as unknown;
      }
      if (input.includes('/v1/prices')) {
        return { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: [{ id: 'price_1', product: 'prod_1', active: true, currency: 'eur', unit_amount: 3000, recurring: { interval: 'year' }, type: 'recurring' }], has_more: false }) } as unknown;
      }
      if (input.includes('/v1/customers')) throw new Error('Customer payload must not be fetched by default');
      throw new Error(`Unexpected call: ${input}`);
    };

    const settings = { baseUrl: 'https://api.stripe.com', mode: 'test', pageSize: 25 };
    const testResult = await testStripeConnection({ settings, apiKey: 'sk_test_secret', fetchImpl });
    const syncResult = await syncStripeCatalog({ settings, apiKey: 'sk_test_secret', fetchImpl });

    expect(calls[0].authorization).toMatch(/^Basic /);
    expect(testResult.verifiedScopes).toEqual(['account_read']);
    expect(JSON.stringify(testResult)).not.toContain('owner@example.org');
    expect(syncResult).toMatchObject({
      mode: 'test',
      productsCount: 1,
      pricesCount: 1,
      customersSyncMode: 'disabled',
    });
    expect(JSON.stringify(syncResult)).not.toContain('owner@example.org');
  });

  it('refuse Stripe si le mode configuré ne correspond pas à la clé', async () => {
    await expect(testStripeConnection({ settings: { mode: 'live' }, apiKey: 'sk_test_secret', fetchImpl: async () => { throw new Error('no call'); } })).rejects.toThrow('Mode Stripe incohérent');
  });

  it('vérifie les signatures de webhooks entrants Stripe avec raw body exact', () => {
    const rawBody = '{"id":"evt_123","type":"checkout.session.completed"}';
    const webhookSigningSecret = 'whsec_test_secret';
    const timestamp = 1770000000;
    const signedPayload = `${timestamp}.${rawBody}`;
    const signature = createHmac('sha256', webhookSigningSecret).update(signedPayload).digest('hex');

    expect(parseStripeCredentials('{"apiKey":"sk_test_secret","webhookSigningSecret":"whsec_test_secret"}')).toMatchObject({
      apiKey: 'sk_test_secret',
      webhookSigningSecret,
      secretMode: 'json',
    });
    expect(verifyStripeWebhookSignature({ rawBody, signatureHeader: `t=${timestamp},v1=${signature}`, webhookSigningSecret, nowSeconds: timestamp })).toBe(true);
    expect(verifyStripeWebhookSignature({ rawBody: JSON.stringify(JSON.parse(rawBody), null, 2), signatureHeader: `t=${timestamp},v1=${signature}`, webhookSigningSecret, nowSeconds: timestamp })).toBe(false);
    expect(verifyStripeWebhookSignature({ rawBody, signatureHeader: `t=${timestamp - 999},v1=${signature}`, webhookSigningSecret, nowSeconds: timestamp })).toBe(false);
  });

  it('signe les webhooks sortants et interdit les cibles non HTTPS/locales', async () => {
    const settings = parseOutboundWebhookSettings({ events: ['member.created'], timeoutMs: 3000, maxAttempts: 4 });
    expect(eventMatchesWebhook(settings, 'member.created')).toBe(true);
    expect(eventMatchesWebhook(settings, 'event.created')).toBe(false);
    expect(() => parseOutboundWebhookSecret('http://example.org/hook')).toThrow('HTTPS obligatoire');
    expect(() => parseOutboundWebhookSecret('https://localhost/hook')).toThrow('cible locale interdite');

    const parsedSecret = parseOutboundWebhookSecret('{"targetUrl":"https://hooks.example.org/komuno","signingSecret":"0123456789abcdef"}');
    expect(parsedSecret).toMatchObject({ targetUrl: 'https://hooks.example.org/komuno', secretMode: 'json' });

    const payload = buildOutboundWebhookPayload({ id: 'evt_1', type: 'member.created', data: { memberId: 'member-1' }, createdAt: '2026-06-30T16:00:00.000Z' });
    const signature = signOutboundWebhook(JSON.stringify(payload), parsedSecret.signingSecret, 1770000000);
    expect(signature.header).toMatch(/^t=1770000000,v1=[a-f0-9]{64}$/);

    const calls: Array<{ input: string; headers?: Record<string, string>; body?: string }> = [];
    const result = await deliverOutboundWebhook({
      targetUrl: parsedSecret.targetUrl,
      signingSecret: parsedSecret.signingSecret,
      eventType: 'member.created',
      payload,
      fetchImpl: async (input: string, init?: RequestInit) => {
        calls.push({ input, headers: init?.headers as Record<string, string>, body: init?.body?.toString() });
        return { ok: true, status: 204, statusText: 'No Content', json: async () => ({}), text: async () => '' } as unknown;
      },
    });

    expect(result).toEqual({ ok: true, status: 204, responseBody: '' });
    expect(calls[0].headers?.['x-komuno-event']).toBe('member.created');
    expect(calls[0].headers?.['x-komuno-signature']).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    expect(calls[0].body).toContain('member.created');
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
