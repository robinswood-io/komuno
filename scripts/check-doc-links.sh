#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DOC_FILES=(
  "README.md"
  "docs/README.md"
  "docs/INDEX.md"
  "docs/MAINTAINED_DOCS.md"
  "docs/legacy/README.md"
  "deploy/README.md"
)

missing=0

for file in "${DOC_FILES[@]}"; do
  abs_file="$ROOT_DIR/$file"
  if [[ ! -f "$abs_file" ]]; then
    echo "ERROR: fichier introuvable: $file"
    missing=$((missing + 1))
    continue
  fi

  while IFS= read -r raw_link; do
    link="${raw_link#*](}"
    link="${link%)}"

    # Ignore external links, anchors and mailto links.
    if [[ "$link" =~ ^https?:// ]] || [[ "$link" =~ ^mailto: ]] || [[ "$link" =~ ^# ]]; then
      continue
    fi

    # Strip anchors and query params for file existence checks.
    link="${link%%#*}"
    link="${link%%\?*}"

    if [[ -z "$link" ]]; then
      continue
    fi

    resolved="$(realpath -m "$(dirname "$abs_file")/$link")"

    if [[ -d "$resolved" ]]; then
      if [[ -f "$resolved/README.md" ]]; then
        continue
      fi
      echo "BROKEN: $file -> $link (dossier sans README.md)"
      missing=$((missing + 1))
      continue
    fi

    if [[ ! -e "$resolved" ]]; then
      echo "BROKEN: $file -> $link"
      missing=$((missing + 1))
    fi
  done < <(grep -oE '\[[^]]+\]\(([^)]+)\)' "$abs_file" || true)
done

if [[ "$missing" -gt 0 ]]; then
  echo
  echo "Documentation check failed: $missing lien(s) casse(s)."
  exit 1
fi

echo "Documentation check passed: liens internes OK pour les documents maintenus."
