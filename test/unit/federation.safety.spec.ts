import { describe, expect, it } from 'vitest';

import {
  decryptFederationToken,
  encryptFederationToken,
  federationTokenFingerprintFromHash,
  hashFederationToken,
  isAutoShareEventsToParentEnabledForRelation,
  isFederationOrganizationOnInstance,
  isRemoteFederationInstance,
  normalizeFederationInstanceUrl,
  safeCompareFederationRelationSecret,
  safeCompareFederationToken,
  safeCompareFederationTokenHash,
  withoutFederationRelationSecret,
} from '../../server/src/federation/federation.utils';

describe('Fédération — invariants de sécurité sans DB', () => {
  it('compare les tokens uniquement si longueur et contenu correspondent', () => {
    expect(safeCompareFederationToken('token-secret-123', 'token-secret-123')).toBe(true);
    expect(safeCompareFederationToken('token-secret-123', 'token-secret-124')).toBe(false);
    expect(safeCompareFederationToken('token-secret-123', 'short')).toBe(false);
    expect(safeCompareFederationToken(null, 'token-secret-123')).toBe(false);
    expect(safeCompareFederationToken('token-secret-123', undefined)).toBe(false);
  });

  it('valide les tokens hashés sans exposer le secret brut', () => {
    const token = 'komuno_rotation_secret_1234567890';
    const hash = hashFederationToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
    expect(federationTokenFingerprintFromHash(hash)).toBe(hash.slice(0, 12).toUpperCase());
    expect(safeCompareFederationTokenHash(hash, token)).toBe(true);
    expect(safeCompareFederationTokenHash(hash, `${token}-wrong`)).toBe(false);
    expect(safeCompareFederationRelationSecret({ federationToken: 'legacy-clear', federationTokenHash: hash }, token)).toBe(true);
    expect(safeCompareFederationRelationSecret({ federationToken: 'legacy-clear', federationTokenHash: hash }, 'legacy-clear')).toBe(false);
    expect(safeCompareFederationRelationSecret({ federationToken: 'legacy-clear', federationTokenHash: null }, 'legacy-clear')).toBe(true);
  });

  it('chiffre les tokens sortants hors DB et les déchiffre uniquement avec la clé applicative', () => {
    const env = { FEDERATION_TOKEN_ENCRYPTION_KEY: 'x'.repeat(48) } as NodeJS.ProcessEnv;
    const token = 'komuno_shared_secret_for_outbound_sync';
    const encrypted = encryptFederationToken(token, env);

    expect(encrypted).not.toBeNull();
    expect(encrypted?.encrypted).not.toContain(token);
    expect(encrypted?.keyId).toHaveLength(12);
    expect(decryptFederationToken(encrypted!.encrypted, env)).toBe(token);
    expect(decryptFederationToken(encrypted!.encrypted, { FEDERATION_TOKEN_ENCRYPTION_KEY: 'y'.repeat(48) } as NodeJS.ProcessEnv)).toBeNull();
  });

  it('normalise les URLs d’instance sans inférer de relation métier', () => {
    expect(normalizeFederationInstanceUrl('CJD80.FR/')).toBe('https://cjd80.fr');
    expect(normalizeFederationInstanceUrl('https://CJD-HDF.fr/path/?x=1#hash')).toBe('https://cjd-hdf.fr/path');
    expect(normalizeFederationInstanceUrl(null)).toBeNull();
  });

  it('détecte une instance distante seulement quand elle diffère de l’instance courante et de la source', () => {
    expect(isRemoteFederationInstance('https://cjd-hdf.fr', null, 'https://cjd80.fr')).toBe(true);
    expect(isRemoteFederationInstance('https://cjd80.fr', null, 'https://cjd80.fr')).toBe(false);
    expect(isRemoteFederationInstance('https://source.example', 'https://source.example', 'https://cjd80.fr')).toBe(false);
    expect(isRemoteFederationInstance(null, null, 'https://cjd80.fr')).toBe(false);
  });

  it('ne considère jamais un domaine voisin comme local par simple ressemblance', () => {
    expect(isFederationOrganizationOnInstance({ instanceUrl: 'https://cjd-hdf.fr', domain: 'cjd-hdf.fr' }, 'https://cjd80.fr')).toBe(false);
    expect(isFederationOrganizationOnInstance({ instanceUrl: null, domain: 'repicardie.fr' }, 'https://cjd80.fr')).toBe(false);
    expect(isFederationOrganizationOnInstance({ instanceUrl: null, domain: 'cjd80.fr' }, 'https://cjd80.fr')).toBe(true);
  });

  it('garde l’auto-share actif par défaut mais désactivable explicitement par permission', () => {
    expect(isAutoShareEventsToParentEnabledForRelation({ permissions: {} })).toBe(true);
    expect(isAutoShareEventsToParentEnabledForRelation({ permissions: { events: false } })).toBe(false);
    expect(isAutoShareEventsToParentEnabledForRelation({ permissions: { syndication: false } })).toBe(false);
    expect(isAutoShareEventsToParentEnabledForRelation({ permissions: { autoShareEventsToParent: false } })).toBe(false);
  });

  it('ne renvoie jamais federationToken dans les objets exposés aux admins', () => {
    const safe = withoutFederationRelationSecret({
      id: 'relation-1',
      status: 'active',
      federationToken: 'super-secret-token',
    });

    expect(safe).toEqual({
      id: 'relation-1',
      status: 'active',
      hasFederationToken: true,
      hasOutboundFederationToken: true,
      federationTokenFingerprint: expect.any(String),
      federationTokenEncryptedAt: null,
    });
    expect(safe.federationTokenFingerprint).toHaveLength(12);
    expect(Object.prototype.hasOwnProperty.call(safe, 'federationToken')).toBe(false);
  });

  it('ne renvoie jamais federationTokenHash dans les objets exposés aux admins', () => {
    const tokenHash = hashFederationToken('hash-only-secret');
    const safe = withoutFederationRelationSecret({
      id: 'relation-2',
      federationToken: null,
      federationTokenHash: tokenHash,
      federationTokenFingerprint: null,
    });

    expect(safe.hasFederationToken).toBe(true);
    expect(safe.federationTokenFingerprint).toBe(tokenHash.slice(0, 12).toUpperCase());
    expect(Object.prototype.hasOwnProperty.call(safe, 'federationToken')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(safe, 'federationTokenHash')).toBe(false);
  });

  it('ne renvoie jamais le ciphertext du vault dans les objets exposés aux admins', () => {
    const tokenHash = hashFederationToken('encrypted-secret');
    const safe = withoutFederationRelationSecret({
      id: 'relation-3',
      federationToken: null,
      federationTokenHash: tokenHash,
      federationTokenEncrypted: 'v1:iv:tag:ciphertext',
      federationTokenEncryptionKeyId: 'ABCDEF123456',
      federationTokenEncryptedAt: new Date('2026-06-28T19:06:00.000Z'),
    });

    expect(safe.hasFederationToken).toBe(true);
    expect(safe.hasOutboundFederationToken).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(safe, 'federationTokenEncrypted')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(safe, 'federationTokenEncryptionKeyId')).toBe(false);
  });
});
