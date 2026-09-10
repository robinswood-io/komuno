#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="$(mktemp)"; trap 'rm -f "$LOG"' EXIT
run(){ "$@" >>"$LOG" 2>&1 || { cat "$LOG" >&2; exit 1; }; }
run node scripts/verify-association-journey-matrix.mjs
run node scripts/check-typescript-source-drift.mjs
run node scripts/check-maintained-docs.mjs
run bash scripts/test-backup-restore.sh
run bash -n scripts/backup-komuno.sh scripts/restore-komuno-isolated.sh scripts/remove-images-bounded.sh scripts/generate-release-manifest.sh
! grep -q "startsWith(github.head_ref" .github/workflows/pr-ci.yml
! grep -q "continue-on-error" .github/workflows/pr-ci.yml
! grep -q "docker image prune" .github/workflows/deploy.yml
grep -q "provenance: true" .github/workflows/deploy.yml
grep -q "sbom: true" .github/workflows/deploy.yml
run npm run check
run bun x vitest run test/unit/security.hardening.spec.ts test/unit/backend-data-remediation.spec.ts test/performance/members-first-page.performance.spec.ts server/src/common/filters/http-exception.filter.spec.ts server/src/forms/forms.controller.spec.ts
run npm run build
run bun audit --production --audit-level=high
printf 'KOMUNO_REMEDIATION_OK\n'
