#!/usr/bin/env bash
# setup-wif.sh — One-time setup for GitHub Actions Workload Identity Federation
# Edit the variables below, then run this script.

set -euo pipefail

# ============================================================
# CONFIGURATION — Edit these values
# ============================================================
PROJECT_ID="my-project"
PROJECT_NUMBER="123456789"  # gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
REGION="us-central1"
GITHUB_ORG="my-org"
GITHUB_REPO="my-repo"
SERVICE_ACCOUNT_NAME="github-deploy"
POOL_NAME="github-pool"
PROVIDER_NAME="github-provider"
# ============================================================

SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Setting up Workload Identity Federation for ${GITHUB_ORG}/${GITHUB_REPO}"
echo ""

# 1. Enable required APIs
echo "--- Enabling APIs ---"
gcloud services enable \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project "$PROJECT_ID"

# 2. Create Workload Identity Pool
echo ""
echo "--- Creating Workload Identity Pool ---"
gcloud iam workload-identity-pools create "$POOL_NAME" \
  --project "$PROJECT_ID" \
  --location global \
  --display-name "GitHub Actions Pool" \
  2>/dev/null || echo "Pool already exists"

# 3. Create OIDC Provider
echo ""
echo "--- Creating OIDC Provider ---"
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_NAME" \
  --project "$PROJECT_ID" \
  --location global \
  --workload-identity-pool "$POOL_NAME" \
  --display-name "GitHub Actions Provider" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "\
google.subject=assertion.sub,\
attribute.actor=assertion.actor,\
attribute.repository=assertion.repository,\
attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition "assertion.repository_owner=='${GITHUB_ORG}'" \
  2>/dev/null || echo "Provider already exists"

# 4. Create Service Account
echo ""
echo "--- Creating Service Account ---"
gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
  --project "$PROJECT_ID" \
  --display-name "GitHub Actions Deploy SA" \
  2>/dev/null || echo "Service account already exists"

# 5. Grant roles to the SA
echo ""
echo "--- Granting IAM Roles ---"
ROLES=(
  "roles/run.admin"
  "roles/iam.serviceAccountUser"
  "roles/artifactregistry.writer"
  "roles/logging.logWriter"
)
for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:${SA_EMAIL}" \
    --role "$ROLE" \
    --quiet 2>/dev/null
  echo "  Granted $ROLE"
done

# 6. Allow GitHub repo to impersonate the SA
echo ""
echo "--- Binding Workload Identity ---"
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project "$PROJECT_ID" \
  --role "roles/iam.workloadIdentityUser" \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}"

# 7. Create Artifact Registry repo
echo ""
echo "--- Creating Artifact Registry Repository ---"
gcloud artifacts repositories create "${GITHUB_REPO}" \
  --project "$PROJECT_ID" \
  --repository-format docker \
  --location "$REGION" \
  --description "Container images for ${GITHUB_REPO}" \
  2>/dev/null || echo "Repository already exists"

# 8. Output configuration
WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"

echo ""
echo "============================================================"
echo "Setup complete! Add these as GitHub repository variables:"
echo "============================================================"
echo ""
echo "  GCP_PROJECT_ID:     ${PROJECT_ID}"
echo "  GCP_PROJECT_NUMBER: ${PROJECT_NUMBER}"
echo "  GCP_REGION:         ${REGION}"
echo "  GCP_SERVICE_NAME:   ${GITHUB_REPO}"
echo "  GCP_SA_EMAIL:       ${SA_EMAIL}"
echo "  WIF_PROVIDER:       ${WIF_PROVIDER}"
echo ""
echo "Settings → Secrets and variables → Actions → Variables"
echo "============================================================"
