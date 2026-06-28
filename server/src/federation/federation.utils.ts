import { timingSafeEqual } from 'crypto';

export const AUTO_SHARE_EVENTS_TO_PARENT_PERMISSION = 'autoShareEventsToParent';

export function safeCompareFederationToken(expected: string | null | undefined, received: string | undefined): boolean {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
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

export function withoutFederationRelationSecret<T extends { federationToken?: string | null }>(relation: T) {
  const { federationToken, ...safeRelation } = relation;
  return {
    ...safeRelation,
    hasFederationToken: Boolean(federationToken),
  };
}
