#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bash scripts/check-and-push.sh <MODULE_ID> [MODULE_NAME]" >&2
  exit 1
fi

MODULE_ID="$1"
MODULE_NAME="${2:-}"

if [ -z "$MODULE_NAME" ]; then
  case "$MODULE_ID" in
    M0) MODULE_NAME="repo setup" ;;
    F1) MODULE_NAME="frontend shell and language selector" ;;
    F2) MODULE_NAME="voice intake and consent flow" ;;
    F3) MODULE_NAME="document readiness and draft form review" ;;
    F4) MODULE_NAME="approval gate and submission tracker" ;;
    F5) MODULE_NAME="stall detection and simulated office call UI" ;;
    D1) MODULE_NAME="database schemas, encryption, seed and service catalog" ;;
    B1) MODULE_NAME="backend core API and auth" ;;
    B2) MODULE_NAME="cases, documents and consent endpoints" ;;
    B3) MODULE_NAME="mock portal and playwright draft-first robot" ;;
    B4) MODULE_NAME="stall detector and simulated office call engine" ;;
    A1) MODULE_NAME="multilingual Claude agents, tools, mocks and evals" ;;
    I1) MODULE_NAME="end-to-end frontend-backend-AI integration" ;;
    Z1) MODULE_NAME="final verification and polish" ;;
    *)  MODULE_NAME="module $MODULE_ID" ;;
  esac
fi

echo "==> [1/6] Staging workspace files..."
git add -A

echo "==> [2/6] Running forbidden tracked-file & staged-secret checks..."
STAGED_AND_TRACKED="$(git diff --cached --name-only; git ls-files)"

if echo "$STAGED_AND_TRACKED" | grep -E '(^|/)\.env($|\.)' | grep -vE '(^|/)\.env\.example$' >/dev/null 2>&1; then
  echo "ERROR: .env file is staged or tracked!" >&2
  exit 1
fi

if echo "$STAGED_AND_TRACKED" | grep -E '(^|/)(uploads|node_modules|backend/storage)(/|$)' >/dev/null 2>&1; then
  echo "ERROR: Forbidden directory (uploads/, node_modules/, or backend/storage) is staged or tracked!" >&2
  exit 1
fi

SK_PATTERN="sk-""ant-"
STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMR)"
for f in $STAGED_FILES; do
  if [ "$f" != "scripts/check-and-push.sh" ] && [ "$f" != "scripts/scan-secrets.mjs" ] && [ -f "$f" ]; then
    if grep -q "$SK_PATTERN" "$f" 2>/dev/null; then
      echo "ERROR: Secret token prefix found in staged file: $f" >&2
      exit 1
    fi
    if grep -E '^(ANTHROPIC_API_KEY|JWT_SECRET|ENCRYPTION_KEY)[[:space:]]*=[[:space:]]*[^[:space:]#]+' "$f" >/dev/null 2>&1; then
      echo "ERROR: Non-empty secret key value found in staged file: $f" >&2
      exit 1
    fi
  fi
done

echo "==> [3/6] Running npm run check across all workspaces..."
npm run check

echo "==> [4/6] Committing changes for $MODULE_ID ($MODULE_NAME)..."
if git diff --cached --quiet; then
  echo "No new staged changes to commit; checking existing HEAD commit..."
else
  git commit -m "feat(${MODULE_ID}): ${MODULE_NAME} - checks passed"
fi

TAG_NAME="${MODULE_ID}-passed"
echo "==> [5/6] Tagging commit as ${TAG_NAME}..."
if git rev-parse -q --verify "refs/tags/${TAG_NAME}" >/dev/null; then
  git tag -d "${TAG_NAME}"
fi
git tag -a "${TAG_NAME}" -m "Module ${MODULE_ID} (${MODULE_NAME}) checks passed"

echo "==> [6/6] Pushing main and tag ${TAG_NAME} to origin..."
git push origin main --follow-tags

LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git ls-remote origin refs/heads/main | awk '{print $1}')"

if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  echo "ERROR: Remote HEAD ($REMOTE_HEAD) does not match local HEAD ($LOCAL_HEAD)!" >&2
  exit 1
fi

echo "SUCCESS: ${MODULE_ID} verified and pushed at commit ${LOCAL_HEAD}"
