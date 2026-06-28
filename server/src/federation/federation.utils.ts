import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'crypto';

export const AUTO_SHARE_EVENTS_TO_PARENT_PERMISSION = 'autoShareEventsToParent';

export function safeCompareFederationToken(expected: string | null | undefined, received: string | undefined): boolean {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function generateFederationToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashFederationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function federationTokenFingerprintFromHash(hash: string | null | undefined): string | null {
  return hash ? hash.slice(0, 12).toUpperCase() : null;
}

export function federationTokenFingerprint(token: string | null | undefined): string | null {
  return token ? federationTokenFingerprintFromHash(hashFederationToken(token)) : null;
}

export function safeCompareFederationTokenHash(expectedHash: string | null | undefined, received: string | undefined): boolean {
  if (!expectedHash || !received) return false;
  const receivedHash = hashFederationToken(received);
  return safeCompareFederationToken(expectedHash, receivedHash);
}

export function safeCompareFederationRelationSecret(
  relation: { federationToken?: string | null; federationTokenHash?: string | null },
  received: string | undefined,
): boolean {
  if (relation.federationTokenHash) return safeCompareFederationTokenHash(relation.federationTokenHash, received);
  return safeCompareFederationToken(relation.federationToken, received);
}

const FEDERATION_TOKEN_ENCRYPTION_AAD = Buffer.from('komuno:federation-token:v1');
const FEDERATION_TOKEN_ENCRYPTION_VERSION = 'v1';

export function getFederationTokenEncryptionMaterial(env: NodeJS.ProcessEnv = process.env): { key: Buffer; keyId: string; source: string } | null {
  const candidates: Array<[string, string | undefined]> = [
    ['FEDERATION_TOKEN_ENCRYPTION_KEY', env.FEDERATION_TOKEN_ENCRYPTION_KEY],
    ['SESSION_SECRET', env.SESSION_SECRET],
    ['JWT_SECRET', env.JWT_SECRET],
    ['AUTH_SECRET', env.AUTH_SECRET],
    ['NEXTAUTH_SECRET', env.NEXTAUTH_SECRET],
  ];

  const candidate = candidates.find(([, value]) => value && value.length >= 32);
  if (!candidate) return null;
  const [source, value] = candidate as [string, string];
  const key = createHash('sha256').update(`komuno-federation-token:${value}`, 'utf8').digest();
  const keyId = createHash('sha256').update(`komuno-federation-key-id:${value}`, 'utf8').digest('hex').slice(0, 12).toUpperCase();
  return { key, keyId, source };
}

export function encryptFederationToken(token: string, env: NodeJS.ProcessEnv = process.env): { encrypted: string; keyId: string } | null {
  const material = getFederationTokenEncryptionMaterial(env);
  if (!material) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', material.key, iv);
  cipher.setAAD(FEDERATION_TOKEN_ENCRYPTION_AAD);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: [
      FEDERATION_TOKEN_ENCRYPTION_VERSION,
      iv.toString('base64url'),
      authTag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':'),
    keyId: material.keyId,
  };
}

export function decryptFederationToken(encryptedToken: string, env: NodeJS.ProcessEnv = process.env): string | null {
  try {
    const material = getFederationTokenEncryptionMaterial(env);
    if (!material) return null;
    const [version, ivPart, tagPart, encryptedPart] = encryptedToken.split(':');
    if (version !== FEDERATION_TOKEN_ENCRYPTION_VERSION || !ivPart || !tagPart || !encryptedPart) return null;
    const decipher = createDecipheriv('aes-256-gcm', material.key, Buffer.from(ivPart, 'base64url'));
    decipher.setAAD(FEDERATION_TOKEN_ENCRYPTION_AAD);
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

export function normalizeFederationInstanceUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return value.replace(/\/$/, '').toLowerCase();
  }
}

export function getCurrentFederationInstanceUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  return normalizeFederationInstanceUrl(
    env.PUBLIC_APP_URL
    || env.NEXT_PUBLIC_APP_URL
    || env.APP_URL
    || (env.DOMAIN ? `https://${env.DOMAIN}` : null),
  );
}

export function isRemoteFederationInstance(
  targetInstanceUrl?: string | null,
  sourceInstanceUrl?: string | null,
  currentInstanceUrl: string | null = getCurrentFederationInstanceUrl(),
): boolean {
  const target = normalizeFederationInstanceUrl(targetInstanceUrl);
  if (!target) return false;
  const current = normalizeFederationInstanceUrl(currentInstanceUrl);
  if (current && target === current) return false;
  const source = normalizeFederationInstanceUrl(sourceInstanceUrl);
  if (source && target === source) return false;
  return true;
}

export function hostFromFederationUrl(value?: string | null): string | null {
  const normalized = normalizeFederationInstanceUrl(value);
  if (!normalized) return null;
  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isFederationOrganizationOnInstance(
  organization: { instanceUrl?: string | null; domain?: string | null },
  currentInstanceUrl: string | null = getCurrentFederationInstanceUrl(),
): boolean {
  const currentUrl = normalizeFederationInstanceUrl(currentInstanceUrl);
  const currentHost = hostFromFederationUrl(currentUrl);
  const organizationUrl = normalizeFederationInstanceUrl(organization.instanceUrl || (organization.domain ? `https://${organization.domain}` : null));
  const organizationHost = hostFromFederationUrl(organizationUrl);
  const domain = organization.domain?.toLowerCase().replace(/^www\./, '') ?? null;

  if (currentUrl && organizationUrl && currentUrl === organizationUrl) return true;
  if (currentHost && organizationHost && currentHost.replace(/^www\./, '') === organizationHost.replace(/^www\./, '')) return true;
  if (currentHost && domain && currentHost.replace(/^www\./, '') === domain) return true;
  return false;
}

export function federationRelationPermissions(relation: { permissions?: unknown }): Record<string, unknown> {
  return (relation.permissions ?? {}) as Record<string, unknown>;
}

export function isAutoShareEventsToParentEnabledForRelation(relation: { permissions?: unknown }): boolean {
  const permissions = federationRelationPermissions(relation);
  return permissions.events !== false
    && permissions.syndication !== false
    && permissions[AUTO_SHARE_EVENTS_TO_PARENT_PERMISSION] !== false;
}

export function withoutFederationRelationSecret<T extends {
  federationToken?: string | null;
  federationTokenHash?: string | null;
  federationTokenFingerprint?: string | null;
  federationTokenRotatedAt?: Date | string | null;
  federationTokenEncrypted?: string | null;
  federationTokenEncryptionKeyId?: string | null;
  federationTokenEncryptedAt?: Date | string | null;
}>(relation: T) {
  const { federationToken, federationTokenHash, federationTokenEncrypted, federationTokenEncryptionKeyId, ...safeRelation } = relation;
  return {
    ...safeRelation,
    hasFederationToken: Boolean(federationToken || federationTokenHash),
    hasOutboundFederationToken: Boolean(federationToken || federationTokenEncrypted),
    federationTokenFingerprint: relation.federationTokenFingerprint ?? federationTokenFingerprintFromHash(federationTokenHash) ?? federationTokenFingerprint(federationToken),
    federationTokenEncryptedAt: relation.federationTokenEncryptedAt ?? null,
  };
}
