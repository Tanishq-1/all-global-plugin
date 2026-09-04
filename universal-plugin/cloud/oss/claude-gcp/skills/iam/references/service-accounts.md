# Service Accounts

## Lifecycle Management

### Creation

```bash
# Create a purpose-specific SA
gcloud iam service-accounts create cloud-run-api \
  --project PROJECT_ID \
  --display-name "Cloud Run API Service Account" \
  --description "SA for the main API service on Cloud Run"
```

Naming convention: `{service-name}-{purpose}` (e.g., `my-api-runner`, `data-pipeline-worker`).

### Listing and Describing

```bash
# List all SAs in a project
gcloud iam service-accounts list --project PROJECT_ID

# Describe a specific SA
gcloud iam service-accounts describe SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID

# List roles granted to a SA
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:SA@PROJECT_ID.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### Disabling and Deleting

```bash
# Disable (can be re-enabled)
gcloud iam service-accounts disable SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID

# Delete (30-day recovery window)
gcloud iam service-accounts delete SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID

# Undelete within 30 days
gcloud iam service-accounts undelete SA_UNIQUE_ID --project PROJECT_ID
```

## Key Management

**Best practice: Avoid SA keys entirely.** Use Workload Identity Federation for external systems and SA impersonation for internal.

If keys are absolutely necessary (legacy systems):

```bash
# Create a key (outputs JSON)
gcloud iam service-accounts keys create key.json \
  --iam-account SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID

# List keys (check for old keys)
gcloud iam service-accounts keys list \
  --iam-account SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID \
  --format="table(name.basename(), validAfterTime, validBeforeTime, keyType)"

# Delete a key
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID
```

### Key Rotation Audit

Find service accounts with keys older than 90 days:

```bash
gcloud iam service-accounts list --project PROJECT_ID \
  --format="value(email)" | while read SA; do
  gcloud iam service-accounts keys list \
    --iam-account "$SA" --project PROJECT_ID \
    --format="table(name.basename(), validAfterTime)" \
    --filter="keyType=USER_MANAGED AND validAfterTime<'-P90D'"
done
```

## SA Impersonation

Allow one identity to act as a service account without creating keys:

```bash
# Allow a user to impersonate a SA
gcloud iam service-accounts add-iam-policy-binding TARGET_SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID \
  --member "user:developer@example.com" \
  --role "roles/iam.serviceAccountTokenCreator"

# Use impersonation with gcloud
gcloud run deploy SERVICE \
  --impersonate-service-account TARGET_SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID --region REGION \
  --image IMAGE
```

### SA-to-SA Impersonation

```bash
# Allow SA-A to impersonate SA-B
gcloud iam service-accounts add-iam-policy-binding SA_B@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID \
  --member "serviceAccount:SA_A@PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/iam.serviceAccountTokenCreator"
```

Use cases:
- Deploy SA impersonates runtime SA to test permissions
- CI/CD SA impersonates environment-specific SAs
- Cross-project access without keys

## Default Service Accounts

GCP projects come with default SAs that are overly privileged:

| Default SA | Roles | Risk |
|-----------|-------|------|
| `PROJECT_NUMBER-compute@developer.gserviceaccount.com` | `roles/editor` | Full project access |
| `PROJECT_ID@appspot.gserviceaccount.com` | `roles/editor` | Full project access |
| `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` | Varies | Build-time access |

**Never use these for production.** Create purpose-specific SAs instead.

To prevent accidental use of the default compute SA:
```bash
# Remove the default SA's Editor role
gcloud projects remove-iam-policy-binding PROJECT_ID \
  --member "serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role "roles/editor"
```
