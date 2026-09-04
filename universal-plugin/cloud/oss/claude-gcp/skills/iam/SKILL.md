---
name: iam
description: Manage IAM policies, service accounts, roles, and Workload Identity Federation. Covers least-privilege, custom roles, SA lifecycle, keyless auth, and conditional bindings.
trigger_phrases:
  - permissions
  - service account
  - IAM role
  - least privilege
  - workload identity
  - who has access
  - grant access
  - custom role
---

## Safety

Before running ANY gcloud command from this skill, you MUST follow the GCP Safety Protocol defined in CLAUDE.md. IAM commands are especially sensitive — granting the wrong role can expose your entire project. Explain what access is being granted/revoked, to whom, and on what resource. The `gcp-command-guard` hook will block broad roles (Editor/Owner) and `set-iam-policy` (full replacement) automatically.

## Instructions

When the user asks about IAM, permissions, or service accounts, generate commands following these patterns.

### Service Account Creation

Always create purpose-specific service accounts. Never use the default compute service account for production workloads.

```bash
# Create a service account
gcloud iam service-accounts create SA_NAME \
  --project PROJECT_ID \
  --display-name "Description of purpose"

# Grant specific roles
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member "serviceAccount:SA_NAME@PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/SPECIFIC_ROLE"
```

Common role assignments for Cloud Run services:
```bash
# Cloud Run service that reads secrets and accesses Cloud SQL
ROLES=(
  "roles/secretmanager.secretAccessor"
  "roles/cloudsql.client"
  "roles/logging.logWriter"
  "roles/monitoring.metricWriter"
)
for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding PROJECT_ID \
    --member "serviceAccount:SA@PROJECT_ID.iam.gserviceaccount.com" \
    --role "$ROLE"
done
```

### Role Selection

Always prefer the most specific (narrowest) predefined role:

| Instead of... | Use... |
|---|---|
| `roles/editor` | Specific service roles |
| `roles/storage.admin` | `roles/storage.objectViewer` or `roles/storage.objectCreator` |
| `roles/run.admin` | `roles/run.invoker` (for calling services) |
| `roles/secretmanager.admin` | `roles/secretmanager.secretAccessor` (for reading secrets) |

Use IAM Recommender to audit existing bindings:
```bash
gcloud recommender recommendations list \
  --project PROJECT_ID \
  --location global \
  --recommender google.iam.policy.Recommender
```

### Workload Identity Federation (WIF)

Keyless authentication for external workloads (GitHub Actions, AWS, Azure). Eliminates service account keys.

```bash
# Create a workload identity pool
gcloud iam workload-identity-pools create POOL_NAME \
  --project PROJECT_ID \
  --location global \
  --display-name "Pool description"

# Create a provider (GitHub Actions example)
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project PROJECT_ID \
  --location global \
  --workload-identity-pool POOL_NAME \
  --display-name "GitHub Actions" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition "assertion.repository=='ORG/REPO'"

# Allow the provider to impersonate a service account
gcloud iam service-accounts add-iam-policy-binding SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID \
  --role "roles/iam.workloadIdentityUser" \
  --member "principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_NAME/attribute.repository/ORG/REPO"
```

### IAM Conditions

Restrict bindings with conditions:
```bash
# Time-based: only active during business hours
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member "user:dev@example.com" \
  --role "roles/run.admin" \
  --condition='expression=request.time.getHours("America/New_York") >= 9 && request.time.getHours("America/New_York") <= 17,title=business-hours-only'

# Resource-based: only for a specific service
gcloud run services add-iam-policy-binding SERVICE \
  --project PROJECT_ID \
  --region REGION \
  --member "serviceAccount:SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/run.invoker"
```

### Key Principles

1. **No service account keys.** Use Workload Identity Federation for external systems, SA impersonation for internal.
2. **Least privilege always.** Start with the narrowest role, expand only when needed.
3. **Never use Editor/Owner on service accounts.** These are overly broad.
4. **Resource-level bindings over project-level** when possible (e.g., grant `run.invoker` on a specific service, not the whole project).
5. **Use IAM Recommender** to identify and remove excess permissions.

## References

For detailed patterns, see:
- [Least Privilege](references/least-privilege.md) — Role recommendations, custom roles, IAM Recommender
- [Service Accounts](references/service-accounts.md) — SA lifecycle, key rotation, impersonation
- [Workload Identity](references/workload-identity.md) — WIF setup for GitHub Actions, AWS, Azure, Kubernetes
