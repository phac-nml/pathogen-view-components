#!/usr/bin/env bash
# check-tailwind-coupling.sh
#
# Usage:
#   bash scripts/check-tailwind-coupling.sh [PATH ...]
#
# Scans the given paths for Tailwind-coupling patterns and exits 1 if any are
# found. When no paths are given it scans the whole repository (excluding
# generated artifacts and archives).
#
# Always ignored (regardless of provided paths):
#   - app/assets/stylesheets/pathogen_view_components.css  (compiled artifact)
#   - .planning/archive/**                                  (legacy notes)
#   - demo/Gemfile.lock                                     (lock file)
#   - pnpm-lock.yaml                                        (lock file)
#   - scripts/check-tailwind-coupling.sh                    (this file)
#
# Exit codes:
#   0 — clean, no Tailwind coupling found
#   1 — Tailwind coupling detected
#
# Environment:
#   TAILWIND_CHECK_VERBOSE=1  — print matched lines (default: filenames only)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERBOSE="${TAILWIND_CHECK_VERBOSE:-0}"

EXCLUDE_FILES=(
  "$REPO_ROOT/app/assets/stylesheets/pathogen_view_components.css"
  "$REPO_ROOT/scripts/check-tailwind-coupling.sh"
  "$REPO_ROOT/pnpm-lock.yaml"
  "$REPO_ROOT/demo/Gemfile.lock"
)

EXCLUDE_DIRS=(
  "$REPO_ROOT/.planning/archive"
  "$REPO_ROOT/node_modules"
  "$REPO_ROOT/.git"
)

# Patterns that indicate Tailwind coupling in non-generated source files.
# Sorted from strongest signal to weakest.
PATTERNS=(
  # CSS/import directives
  '@import "tailwindcss"'
  '@tailwind'
  'tailwindcss:watch'
  # Stylesheet tag references
  'stylesheet_link_tag[[:space:]]*["\x27]tailwind'
  # Gem references
  "gem ['\"]tailwindcss-rails"
  # Tailwind utility class strings in Ruby/ERB source
  # (matches 'text-slate-', 'bg-primary-', 'hover:bg-', 'dark:text-', 'px-3', 'py-2', etc.)
  "class[[:space:]]*=[[:space:]]*['\"].*\b(text-(slate|grey|white|primary|red|green|yellow|blue)-[0-9]|bg-(slate|white|primary|red)-[0-9]|hover:|dark:|px-[0-9]|py-[0-9]|rounded-|font-(medium|semibold|bold)|text-(sm|base|lg|xl|2xl))\b"
)

# ---- Resolve scan targets ----
if [[ $# -gt 0 ]]; then
  TARGETS=("$@")
else
  TARGETS=("$REPO_ROOT")
fi

# Build grep exclusion flags
GREP_EXCLUDES=()
for f in "${EXCLUDE_FILES[@]}"; do
  # Pass relative path or absolute; grep --exclude needs a glob
  GREP_EXCLUDES+=(--exclude="$(basename "$f")")
done
GREP_EXCLUDE_DIRS=()
for d in "${EXCLUDE_DIRS[@]}"; do
  GREP_EXCLUDE_DIRS+=(--exclude-dir="$(basename "$d")")
done

# Also always exclude the archive directory by its relative name
GREP_EXCLUDE_DIRS+=(--exclude-dir="archive")

FOUND=0

for pattern in "${PATTERNS[@]}"; do
  if [[ "$VERBOSE" == "1" ]]; then
    GREP_FLAGS="-rn --color=always"
  else
    GREP_FLAGS="-rl"
  fi

  # shellcheck disable=SC2086
  RESULT=$(grep $GREP_FLAGS -E "$pattern" \
    "${GREP_EXCLUDES[@]}" \
    "${GREP_EXCLUDE_DIRS[@]}" \
    "${TARGETS[@]}" 2>/dev/null || true)

  if [[ -n "$RESULT" ]]; then
    echo "Tailwind coupling found (pattern: $pattern):"
    echo "$RESULT"
    echo ""
    FOUND=1
  fi
done

if [[ "$FOUND" -eq 0 ]]; then
  echo "OK: No Tailwind coupling found in: ${TARGETS[*]}"
  exit 0
else
  echo "FAIL: Tailwind coupling detected. Fix the above references."
  exit 1
fi
