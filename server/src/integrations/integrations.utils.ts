import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const INTEGRATION_SECRET_AAD = Buffer.from('komuno:integration-secret:v1');
const INTEGRATION_SECRET_VERSION = 'v1';

export function getIntegrationSecretEncryptionMaterial(env: NodeJS.ProcessEnv = process.env): { key: Buffer; keyId: string; source: string } | null {
  const candidates: Array<[string, string | undefined]> = [
    ['INTEGRATION_SECRET_ENCRYPTION_KEY', env.INTEGRATION_SECRET_ENCRYPTION_KEY],
    ['FEDERATION_TOKEN_ENCRYPTION_KEY', env.FEDERATION_TOKEN_ENCRYPTION_KEY],
    ['SESSION_SECRET', env.SESSION_SECRET],
    ['JWT_SECRET', env.JWT_SECRET],
    ['AUTH_SECRET', env.AUTH_SECRET],
    ['NEXTAUTH_SECRET', env.NEXTAUTH_SECRET],
  ];

  const candidate = candidates.find(([, value]) => value && value.length >= 32);
  if (!candidate) return null;
  const [source, value] = candidate as [string, string];
  const key = createHash('sha256').update(`komuno-integration-secret:${value}`, 'utf8').digest();
  const keyId = createHash('sha256').update(`komuno-integration-key-id:${value}`, 'utf8').digest('hex').slice(0, 12).toUpperCase();
  return { key, keyId, source };
}

export function hashIntegrationSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function integrationSecretFingerprint(secret: string | null | undefined): string | null {
  return secret ? hashIntegrationSecret(secret).slice(0, 12).toUpperCase() : null;
}

export function encryptIntegrationSecret(secret: string, env: NodeJS.ProcessEnv = process.env): { encrypted: string; keyId: string } | null {
  const material = getIntegrationSecretEncryptionMaterial(env);
  if (!material) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', material.key, iv);
  cipher.setAAD(INTEGRATION_SECRET_AAD);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: [
      INTEGRATION_SECRET_VERSION,
      iv.toString('base64url'),
      authTag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':'),
    keyId: material.keyId,
  };
}

export function decryptIntegrationSecret(encryptedSecret: string, env: NodeJS.ProcessEnv = process.env): string | null {
  try {
    const material = getIntegrationSecretEncryptionMaterial(env);
    if (!material) return null;
    const [version, ivPart, tagPart, encryptedPart] = encryptedSecret.split(':');
    if (version !== INTEGRATION_SECRET_VERSION || !ivPart || !tagPart || !encryptedPart) return null;
    const decipher = createDecipheriv('aes-256-gcm', material.key, Buffer.from(ivPart, 'base64url'));
    decipher.setAAD(INTEGRATION_SECRET_AAD);
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

export function sanitizeIntegrationSettings(settings: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const input = settings ?? {};
  return Object.fromEntries(Object.entries(input).filter(([key]) => !/secret|token|password|api[_-]?key|client[_-]?secret/i.test(key)));
}

export function withoutIntegrationSecret<T extends {
  secretEncryptedPayload?: string | null;
  secretEncryptionKeyId?: string | null;
  secretEncrypted?: boolean | null;
  settings?: Record<string, unknown> | null;
}>(account: T) {
  const { secretEncryptedPayload, secretEncryptionKeyId, settings, ...safeAccount } = account;
  return {
    ...safeAccount,
    settings: sanitizeIntegrationSettings(settings),
    hasSecret: Boolean(secretEncryptedPayload || account.secretEncrypted),
  };
}

function escapeIcsText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldIcsLine(line: string): string {
  const limit = 75;
  if (line.length <= limit) return line;
  const chunks: string[] = [];
  let current = line;
  while (current.length > limit) {
    chunks.push(current.slice(0, limit));
    current = current.slice(limit);
  }
  chunks.push(current);
  return chunks.map((chunk, index) => index === 0 ? chunk : ` ${chunk}`).join('\r\n');
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export type IcsEventInput = {
  id: string;
  title: string;
  description?: string | null;
  date: Date | string;
  location?: string | null;
  updatedAt?: Date | string | null;
  url?: string | null;
};

export function buildIcsCalendar(events: IcsEventInput[], options: { calendarName?: string; prodId?: string } = {}): string {
  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${options.prodId ?? '-//Komuno//Events Calendar//FR'}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.calendarName ?? 'Événements Komuno')}`,
  ];

  for (const event of events) {
    const startsAt = new Date(event.date);
    if (Number.isNaN(startsAt.getTime())) continue;
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    const updatedAt = event.updatedAt ? new Date(event.updatedAt) : now;
    lines.push(
      'BEGIN:VEVENT',
      `UID:komuno-event-${event.id}@komuno`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(startsAt)}`,
      `DTEND:${formatIcsDate(endsAt)}`,
      `LAST-MODIFIED:${formatIcsDate(Number.isNaN(updatedAt.getTime()) ? now : updatedAt)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    if (event.url) lines.push(`URL:${escapeIcsText(event.url)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
