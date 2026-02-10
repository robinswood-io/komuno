#!/usr/bin/env bun

/**
 * validate-theme.ts - Validation Design System Robinswood
 *
 * Scanne le codebase pour detecter les couleurs hardcodees.
 * Implementé selon Rule 29: 29-design-system-theming.md
 *
 * Usage:
 *   bun scripts/validate-theme.ts
 *   npx tsx scripts/validate-theme.ts  (fallback)
 *
 * Exit codes:
 *   0 = Pas de violations (ou warnings uniquement)
 *   1 = Erreurs detectees (CI fail)
 *
 * Reference: https://github.com/robinswood/rulebook-ai
 * Rule: 29-design-system-theming.md
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  file: string;
  line: number;
  issue: string;
  severity: 'error' | 'warning';
}

const results: ValidationResult[] = [];

// ============================================================
// CONFIGURATION - CJD80
// ============================================================

/** Dossiers a scanner (relatifs a la racine du projet) */
const SCAN_DIRS: string[] = [
  'app',         // Next.js App Router
  'components',  // Composants React
  'lib',         // Utilitaires
  'hooks',       // Custom hooks
];

/** Fichiers/patterns a exclure du scan */
const EXCLUDED_FILES: string[] = [
  'globals.css',
  'index.css',
  'tailwind.config.ts',
  'tailwind.config.js',
  'validate-theme.ts',
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  '.stories.tsx',
  '.stories.ts',
];

// ============================================================
// PATTERNS DE DETECTION
// ============================================================

const HARDCODED_PATTERNS = [
  // Couleurs hex (#fff, #ffffff, #rrggbbaa)
  {
    pattern: /#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?(?![0-9a-fA-F])/g,
    name: 'Hex color',
    severity: 'error' as const,
  },
  {
    pattern: /#[0-9a-fA-F]{3}(?![0-9a-fA-F])/g,
    name: 'Short hex color',
    severity: 'error' as const,
  },

  // Couleurs RGB/RGBA (exclure les shadows qui utilisent rgba legitimement)
  {
    pattern: /(?<!shadow.*)\brgb\(/g,
    name: 'RGB color',
    severity: 'error' as const,
  },
  {
    pattern: /(?<!shadow.*)\brgba\(/g,
    name: 'RGBA color',
    severity: 'error' as const,
  },

  // Classes Tailwind de couleurs hardcodees (familles de couleurs)
  {
    pattern:
      /\b(bg|text|border|ring|outline|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{1,3}\b/g,
    name: 'Tailwind color class',
    severity: 'error' as const,
  },

  // Classes Tailwind white/black (incluant variantes avec opacite)
  {
    pattern: /\b(bg|text|border)-(white|black)(\/[0-9]{1,3})?\b/g,
    name: 'Tailwind white/black class',
    severity: 'error' as const,
  },

  // Arbitrary Tailwind values avec couleurs (bg-[#xxx], text-[#xxx], etc.)
  {
    pattern: /\b(bg|text|border|ring|outline|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g,
    name: 'Arbitrary Tailwind color value',
    severity: 'error' as const,
  },
  {
    pattern: /\b(bg|text|border|ring|outline|fill|stroke)-\[rgb/g,
    name: 'Arbitrary Tailwind RGB value',
    severity: 'error' as const,
  },

  // HSL hardcode (hors CSS variables - warning car parfois legitime dans globals.css)
  {
    pattern: /(?<!var\(--[^)]*)\bhsl\(/g,
    name: 'HSL color (should be in CSS variable)',
    severity: 'warning' as const,
  },

  // Opacite Tailwind hardcodee (legacy pattern)
  {
    pattern: /\b(bg|text|border)-opacity-[0-9]{1,3}\b/g,
    name: 'Tailwind opacity class (use CSS variables with alpha instead)',
    severity: 'error' as const,
  },
];

// ============================================================
// SCANNER
// ============================================================

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDED_FILES.some((excluded) => filePath.includes(excluded));
}

function scanFile(filePath: string): void {
  if (shouldExcludeFile(filePath)) return;

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Ignorer les commentaires
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

    // Ignorer les selecteurs Recharts (classes CSS appliquees via Tailwind)
    if (/\[&_\.recharts-[\w-]+\]:/.test(line)) return;

    HARDCODED_PATTERNS.forEach(({ pattern, name, severity }) => {
      // Reset regex lastIndex pour chaque ligne
      pattern.lastIndex = 0;
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        results.push({
          file: filePath,
          line: index + 1,
          issue: `${name} detected: "${match[0]}"`,
          severity,
        });
      }
    });
  });
}

function scanDirectory(dir: string): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    // Ignorer node_modules et dossiers caches
    if (entry === 'node_modules' || entry.startsWith('.')) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      scanFile(fullPath);
    }
  }
}

// ============================================================
// EXECUTION
// ============================================================

console.log('Scanning codebase for theme violations...\n');

let scannedDirs = 0;
for (const dir of SCAN_DIRS) {
  try {
    statSync(dir);
    scanDirectory(dir);
    scannedDirs++;
  } catch {
    // Dossier n'existe pas, silencieux (configuration peut lister des dossiers optionnels)
  }
}

if (scannedDirs === 0) {
  console.warn('WARNING: No scan directories found. Check SCAN_DIRS configuration.');
  console.warn('Expected directories:', SCAN_DIRS.join(', '));
  process.exit(0);
}

// Afficher les resultats
const errors = results.filter((r) => r.severity === 'error');
const warnings = results.filter((r) => r.severity === 'warning');

if (results.length === 0) {
  console.log('No theme violations found! All elements use CSS variables.\n');
  console.log(`Theme Compliance: 100% (${scannedDirs} directories scanned)`);
  process.exit(0);
}

console.log(`Found ${errors.length} errors and ${warnings.length} warnings:\n`);

if (errors.length > 0) {
  console.log('ERRORS (must be fixed):');
  for (const { file, line, issue } of errors) {
    console.log(`  ${file}:${line} - ${issue}`);
  }
  console.log('');
}

if (warnings.length > 0) {
  console.log('WARNINGS (review recommended):');
  for (const { file, line, issue } of warnings) {
    console.log(`  ${file}:${line} - ${issue}`);
  }
  console.log('');
}

const total = errors.length + warnings.length + 1;
const compliance = Math.round((1 - errors.length / total) * 100);
console.log(`\nTheme Compliance: ${compliance}%`);

process.exit(errors.length > 0 ? 1 : 0);
