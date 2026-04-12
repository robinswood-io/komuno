#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mapfile -t DOC_FILES < <(
  {
    printf "%s\n" "$ROOT_DIR/README.md"
    printf "%s\n" "$ROOT_DIR/deploy/README.md"
    find "$ROOT_DIR/docs" -type f -name "*.md" | sort
  } | awk '!seen[$0]++'
)

missing=0

for abs_file in "${DOC_FILES[@]}"; do
  if [[ ! -f "$abs_file" ]]; then
    echo "ERROR: fichier introuvable: ${abs_file#$ROOT_DIR/}"
    missing=$((missing + 1))
    continue
  fi

  rel_file="${abs_file#$ROOT_DIR/}"

  while IFS= read -r raw_link; do
    link="${raw_link#*](}"
    link="${link%)}"

    if [[ "$link" =~ ^https?:// ]] || [[ "$link" =~ ^mailto: ]] || [[ "$link" =~ ^tel: ]] || [[ "$link" =~ ^# ]]; then
      continue
    fi

    link="${link%%#*}"
    link="${link%%\?*}"

    if [[ -z "$link" ]]; then
      continue
    fi

    resolved="$(realpath -m "$(dirname "$abs_file")/$link")"

    if [[ -d "$resolved" ]]; then
      if [[ -f "$resolved/README.md" || -f "$resolved/INDEX.md" ]]; then
        continue
      fi
      echo "BROKEN: $rel_file -> $link (dossier sans README.md ou INDEX.md)"
      missing=$((missing + 1))
      continue
    fi

    if [[ ! -e "$resolved" ]]; then
      echo "BROKEN: $rel_file -> $link"
      missing=$((missing + 1))
    fi
  done < <(grep -oE '\[[^]]+\]\(([^)]+)\)' "$abs_file" || true)
done

if [[ "$missing" -gt 0 ]]; then
  echo
  echo "Documentation check (all) failed: $missing lien(s) casse(s)."
  exit 1
fi

echo "Documentation check (all) passed: liens internes OK sur README/deploy/docs."
