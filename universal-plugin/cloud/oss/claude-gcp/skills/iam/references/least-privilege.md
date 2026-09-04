# IAM Least Privilege

## How to Find the Right Role

Instead of memorizing role tables for every GCP service, use these tools to find the narrowest role for any use case:

```bash
# List all predefined roles for a specific service
gcloud iam roles list --filter="name:roles/run."
gcloud iam roles list --filter="name:roles/cloudsql."
gcloud iam roles list --filter="name:roles/secretmanager."

# See exactly what permissions a role includes
gcloud iam roles describe roles/run.invoker

# See what roles a service account currently has
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:SA@PROJECT.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### General Rules

- If the SA only needs to **read** a resource, look for a `viewer` or `reader` role
- If it needs to **use** a resource (connect, invoke, access), look for a `client`, `invoker`, or `accessor` role
- Only use `admin` roles for SAs that genuinely manage the lifecycle of a resource (create/delete)
- **Never use `roles/editor` or `roles/owner` on a service account** — these grant access to nearly everything in the project

## Custom Roles

When predefined roles are too broad, create custom roles with only the permissions needed:

```bash
# Create a custom role from a YAML definition
gcloud iam roles create customCloudRunDeployer \
  --project PROJECT_ID \
  --file custom-role.yaml
```

`custom-role.yaml`:
```yaml
title: Cloud Run Deployer
description: Deploy Cloud Run services without admin access to other resources
stage: GA
includedPermissions:
  - run.services.create
  - run.services.update
  - run.services.get
  - run.services.list
  - run.revisions.list
  - run.revisions.get
  - iam.serviceAccounts.actAs
  - artifactregistry.repositories.downloadArtifacts
```

### Finding Required Permissions

```bash
# Check what permissions a role includes
gcloud iam roles describe roles/run.admin

# Test what permissions a SA actually has
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:SA@PROJECT.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

## IAM Recommender

Automatically identify over-privileged accounts:

```bash
# List IAM recommendations
gcloud recommender recommendations list \
  --project PROJECT_ID \
  --location global \
  --recommender google.iam.policy.Recommender \
  --format="table(content.operationGroups[0].operations[0].resource, \
    content.operationGroups[0].operations[0].pathFilters)"

# Apply a recommendation
gcloud recommender recommendations mark-claimed RECOMMENDATION_ID \
  --project PROJECT_ID \
  --location global \
  --recommender google.iam.policy.Recommender \
  --etag ETAG
```

## Policy Analyzer

Understand who has access to what:

```bash
# Who can access a specific resource?
gcloud asset analyze-iam-policy \
  --project PROJECT_ID \
  --identity "serviceAccount:SA@PROJECT_ID.iam.gserviceaccount.com" \
  --full-resource-name "//run.googleapis.com/projects/PROJECT_ID/locations/REGION/services/SERVICE"

# What resources can a SA access?
gcloud asset analyze-iam-policy \
  --project PROJECT_ID \
  --identity "serviceAccount:SA@PROJECT_ID.iam.gserviceaccount.com"
```

## Audit Logging

Ensure admin activity and data access logs are enabled:

```bash
# View current audit config
gcloud projects get-iam-policy PROJECT_ID \
  --format="json(auditConfigs)"

# Enable data access logging for specific services
# (Admin Activity is always enabled and free)
```

The audit config should be set via `gcloud projects set-iam-policy` with a policy JSON that includes:
```json
{
  "auditConfigs": [
    {
      "service": "allServices",
      "auditLogConfigs": [
        {"logType": "ADMIN_READ"},
        {"logType": "DATA_WRITE"},
        {"logType": "DATA_READ"}
      ]
    }
  ]
}
```
