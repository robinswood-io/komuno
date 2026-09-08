import { lookup as dnsLookup } from 'node:dns/promises';
import type { IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
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
    return null;
  }
}

export type FederationDnsLookup = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<Array<{ address: string; family?: number }>>;

function normalizeFederationAddress(value: string): string {
  return value.toLowerCase().replace(/^\[(.*)\]$/, '$1').split('%')[0];
}

function isBlockedFederationIpv4Address(address: string): boolean {
  const octets = address.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 0 || b === 168)) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 192 && b === 88 && c === 99) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function parseIpv6Segments(address: string): number[] | null {
  const host = normalizeFederationAddress(address);
  const [leftPart, rightPart = ''] = host.split('::');
  if (host.split('::').length > 2) return null;

  const parsePart = (part: string): number[] | null => {
    if (!part) return [];
    const pieces = part.split(':');
    const segments: number[] = [];
    for (const piece of pieces) {
      if (!piece) return null;
      if (piece.includes('.')) {
        const octets = piece.split('.').map((value) => Number(value));
        if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
        segments.push((octets[0] << 8) + octets[1], (octets[2] << 8) + octets[3]);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/i.test(piece)) return null;
      segments.push(Number.parseInt(piece, 16));
    }
    return segments;
  };

  const left = parsePart(leftPart);
  const right = parsePart(rightPart);
  if (!left || !right) return null;
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  if (!host.includes('::') && missing !== 0) return null;
  return [...left, ...Array(missing).fill(0), ...right];
}

function isBlockedFederationIpv6Address(address: string): boolean {
  const host = normalizeFederationAddress(address);
  const segments = parseIpv6Segments(host);
  if (!segments || segments.length !== 8) return true;
  const [a, b] = segments;

  if (segments.every((segment) => segment === 0)) return true;
  if (segments.slice(0, 7).every((segment) => segment === 0) && segments[7] === 1) return true;
  if (segments.slice(0, 5).every((segment) => segment === 0) && segments[5] === 0xffff) return true;

  // Federation only allows ordinary global unicast IPv6. Site-local, link-local,
  // unique-local, multicast, NAT64 and other non-global prefixes stay blocked by default.
  if ((a & 0xe000) !== 0x2000) return true;

  // Documentation and transition mechanisms must not become SSRF tunnels.
  if (a === 0x2001 && b <= 0x01ff) return true; // IANA special-purpose 2001::/23
  if (a === 0x2001 && b === 0x0db8) return true; // documentation 2001:db8::/32
  if (a === 0x2002) return true; // 6to4 2002::/16
  if (a === 0x3ffe) return true; // deprecated 6bone
  if (a === 0x3fff && (b & 0xf000) === 0) return true; // documentation 3fff::/20
  if (host.startsWith('64:ff9b:')) return true; // well-known NAT64, kept explicit for auditability

  return false;
}

export function isBlockedFederationAddress(address: string): boolean {
  const host = normalizeFederationAddress(address);
  const ipVersion = isIP(host);
  if (ipVersion === 4) return isBlockedFederationIpv4Address(host);
  if (ipVersion === 6) return isBlockedFederationIpv6Address(host);
  return true;
}

function isBlockedFederationHostname(hostname: string): boolean {
  const host = normalizeFederationAddress(hostname);
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (isIP(host)) return isBlockedFederationAddress(host);
  return false;
}

export function validateFederationTargetInstanceUrl(value?: string | null): string | null {
  const normalized = normalizeFederationInstanceUrl(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (isBlockedFederationHostname(url.hostname)) return null;
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return null;
  }
}

export async function validateFederationTargetConnectionUrl(
  value?: string | null,
  lookup: FederationDnsLookup = dnsLookup as FederationDnsLookup,
): Promise<string | null> {
  const normalized = validateFederationTargetInstanceUrl(value);
  if (!normalized) return null;
  try {
    const { hostname } = new URL(normalized);
    const host = normalizeFederationAddress(hostname);
    if (isIP(host)) return normalized;
    await resolveFederationPinnedAddress(host, lookup);
    return normalized;
  } catch {
    return null;
  }
}

export async function resolveFederationPinnedAddress(
  hostname: string,
  lookup: FederationDnsLookup = dnsLookup as FederationDnsLookup,
  requestedFamily = 0,
): Promise<{ address: string; family: 4 | 6 }> {
  const host = normalizeFederationAddress(hostname);
  const literalFamily = isIP(host);
  if (literalFamily) {
    if (isBlockedFederationAddress(host)) throw new Error('Federation target resolved to a non-global address');
    if (requestedFamily && requestedFamily !== literalFamily) throw new Error('Federation target did not resolve to the requested address family');
    return { address: host, family: literalFamily as 4 | 6 };
  }

  if (isBlockedFederationHostname(host)) throw new Error('Federation target hostname is not allowed');
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('Federation target DNS resolution returned no address');
  if (addresses.some((entry) => isBlockedFederationAddress(entry.address))) {
    throw new Error('Federation target resolved to a non-global address');
  }
  const candidates = addresses
    .map((entry) => ({ address: normalizeFederationAddress(entry.address), family: (entry.family || isIP(normalizeFederationAddress(entry.address))) as 4 | 6 }))
    .filter((entry) => entry.family === 4 || entry.family === 6);
  const selected = candidates.find((entry) => !requestedFamily || entry.family === requestedFamily);
  if (!selected) throw new Error('Federation target did not resolve to the requested address family');
  return selected;
}

type NodeLookupCallback = (error: NodeJS.ErrnoException | null, address?: string | Array<{ address: string; family: 4 | 6 }>, family?: number) => void;
type NodeLookupOptions = { family?: number; all?: boolean };

export function createFederationPinnedLookup(lookup: FederationDnsLookup = dnsLookup as FederationDnsLookup) {
  return (hostname: string, options: NodeLookupOptions, callback: NodeLookupCallback) => {
    const requestedFamily = options?.family || 0;
    resolveFederationPinnedAddress(hostname, lookup, requestedFamily)
      .then((resolved) => {
        // Node autoSelectFamily requests all:true, but only the validated IP is pinned.
        if (options?.all) callback(null, [resolved]);
        else callback(null, resolved.address, resolved.family);
      }, (error) => callback(error as NodeJS.ErrnoException));
  };
}

export interface FederationHttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
}

export interface FederationHttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  signal?: AbortSignal;
  maxResponseBytes?: number;
  lookup?: FederationDnsLookup;
}

const DEFAULT_FEDERATION_MAX_RESPONSE_BYTES = 1024 * 1024;

export function requestFederationTarget(endpoint: string, options: FederationHttpRequestOptions = {}): Promise<FederationHttpResponse> {
  const parsed = new URL(endpoint);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || isBlockedFederationHostname(parsed.hostname)) {
    return Promise.reject(new Error('Federation target URL is not allowed'));
  }

  const pinnedLookup: any = createFederationPinnedLookup(options.lookup);
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_FEDERATION_MAX_RESPONSE_BYTES;

  return new Promise((resolve, reject) => {
    let settled = false;
    const rejectOnce = (error: Error, response?: IncomingMessage) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (response && !response.destroyed) response.destroy(error);
      request.destroy(error);
      reject(error);
    };

    const request = httpsRequest(parsed, {
      method: options.method || 'GET',
      headers: options.headers,
      lookup: pinnedLookup,
    }, (response) => {
      response.on('error', (error: Error) => rejectOnce(error, response));
      response.on('aborted', () => rejectOnce(new Error('Federation response aborted'), response));
      response.on('close', () => {
        if (!settled) rejectOnce(new Error('Federation response closed before completion'), response);
      });
      if ((response.statusCode || 0) >= 300 && (response.statusCode || 0) < 400) {
        rejectOnce(new Error('Federation redirects are not allowed'), response);
        return;
      }

      const chunks: Buffer[] = [];
      let received = 0;
      response.on('data', (chunk: Buffer | string) => {
        if (settled) return;
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buffer.length;
        if (received > maxResponseBytes) {
          rejectOnce(new Error('Federation response body exceeded the allowed size'), response);
          return;
        }
        chunks.push(buffer);
      });
      response.on('end', () => {
        if (settled) return;
        settled = true;
        cleanup();
        const body = Buffer.concat(chunks).toString('utf8');
        const status = response.statusCode || 0;
        resolve({
          ok: status >= 200 && status < 300,
          status,
          statusText: response.statusMessage || '',
          text: async () => body,
        });
      });
    });

    const onAbort = () => rejectOnce(new Error('Federation request aborted'));
    const cleanup = () => options.signal?.removeEventListener('abort', onAbort);

    request.on('error', rejectOnce);
    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (options.signal?.aborted) {
      onAbort();
      return;
    }
    if (options.body !== undefined) request.write(options.body);
    request.end();
  });
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
