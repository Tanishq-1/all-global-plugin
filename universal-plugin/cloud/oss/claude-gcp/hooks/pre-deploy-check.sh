#!/usr/bin/env bash
# pre-deploy-check.sh — Validates deployment prerequisites before Cloud Run deploy
# Exit codes: 0 = pass, 1 = fail (blocks deploy)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
fail() { echo -e "${RED}[FAIL]${NC} $1"; ERRORS=$((ERRORS + 1)); }

echo "=== Pre-Deploy Check ==="
echo ""

# --- Dockerfile ---
echo "--- Dockerfile ---"

if [ -f "Dockerfile" ]; then
  pass "Dockerfile exists"

  # Check for multi-stage build
  STAGES=$(grep -ci "^FROM" Dockerfile || true)
  if [ "$STAGES" -ge 2 ]; then
    pass "Multi-stage build detected ($STAGES stages)"
  else
    warn "Single-stage build — consider multi-stage for smaller images"
  fi

  # Check for non-root user
  if grep -qi "USER\s" Dockerfile; then
    pass "Non-root USER directive found"
  else
    warn "No USER directive — container runs as root"
  fi

  # Check for EXPOSE
  if grep -qi "^EXPOSE" Dockerfile; then
    pass "EXPOSE directive found"
  else
    warn "No EXPOSE directive — Cloud Run needs a port to listen on"
  fi
else
  fail "No Dockerfile found in project root"
fi

# Check .dockerignore
if [ -f ".dockerignore" ]; then
  pass ".dockerignore exists"
else
  warn "No .dockerignore — build context may include unnecessary files"
fi

echo ""

# --- Secrets & Environment ---
echo "--- Secrets & Environment ---"

# SECURITY NOTE: All secret detection below uses grep -q (quiet mode).
# We only check whether secret-like patterns EXIST in files.
# We NEVER read, print, store, or transmit the actual secret values.

# Check for .env files with secrets
for envfile in .env .env.local .env.production; do
  if [ -f "$envfile" ]; then
    # Check for common secret patterns
    if grep -qiE "(password|secret|api_key|token|private_key)=" "$envfile" 2>/dev/null; then
      fail "$envfile contains potential secrets — use Secret Manager instead"
    else
      warn "$envfile found — ensure it's not deployed with the container"
    fi
  fi
done

# Check if .env is in .dockerignore
if [ -f ".dockerignore" ]; then
  if grep -q "\.env" .dockerignore; then
    pass ".env excluded from Docker build context"
  else
    warn ".env not in .dockerignore — secrets may be baked into the image"
  fi
fi

# Check for hardcoded secrets in common config files
for file in docker-compose.yml docker-compose.yaml app.yaml; do
  if [ -f "$file" ]; then
    if grep -qiE "(password|secret|api_key|token):\s*['\"]?[a-zA-Z0-9]" "$file" 2>/dev/null; then
      fail "$file appears to contain hardcoded secrets"
    fi
  fi
done

echo ""

# --- GCP Configuration ---
echo "--- GCP Configuration ---"

# Check gcloud is authenticated
if gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | head -1 | grep -q "@"; then
  ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>/dev/null | head -1)
  pass "Authenticated as $ACCOUNT"
else
  fail "No active gcloud authentication — run 'gcloud auth login'"
fi

# Check project is set
PROJECT=$(gcloud config get-value project 2>/dev/null || true)
if [ -n "$PROJECT" ] && [ "$PROJECT" != "(unset)" ]; then
  pass "Project set to $PROJECT"
else
  fail "No project configured — run 'gcloud config set project PROJECT_ID'"
fi

# Check if Cloud Run API is enabled
if [ -n "$PROJECT" ] && [ "$PROJECT" != "(unset)" ]; then
  if gcloud services list --project "$PROJECT" --filter="name:run.googleapis.com" --format="value(name)" 2>/dev/null | grep -q "run"; then
    pass "Cloud Run API enabled"
  else
    warn "Cloud Run API may not be enabled — run 'gcloud services enable run.googleapis.com'"
  fi
fi

echo ""

# --- Summary ---
echo "=== Summary ==="
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}$ERRORS error(s), $WARNINGS warning(s) — deploy blocked${NC}"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}0 errors, $WARNINGS warning(s) — deploy allowed with warnings${NC}"
  exit 0
else
  echo -e "${GREEN}All checks passed${NC}"
  exit 0
fi
