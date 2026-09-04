#!/usr/bin/env bash
# post-deploy-verify.sh — Verifies a Cloud Run deployment is healthy after deploy
# Usage: ./post-deploy-verify.sh SERVICE_NAME PROJECT_ID REGION
# Exit codes: 0 = healthy, 1 = unhealthy

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE="${1:?Usage: post-deploy-verify.sh SERVICE_NAME PROJECT_ID REGION}"
PROJECT="${2:?Usage: post-deploy-verify.sh SERVICE_NAME PROJECT_ID REGION}"
REGION="${3:?Usage: post-deploy-verify.sh SERVICE_NAME PROJECT_ID REGION}"

HEALTH_PATH="${HEALTH_PATH:-/health}"
TIMEOUT="${TIMEOUT:-60}"
RETRY_INTERVAL=5

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }

echo "=== Post-Deploy Verification ==="
echo "Service: $SERVICE"
echo "Project: $PROJECT"
echo "Region:  $REGION"
echo ""

# --- Get Service URL ---
echo "--- Service URL ---"
URL=$(gcloud run services describe "$SERVICE" \
  --project "$PROJECT" --region "$REGION" \
  --format="value(status.url)" 2>/dev/null || true)

if [ -z "$URL" ]; then
  fail "Could not retrieve service URL — service may not exist"
  exit 1
fi
pass "Service URL: $URL"

echo ""

# --- Health Check ---
echo "--- Health Check ---"
echo "Checking $URL$HEALTH_PATH (timeout: ${TIMEOUT}s)"

# Generate the identity token ONCE, scoped to this specific service URL.
# --audiences ensures the token is only valid for this service, not any other
# Cloud Run service the user has access to.
#
# The token is stored in a variable (not visible in `ps aux`) and passed to
# curl via a temp config file with restrictive permissions, so it never
# appears in the process argument list.
AUTH_TOKEN=$(gcloud auth print-identity-token --audiences="$URL" 2>/dev/null || true)

# Write token to a temp curl config file (0600 permissions, auto-cleaned)
CURL_CONFIG=$(mktemp)
chmod 600 "$CURL_CONFIG"
trap 'rm -f "$CURL_CONFIG"' EXIT
if [ -n "$AUTH_TOKEN" ]; then
  printf 'header = "Authorization: Bearer %s"\n' "$AUTH_TOKEN" > "$CURL_CONFIG"
fi

ELAPSED=0
HEALTHY=false

while [ "$ELAPSED" -lt "$TIMEOUT" ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    -K "$CURL_CONFIG" \
    "$URL$HEALTH_PATH" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    HEALTHY=true
    break
  fi

  echo "  Attempt at ${ELAPSED}s: HTTP $HTTP_CODE (retrying in ${RETRY_INTERVAL}s...)"
  sleep "$RETRY_INTERVAL"
  ELAPSED=$((ELAPSED + RETRY_INTERVAL))
done

# Scrub the token from memory and disk immediately after use
AUTH_TOKEN=""
rm -f "$CURL_CONFIG"

if $HEALTHY; then
  pass "Health check returned HTTP 200 after ${ELAPSED}s"
else
  fail "Health check failed after ${TIMEOUT}s (last status: HTTP $HTTP_CODE)"
fi

echo ""

# --- Revision Status ---
echo "--- Active Revisions ---"
gcloud run revisions list \
  --service "$SERVICE" \
  --project "$PROJECT" --region "$REGION" \
  --format="table(metadata.name, status.conditions[0].status, spec.containers[0].image.basename(), status.logUrl)" \
  --limit 3 2>/dev/null || warn "Could not list revisions"

echo ""

# --- Traffic Distribution ---
echo "--- Traffic Distribution ---"
gcloud run services describe "$SERVICE" \
  --project "$PROJECT" --region "$REGION" \
  --format="table(status.traffic.revisionName, status.traffic.percent, status.traffic.tag)" \
  2>/dev/null || warn "Could not describe traffic"

echo ""

# --- Recent Errors ---
echo "--- Recent Errors (last 60s) ---"
ERROR_COUNT=$(gcloud logging read \
  "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE\" AND severity>=ERROR AND timestamp>=\"$(date -u -v-60S +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '60 seconds ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null)\"" \
  --project "$PROJECT" --limit 50 --format json 2>/dev/null | grep -c '"severity"' || echo "0")

if [ "$ERROR_COUNT" -eq 0 ]; then
  pass "No errors in the last 60 seconds"
else
  warn "$ERROR_COUNT error(s) in the last 60 seconds"
  echo "  Run: gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE\" AND severity>=ERROR' --project $PROJECT --limit 10 --format json"
fi

echo ""

# --- Summary ---
echo "=== Verification Summary ==="
if $HEALTHY && [ "$ERROR_COUNT" -eq 0 ]; then
  echo -e "${GREEN}Deployment verified successfully${NC}"
  echo "URL: $URL"
  exit 0
elif $HEALTHY; then
  echo -e "${YELLOW}Service is responding but has recent errors — monitor closely${NC}"
  echo "URL: $URL"
  exit 0
else
  echo -e "${RED}Deployment verification failed — consider rolling back${NC}"
  echo ""
  echo "Rollback command:"
  echo "  gcloud run services update-traffic $SERVICE \\"
  echo "    --project $PROJECT --region $REGION \\"
  echo "    --to-revisions PREVIOUS_REVISION=100"
  exit 1
fi
