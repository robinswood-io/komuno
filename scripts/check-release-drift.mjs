#!/usr/bin/env node

const DEFAULT_URLS = ['https://cjd80.fr', 'https://cjd-hdf.fr', 'https://repicardie.fr'];
const urls = (process.env.RELEASE_DRIFT_URLS || DEFAULT_URLS.join(','))
  .split(',')
  .map((value) => value.trim().replace(/\/$/, ''))
  .filter(Boolean);
const timeoutMs = Number(process.env.RELEASE_DRIFT_TIMEOUT_MS || 10_000);

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${text.slice(0, 250)}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchInstance(baseUrl) {
  const endpoints = ['/api/version', '/api/health'];
  const errors = [];
  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJsonWithTimeout(`${baseUrl}${endpoint}`);
      const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
      return {
        baseUrl,
        endpoint,
        ok: true,
        version: data.version ?? null,
        release: data.release ?? data.version ?? null,
        revision: data.revision ?? null,
        shortRevision: data.shortRevision ?? (data.revision ? String(data.revision).slice(0, 7) : null),
      };
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { baseUrl, ok: false, errors };
}

const results = await Promise.all(urls.map(fetchInstance));

console.log('Release drift check');
console.log('===================');
for (const result of results) {
  if (!result.ok) {
    console.log(`❌ ${result.baseUrl} unreachable — ${result.errors.join(' | ')}`);
  } else {
    console.log(`✅ ${result.baseUrl} ${result.endpoint} release=${result.release ?? 'n/a'} revision=${result.shortRevision ?? result.revision ?? 'n/a'}`);
  }
}

const failures = results.filter((result) => !result.ok);
if (failures.length > 0) {
  console.error(`\n${failures.length} instance(s) unreachable.`);
  process.exit(1);
}

const comparable = results.map((result) => ({
  baseUrl: result.baseUrl,
  release: result.release ?? 'unknown',
  revision: result.revision ?? result.shortRevision ?? 'unknown',
}));
const expected = comparable[0];
const drift = comparable.filter((result) => result.release !== expected.release || result.revision !== expected.revision);

if (drift.length > 0) {
  console.error('\n❌ Release drift detected');
  console.error(`Reference: ${expected.baseUrl} release=${expected.release} revision=${expected.revision}`);
  for (const result of drift) {
    console.error(`Drift:     ${result.baseUrl} release=${result.release} revision=${result.revision}`);
  }
  process.exit(1);
}

console.log(`\n✅ No drift: release=${expected.release} revision=${expected.revision}`);
