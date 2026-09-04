# Artifact Registry

## Repository Setup

### Docker Repository

```bash
# Create a Docker repository
gcloud artifacts repositories create my-repo \
  --project PROJECT_ID \
  --repository-format docker \
  --location us-central1 \
  --description "Container images for production services"

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Python Repository

```bash
gcloud artifacts repositories create python-packages \
  --project PROJECT_ID \
  --repository-format python \
  --location us-central1

# Configure pip
gcloud artifacts print-settings python \
  --project PROJECT_ID \
  --repository python-packages \
  --location us-central1
```

### npm Repository

```bash
gcloud artifacts repositories create npm-packages \
  --project PROJECT_ID \
  --repository-format npm \
  --location us-central1

# Configure npm
gcloud artifacts print-settings npm \
  --project PROJECT_ID \
  --repository npm-packages \
  --location us-central1
```

## Image Management

### Tagging Strategy

Use a consistent tagging strategy:
- `SHORT_SHA` — Git commit hash for immutable, traceable deploys
- `latest` — Convenience tag for development
- `v1.2.3` — Semantic version for releases
- `staging`, `production` — Environment promotion tags

```bash
# Tag an existing image for promotion
gcloud artifacts docker tags add \
  us-central1-docker.pkg.dev/PROJECT/REPO/IMAGE:SHORT_SHA \
  us-central1-docker.pkg.dev/PROJECT/REPO/IMAGE:production
```

### List Images

```bash
# List all images in a repository
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/PROJECT/REPO \
  --include-tags

# List tags for a specific image
gcloud artifacts docker tags list \
  us-central1-docker.pkg.dev/PROJECT/REPO/IMAGE
```

### Delete Images

```bash
# Delete a specific image by digest
gcloud artifacts docker images delete \
  us-central1-docker.pkg.dev/PROJECT/REPO/IMAGE@sha256:DIGEST \
  --quiet

# Delete by tag
gcloud artifacts docker images delete \
  us-central1-docker.pkg.dev/PROJECT/REPO/IMAGE:old-tag \
  --quiet
```

## Cleanup Policies

**WARNING: Cleanup policies automatically and permanently delete container images. Do NOT set these up without fully understanding the impact.**

Cleanup policies run continuously in the background once applied. Deleted images cannot be recovered. Before configuring any cleanup policy, you MUST:

1. **Audit what currently exists** — list all images and tags first:
   ```bash
   gcloud artifacts docker images list \
     us-central1-docker.pkg.dev/PROJECT/REPO \
     --include-tags --sort-by=UPDATE_TIME
   ```
2. **Ask the user** whether they keep old/untagged images intentionally (rollback, debugging, compliance, backups)
3. **Dry-run first** — use `--dry-run` to preview what would be deleted before applying:
   ```bash
   gcloud artifacts repositories set-cleanup-policies my-repo \
     --project PROJECT_ID \
     --location us-central1 \
     --policy cleanup-policy.json \
     --dry-run
   ```
4. **Get explicit confirmation** — the user must understand that once applied, this runs automatically and will keep deleting images that match the policy going forward

### Example Policy (review carefully before applying)

```bash
gcloud artifacts repositories set-cleanup-policies my-repo \
  --project PROJECT_ID \
  --location us-central1 \
  --policy cleanup-policy.json
```

`cleanup-policy.json`:
```json
[
  {
    "name": "delete-untagged",
    "action": {"type": "Delete"},
    "condition": {
      "tagState": "untagged",
      "olderThan": "2592000s"
    }
  },
  {
    "name": "keep-minimum-versions",
    "action": {"type": "Keep"},
    "mostRecentVersions": {
      "keepCount": 10
    }
  }
]
```

**What this policy does:** Deletes untagged images older than 30 days, but always keeps at least the 10 most recent versions regardless of age or tag state.

**What could go wrong:** If a user intentionally stores old untagged images (for rollback, audit trails, or backups), this policy will silently delete them after 30 days. Images retagged or untagged by automation (CI pipelines that move `latest`) may lose their previous untagged versions.

### Removing a Cleanup Policy

If a policy was applied by mistake:
```bash
gcloud artifacts repositories delete-cleanup-policies my-repo \
  --project PROJECT_ID \
  --location us-central1 \
  --policy-names delete-untagged,keep-minimum-versions
```

This stops future deletions but **does not recover images already deleted**.

## Vulnerability Scanning

Artifact Registry includes automatic vulnerability scanning:

```bash
# Enable scanning on a repository
gcloud artifacts repositories update my-repo \
  --project PROJECT_ID \
  --location us-central1 \
  --enable-vulnerability-scanning

# View scan results for an image
gcloud artifacts docker images describe \
  us-central1-docker.pkg.dev/PROJECT/REPO/IMAGE:TAG \
  --show-all-metadata

# List vulnerabilities
gcloud artifacts vulnerabilities list \
  us-central1-docker.pkg.dev/PROJECT/REPO/IMAGE:TAG
```

## Cross-Project Access

Allow other projects to pull images:

```bash
# Grant reader access to another project's default compute SA
gcloud artifacts repositories add-iam-policy-binding my-repo \
  --project SOURCE_PROJECT \
  --location us-central1 \
  --member "serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role "roles/artifactregistry.reader"

# Or grant to a specific SA
gcloud artifacts repositories add-iam-policy-binding my-repo \
  --project SOURCE_PROJECT \
  --location us-central1 \
  --member "serviceAccount:SA@OTHER_PROJECT.iam.gserviceaccount.com" \
  --role "roles/artifactregistry.reader"
```

## Remote Repositories

Proxy upstream registries (Docker Hub, Maven Central, npm) through Artifact Registry for caching and security:

```bash
# Create a remote repository for Docker Hub
gcloud artifacts repositories create dockerhub-cache \
  --project PROJECT_ID \
  --repository-format docker \
  --location us-central1 \
  --mode remote-repository \
  --remote-repo-config-desc "Docker Hub cache" \
  --remote-docker-repo DOCKER-HUB
```
