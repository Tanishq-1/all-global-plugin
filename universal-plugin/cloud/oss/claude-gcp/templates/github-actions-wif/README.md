# GitHub Actions + Workload Identity Federation Template

Keyless CI/CD from GitHub Actions to Cloud Run using Workload Identity Federation (no service account keys).

## What's Included

- `.github/workflows/deploy.yml` — Build and deploy to Cloud Run on push to main
- `.github/workflows/pr-check.yml` — Build and test on pull requests
- `setup-wif.sh` — One-time setup script for Workload Identity Federation

## Quick Start

### 1. Set Up Workload Identity Federation

```bash
# Edit the variables in setup-wif.sh, then run:
chmod +x setup-wif.sh
./setup-wif.sh
```

This creates:
- A Workload Identity Pool and OIDC Provider for GitHub Actions
- A deploy service account with Cloud Run and Artifact Registry permissions
- IAM binding allowing your GitHub repo to impersonate the SA

### 2. Configure GitHub Repository

Add these as GitHub repository variables (Settings → Secrets and variables → Actions → Variables):

| Variable | Value |
|----------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_PROJECT_NUMBER` | Your GCP project number |
| `GCP_REGION` | e.g., `us-central1` |
| `GCP_SERVICE_NAME` | Your Cloud Run service name |
| `GCP_SA_EMAIL` | The deploy SA email |
| `WIF_PROVIDER` | Full provider resource name |

### 3. Push to Main

The deploy workflow triggers automatically on push to `main`.

## Security

- No service account keys — authentication uses OIDC tokens
- Provider is restricted to your specific GitHub org/repo
- Deploy SA has only the permissions needed for deployment
- PR workflow builds but does not deploy
