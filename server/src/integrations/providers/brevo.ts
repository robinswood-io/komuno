import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { FetchLike } from './helloasso';

const brevoSettingsSchema = z.object({
  baseUrl: z.string().url().default('https://api.brevo.com/v3'),
  senderName: z.string().max(120).optional(),
  senderEmail: z.string().email().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type BrevoSettings = z.infer<typeof brevoSettingsSchema>;

export function parseBrevoSettings(settings: Record<string, unknown>): BrevoSettings {
  try {
    const parsed = brevoSettingsSchema.parse(settings ?? {});
    const url = new URL(parsed.baseUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'api.brevo.com') {
      throw new Error('invalid_base_url');
    }
    return { ...parsed, baseUrl: parsed.baseUrl.replace(/\/$/, '') };
  } catch {
    throw new BadRequestException('Configuration Brevo invalide: baseUrl doit être https://api.brevo.com/v3 et senderEmail doit être valide.');
  }
}

function ensureApiKey(apiKey: string | null | undefined) {
  if (!apiKey) throw new BadRequestException('Clé API Brevo absente ou indéchiffrable');
  return apiKey;
}

function buildUrl(baseUrl: string, path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function brevoGet(options: {
  settings: BrevoSettings;
  apiKey: string;
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  fetchImpl?: FetchLike;
}) {
  const fetchImpl = options.fetchImpl ?? fetch as FetchLike;
  const response = await fetchImpl(buildUrl(options.settings.baseUrl, options.path, options.params), {
    method: 'GET',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': options.apiKey },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new BadRequestException(`Appel Brevo échoué (${response.status} ${response.statusText})`);
  return data;
}

function accountSummary(account: any) {
  return {
    organizationId: account?.organization_id ?? account?.organizationId ?? null,
    companyName: account?.companyName ?? null,
    enterprise: Boolean(account?.enterprise),
    planCount: Array.isArray(account?.plan) ? account.plan.length : 0,
    relayEnabled: Boolean(account?.relay?.enabled ?? account?.relay),
    marketingAutomationEnabled: Boolean(account?.marketingAutomation?.enabled ?? account?.marketingAutomation),
  };
}

function listsFromPayload(payload: any): any[] {
  if (Array.isArray(payload?.lists)) return payload.lists;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function listSummary(list: any) {
  return {
    id: list?.id ?? null,
    name: list?.name ?? null,
    totalSubscribers: Number(list?.totalSubscribers ?? list?.totalBlacklisted ?? list?.uniqueSubscribers ?? 0),
    folderId: list?.folderId ?? null,
    createdAt: list?.createdAt ?? null,
  };
}

export async function testBrevoConnection(options: {
  settings: Record<string, unknown>;
  apiKey: string | null | undefined;
  fetchImpl?: FetchLike;
}) {
  const settings = parseBrevoSettings(options.settings);
  const apiKey = ensureApiKey(options.apiKey);
  const account = await brevoGet({ settings, apiKey, path: '/account', fetchImpl: options.fetchImpl });
  return {
    baseUrl: settings.baseUrl,
    account: accountSummary(account),
    verifiedScopes: ['account_read'],
  };
}

export async function syncBrevoLists(options: {
  settings: Record<string, unknown>;
  apiKey: string | null | undefined;
  fetchImpl?: FetchLike;
}) {
  const settings = parseBrevoSettings(options.settings);
  const apiKey = ensureApiKey(options.apiKey);
  const payload = await brevoGet({
    settings,
    apiKey,
    path: '/contacts/lists',
    params: { limit: settings.pageSize, offset: 0 },
    fetchImpl: options.fetchImpl,
  });
  const lists = listsFromPayload(payload).map(listSummary);
  return {
    baseUrl: settings.baseUrl,
    listsCount: lists.length,
    totalCount: Number(payload?.count ?? lists.length),
    lists,
    contactsSyncMode: 'list_metadata_only_no_contact_payload',
    senderConfigured: Boolean(settings.senderEmail),
  };
}
