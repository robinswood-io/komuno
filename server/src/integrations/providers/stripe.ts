import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { FetchLike } from './helloasso';

const stripeSettingsSchema = z.object({
  baseUrl: z.string().url().default('https://api.stripe.com'),
  mode: z.enum(['test', 'live']).default('test'),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  syncProductsEnabled: z.boolean().default(true),
  syncPricesEnabled: z.boolean().default(true),
  syncCustomersEnabled: z.boolean().default(false),
});

export type StripeSettings = z.infer<typeof stripeSettingsSchema>;

export function parseStripeSettings(settings: Record<string, unknown>): StripeSettings {
  try {
    const parsed = stripeSettingsSchema.parse(settings ?? {});
    const url = new URL(parsed.baseUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'api.stripe.com') throw new Error('invalid_base_url');
    return { ...parsed, baseUrl: parsed.baseUrl.replace(/\/$/, '') };
  } catch {
    throw new BadRequestException('Configuration Stripe invalide: baseUrl doit être https://api.stripe.com.');
  }
}

function ensureApiKey(apiKey: string | null | undefined) {
  if (!apiKey) throw new BadRequestException('Clé API Stripe absente ou indéchiffrable');
  if (!/^(sk|rk)_(test|live)_/.test(apiKey)) {
    throw new BadRequestException('Clé API Stripe invalide: utilisez une clé secrète ou restreinte serveur sk_/rk_.');
  }
  return apiKey;
}

function expectedModeFromKey(apiKey: string): 'test' | 'live' {
  return apiKey.includes('_live_') ? 'live' : 'test';
}

function buildUrl(baseUrl: string, path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function stripeGet(options: {
  settings: StripeSettings;
  apiKey: string;
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  fetchImpl?: FetchLike;
}) {
  const fetchImpl = options.fetchImpl ?? fetch as FetchLike;
  const auth = Buffer.from(`${options.apiKey}:`, 'utf8').toString('base64');
  const response = await fetchImpl(buildUrl(options.settings.baseUrl, options.path, options.params), {
    method: 'GET',
    headers: { accept: 'application/json', authorization: `Basic ${auth}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message ? `: ${data.error.message}` : '';
    throw new BadRequestException(`Appel Stripe échoué (${response.status} ${response.statusText})${message}`);
  }
  return data;
}

function accountSummary(account: any) {
  return {
    id: account?.id ?? null,
    country: account?.country ?? null,
    defaultCurrency: account?.default_currency ?? null,
    chargesEnabled: Boolean(account?.charges_enabled),
    payoutsEnabled: Boolean(account?.payouts_enabled),
    detailsSubmitted: Boolean(account?.details_submitted),
    businessType: account?.business_type ?? null,
  };
}

function listData(payload: any): any[] {
  return Array.isArray(payload?.data) ? payload.data : [];
}

function productSummary(product: any) {
  return {
    id: product?.id ?? null,
    name: product?.name ?? null,
    active: Boolean(product?.active),
    type: product?.type ?? null,
    created: product?.created ?? null,
  };
}

function priceSummary(price: any) {
  return {
    id: price?.id ?? null,
    product: typeof price?.product === 'string' ? price.product : price?.product?.id ?? null,
    active: Boolean(price?.active),
    currency: price?.currency ?? null,
    unitAmount: typeof price?.unit_amount === 'number' ? price.unit_amount : null,
    recurringInterval: price?.recurring?.interval ?? null,
    type: price?.type ?? null,
  };
}

export async function testStripeConnection(options: {
  settings: Record<string, unknown>;
  apiKey: string | null | undefined;
  fetchImpl?: FetchLike;
}) {
  const settings = parseStripeSettings(options.settings);
  const apiKey = ensureApiKey(options.apiKey);
  const keyMode = expectedModeFromKey(apiKey);
  if (settings.mode !== keyMode) throw new BadRequestException(`Mode Stripe incohérent: clé ${keyMode}, configuration ${settings.mode}`);
  const account = await stripeGet({ settings, apiKey, path: '/v1/account', fetchImpl: options.fetchImpl });
  return {
    baseUrl: settings.baseUrl,
    mode: settings.mode,
    account: accountSummary(account),
    verifiedScopes: ['account_read'],
  };
}

export async function syncStripeCatalog(options: {
  settings: Record<string, unknown>;
  apiKey: string | null | undefined;
  fetchImpl?: FetchLike;
}) {
  const settings = parseStripeSettings(options.settings);
  const apiKey = ensureApiKey(options.apiKey);
  const keyMode = expectedModeFromKey(apiKey);
  if (settings.mode !== keyMode) throw new BadRequestException(`Mode Stripe incohérent: clé ${keyMode}, configuration ${settings.mode}`);

  const metadata: Record<string, unknown> = {
    baseUrl: settings.baseUrl,
    mode: settings.mode,
    productsSyncMode: settings.syncProductsEnabled ? 'metadata_only' : 'disabled',
    pricesSyncMode: settings.syncPricesEnabled ? 'metadata_only' : 'disabled',
    customersSyncMode: settings.syncCustomersEnabled ? 'count_only_no_customer_payload' : 'disabled',
  };

  if (settings.syncProductsEnabled) {
    const productsPayload = await stripeGet({ settings, apiKey, path: '/v1/products', params: { limit: settings.pageSize }, fetchImpl: options.fetchImpl });
    const products = listData(productsPayload).map(productSummary);
    metadata.productsCount = products.length;
    metadata.productsHasMore = Boolean(productsPayload?.has_more);
    metadata.products = products;
  }

  if (settings.syncPricesEnabled) {
    const pricesPayload = await stripeGet({ settings, apiKey, path: '/v1/prices', params: { limit: settings.pageSize }, fetchImpl: options.fetchImpl });
    const prices = listData(pricesPayload).map(priceSummary);
    metadata.pricesCount = prices.length;
    metadata.pricesHasMore = Boolean(pricesPayload?.has_more);
    metadata.prices = prices;
  }

  if (settings.syncCustomersEnabled) {
    const customersPayload = await stripeGet({ settings, apiKey, path: '/v1/customers', params: { limit: Math.min(settings.pageSize, 25) }, fetchImpl: options.fetchImpl });
    metadata.customersCount = listData(customersPayload).length;
    metadata.customersHasMore = Boolean(customersPayload?.has_more);
  }

  return metadata;
}
