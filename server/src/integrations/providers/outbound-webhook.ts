import { BadRequestException } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { z } from 'zod';
import type { FetchLike } from './helloasso';

const outboundWebhookSettingsSchema = z.object({
  events: z.array(z.string().min(1).max(200)).default(['*']),
  timeoutMs: z.coerce.number().int().min(1000).max(30000).default(5000),
  maxAttempts: z.coerce.number().int().min(1).max(10).default(3),
});

export type OutboundWebhookSettings = z.infer<typeof outboundWebhookSettingsSchema>;

export type OutboundWebhookSecret = {
  targetUrl: string;
  signingSecret: string;
  secretMode: 'json' | 'url_as_secret';
};

export type OutboundWebhookEvent = {
  id?: string;
  type: string;
  createdAt?: string;
  data?: Record<string, unknown>;
};

export function parseOutboundWebhookSettings(settings: Record<string, unknown> = {}): OutboundWebhookSettings {
  try {
    return outboundWebhookSettingsSchema.parse(settings ?? {});
  } catch {
    throw new BadRequestException('Configuration webhook sortant invalide: events, timeoutMs ou maxAttempts incorrects.');
  }
}

function validateTargetUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('URL webhook sortant invalide');
  }
  if (url.protocol !== 'https:') throw new BadRequestException('URL webhook sortant invalide: HTTPS obligatoire');
  if (!url.hostname || ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
    throw new BadRequestException('URL webhook sortant invalide: cible locale interdite');
  }
  return url.toString();
}

export function parseOutboundWebhookSecret(secret: string | null | undefined): OutboundWebhookSecret {
  if (!secret) throw new BadRequestException('Secret webhook sortant absent ou indéchiffrable');
  const trimmed = secret.trim();
  if (trimmed.startsWith('{')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new BadRequestException('Secret webhook sortant JSON invalide');
    }
    const schema = z.object({
      targetUrl: z.string().url(),
      signingSecret: z.string().min(16).max(5000),
    });
    const value = schema.parse(parsed);
    return { targetUrl: validateTargetUrl(value.targetUrl), signingSecret: value.signingSecret, secretMode: 'json' };
  }
  const targetUrl = validateTargetUrl(trimmed);
  return { targetUrl, signingSecret: trimmed, secretMode: 'url_as_secret' };
}

export function eventMatchesWebhook(settings: OutboundWebhookSettings, eventType: string) {
  return settings.events.includes('*') || settings.events.includes(eventType);
}

export function buildOutboundWebhookPayload(event: OutboundWebhookEvent) {
  return {
    id: event.id ?? randomUUID(),
    type: event.type,
    createdAt: event.createdAt ?? new Date().toISOString(),
    data: event.data ?? {},
  };
}

export function signOutboundWebhook(body: string, signingSecret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac('sha256', signingSecret).update(`${timestamp}.${body}`).digest('hex');
  return { timestamp, header: `t=${timestamp},v1=${signature}` };
}

export async function deliverOutboundWebhook(options: {
  targetUrl: string;
  signingSecret: string;
  eventType: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}) {
  const fetchImpl = options.fetchImpl ?? fetch as FetchLike;
  const body = JSON.stringify(options.payload);
  const signature = signOutboundWebhook(body, options.signingSecret);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);
  try {
    const response = await fetchImpl(options.targetUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Komuno-Outbound-Webhooks/1.0',
        'x-komuno-event': options.eventType,
        'x-komuno-delivery': String(options.payload.id ?? ''),
        'x-komuno-signature': signature.header,
      },
      body,
      signal: controller.signal,
    });
    const responseBody = await (response.text?.() ?? Promise.resolve('')).catch(() => '');
    return {
      ok: response.ok,
      status: response.status,
      responseBody: responseBody.slice(0, 2000),
    };
  } finally {
    clearTimeout(timeout);
  }
}
