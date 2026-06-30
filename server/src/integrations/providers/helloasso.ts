import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const HELLOASSO_ENVIRONMENT = {
  SANDBOX: 'sandbox',
  PRODUCTION: 'production',
} as const;

const HELLOASSO_BASES = {
  sandbox: {
    oauth: 'https://api.helloasso-sandbox.com/oauth2',
    api: 'https://api.helloasso-sandbox.com/v5',
  },
  production: {
    oauth: 'https://api.helloasso.com/oauth2',
    api: 'https://api.helloasso.com/v5',
  },
} as const;

const helloAssoSettingsSchema = z.object({
  environment: z.enum([HELLOASSO_ENVIRONMENT.SANDBOX, HELLOASSO_ENVIRONMENT.PRODUCTION]).default(HELLOASSO_ENVIRONMENT.SANDBOX),
  clientId: z.string().min(6).max(200),
  organizationSlug: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  formType: z.string().min(1).max(80).optional(),
  formSlug: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  syncOrdersEnabled: z.boolean().default(false),
});

export type HelloAssoSettings = z.infer<typeof helloAssoSettingsSchema>;
export type FetchLike = (input: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; statusText: string; json: () => Promise<any>; text?: () => Promise<string> }>;

export function parseHelloAssoSettings(settings: Record<string, unknown>): HelloAssoSettings {
  try {
    return helloAssoSettingsSchema.parse(settings ?? {});
  } catch (error) {
    throw new BadRequestException('Configuration HelloAsso invalide: clientId, environment et organizationSlug/formSlug doivent être renseignés correctement.');
  }
}

export function getHelloAssoBases(environment: HelloAssoSettings['environment']) {
  return HELLOASSO_BASES[environment];
}

function buildUrl(base: string, path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path.startsWith('/') ? `${base}${path}` : `${base}/${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function ensureSecret(clientSecret: string | null | undefined) {
  if (!clientSecret) throw new BadRequestException('Secret HelloAsso absent ou indéchiffrable');
  return clientSecret;
}

export async function requestHelloAssoToken(options: {
  settings: Record<string, unknown>;
  clientSecret: string | null | undefined;
  fetchImpl?: FetchLike;
}) {
  const settings = parseHelloAssoSettings(options.settings);
  const secret = ensureSecret(options.clientSecret);
  const fetchImpl = options.fetchImpl ?? fetch as FetchLike;
  const bases = getHelloAssoBases(settings.environment);
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: settings.clientId,
    client_secret: secret,
  });

  const response = await fetchImpl(`${bases.oauth}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) {
    throw new BadRequestException(`Authentification HelloAsso échouée (${response.status} ${response.statusText})`);
  }
  return {
    accessToken: String(data.access_token),
    tokenType: String(data.token_type ?? 'Bearer'),
    expiresIn: Number(data.expires_in ?? 0),
    environment: settings.environment,
  };
}

export async function helloAssoGet(options: {
  settings: HelloAssoSettings;
  accessToken: string;
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  fetchImpl?: FetchLike;
}) {
  const fetchImpl = options.fetchImpl ?? fetch as FetchLike;
  const bases = getHelloAssoBases(options.settings.environment);
  const response = await fetchImpl(buildUrl(bases.api, options.path, options.params), {
    method: 'GET',
    headers: { accept: 'application/json', authorization: `Bearer ${options.accessToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new BadRequestException(`Appel HelloAsso échoué (${response.status} ${response.statusText})`);
  }
  return data;
}

function extractArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.resources)) return payload.resources;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function continuationToken(payload: any): string | null {
  return payload?.pagination?.continuationToken
    ?? payload?.continuationToken
    ?? payload?.nextContinuationToken
    ?? null;
}

function publicFormSummary(form: any) {
  return {
    name: form?.title ?? form?.name ?? null,
    slug: form?.formSlug ?? form?.slug ?? null,
    type: form?.formType ?? form?.type ?? null,
    state: form?.state ?? null,
    updatedAt: form?.updateDate ?? form?.updatedAt ?? null,
    url: form?.url ?? form?.widgetFullUrl ?? null,
  };
}

export async function testHelloAssoConnection(options: {
  settings: Record<string, unknown>;
  clientSecret: string | null | undefined;
  fetchImpl?: FetchLike;
}) {
  const settings = parseHelloAssoSettings(options.settings);
  const token = await requestHelloAssoToken({ settings, clientSecret: options.clientSecret, fetchImpl: options.fetchImpl });
  const result: Record<string, unknown> = {
    environment: settings.environment,
    organizationSlug: settings.organizationSlug ?? null,
    tokenType: token.tokenType,
    expiresIn: token.expiresIn,
    verifiedScopes: ['oauth_token'],
  };

  if (settings.organizationSlug) {
    const forms = await helloAssoGet({
      settings,
      accessToken: token.accessToken,
      path: `/organizations/${encodeURIComponent(settings.organizationSlug)}/forms`,
      params: { page_size: 1 },
      fetchImpl: options.fetchImpl,
    });
    result.verifiedScopes = ['oauth_token', 'organization_forms'];
    result.formsPreviewCount = extractArray(forms).length;
  }

  return result;
}

export async function syncHelloAssoCatalog(options: {
  settings: Record<string, unknown>;
  clientSecret: string | null | undefined;
  fetchImpl?: FetchLike;
}) {
  const settings = parseHelloAssoSettings(options.settings);
  if (!settings.organizationSlug) throw new BadRequestException('organizationSlug est requis pour synchroniser HelloAsso');
  const token = await requestHelloAssoToken({ settings, clientSecret: options.clientSecret, fetchImpl: options.fetchImpl });

  const formsPayload = await helloAssoGet({
    settings,
    accessToken: token.accessToken,
    path: `/organizations/${encodeURIComponent(settings.organizationSlug)}/forms`,
    params: { page_size: settings.pageSize, form_types: settings.formType, page_index: 1 },
    fetchImpl: options.fetchImpl,
  });
  const forms = extractArray(formsPayload).map(publicFormSummary);

  let ordersCount = 0;
  let ordersContinuationToken: string | null = null;
  if (settings.syncOrdersEnabled) {
    const ordersPath = settings.formType && settings.formSlug
      ? `/organizations/${encodeURIComponent(settings.organizationSlug)}/forms/${encodeURIComponent(settings.formType)}/${encodeURIComponent(settings.formSlug)}/orders`
      : `/organizations/${encodeURIComponent(settings.organizationSlug)}/orders`;
    const ordersPayload = await helloAssoGet({
      settings,
      accessToken: token.accessToken,
      path: ordersPath,
      params: { page_size: Math.min(settings.pageSize, 50), with_details: false, page_index: 1 },
      fetchImpl: options.fetchImpl,
    });
    ordersCount = extractArray(ordersPayload).length;
    ordersContinuationToken = continuationToken(ordersPayload);
  }

  return {
    environment: settings.environment,
    organizationSlug: settings.organizationSlug,
    formsCount: forms.length,
    forms,
    formsContinuationToken: continuationToken(formsPayload),
    ordersCount,
    ordersContinuationToken,
    ordersSyncMode: settings.syncOrdersEnabled ? 'count_only_no_personal_payload' : 'disabled',
  };
}
