#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const matrixPath = resolve(root, 'tests/e2e/association-journey-matrix.json');
const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
const expected = new Set(['instance-first-admin','member','idea','event','membership-fee','loan','form','permissions','backup-restore','keyboard-mobile']);
const seen = new Set();
const errors = [];
for (const journey of matrix.journeys ?? []) {
  if (!expected.has(journey.id)) errors.push(`parcours inattendu: ${journey.id}`);
  if (seen.has(journey.id)) errors.push(`parcours dupliqué: ${journey.id}`);
  seen.add(journey.id);
  for (const kind of ['nominal', 'failure']) {
    if (!Array.isArray(journey[kind]) || journey[kind].length === 0) errors.push(`${journey.id}: scénario ${kind} absent`);
    for (const reference of journey[kind] ?? []) {
      try { await access(resolve(root, reference)); } catch { errors.push(`${journey.id}: référence absente ${reference}`); }
    }
  }
  for (const gate of ['ci', 'staging']) if (!journey.runOn?.includes(gate)) errors.push(`${journey.id}: étape ${gate} absente`);
}
for (const id of expected) if (!seen.has(id)) errors.push(`parcours manquant: ${id}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('ASSOCIATION_JOURNEY_MATRIX_OK');
