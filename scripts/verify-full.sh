#!/usr/bin/env bash
# Run the full (heavy) suite locally and record evidence that CI's `evidence-gate` job accepts
# instead of re-running the suite on the PR.
#
# Usage: commit your change, run scripts/verify-full.sh, then commit .ci/evidence/full-suite.json
# as the last commit. The evidence is bound to a hash of every tracked file except
# .ci/evidence/, so any later change to the PR invalidates it (re-run the script).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SUITE='ux-builder-full'
FULL_CMD='npm ci && npx playwright install chromium && npm run check && git checkout -- . && npm run e2e --workspace @ux-builder/theme-builder && npm run build-storybook --workspace @ux-builder/ui && node tools/build-pages.mjs _site && npm run test:storybook --workspace @ux-builder/ui && git checkout -- .'

command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }
sha() { if command -v sha256sum >/dev/null; then sha256sum; else shasum -a 256; fi; }
content_hash() {
  git ls-files -z -- . ':!.ci/evidence' | while IFS= read -r -d '' f; do
    [ -f "$f" ] || continue
    printf '%s\0' "$f"; cat -- "$f"
  done | sha | cut -d' ' -f1
}

if [ -n "$(git status --porcelain --untracked-files=no -- . ':!.ci/evidence')" ]; then
  echo "Working tree has uncommitted changes to tracked files; commit first so the hash matches the PR head." >&2
  exit 1
fi

before=$(content_hash)
echo "+ $FULL_CMD"
bash -c "$FULL_CMD"
after=$(content_hash)
if [ "$before" != "$after" ]; then
  echo "The suite modified tracked files; restore or commit them and re-run." >&2
  exit 1
fi

tools=$( { node --version; npm --version; } 2>&1 | jq -R . | jq -s . )
mkdir -p .ci/evidence
jq -n --arg suite "$SUITE" --arg hash "$after" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg cmd "$FULL_CMD" --argjson tools "$tools" \
  '{suite: $suite, tool_versions: $tools, content_hash: $hash, timestamp: $ts, command: $cmd}' \
  > .ci/evidence/full-suite.json
echo "Wrote .ci/evidence/full-suite.json (hash $after). Commit it as the last commit."
