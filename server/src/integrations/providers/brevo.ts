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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
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
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new BadRequestException(`Appel Brevo échoué (${response.status} ${response.statusText})`);
  return data;
}

function accountSummary(account: unknown) {
  const data = asRecord(account);
  const relay = asRecord(data.relay);
  const marketingAutomation = asRecord(data.marketingAutomation);
  return {
    organizationId: data.organization_id ?? data.organizationId ?? null,
    companyName: data.companyName ?? null,
    enterprise: Boolean(data.enterprise),
    planCount: Array.isArray(data.plan) ? data.plan.length : 0,
    relayEnabled: Boolean(relay.enabled ?? data.relay),
    marketingAutomationEnabled: Boolean(marketingAutomation.enabled ?? data.marketingAutomation),
  };
}

function listsFromPayload(payload: unknown): unknown[] {
  const data = asRecord(payload);
  if (Array.isArray(data.lists)) return data.lists;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function listSummary(list: unknown) {
  const data = asRecord(list);
  return {
    id: data.id ?? null,
    name: data.name ?? null,
    totalSubscribers: Number(data.totalSubscribers ?? data.totalBlacklisted ?? data.uniqueSubscribers ?? 0),
    folderId: data.folderId ?? null,
    createdAt: data.createdAt ?? null,
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
  const payloadRecord = asRecord(payload);
  return {
    baseUrl: settings.baseUrl,
    listsCount: lists.length,
    totalCount: Number(payloadRecord.count ?? lists.length),
    lists,
    contactsSyncMode: 'list_metadata_only_no_contact_payload',
    senderConfigured: Boolean(settings.senderEmail),
  };
}
