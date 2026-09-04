---
name: cloud-build
description: Generate and manage Cloud Build CI/CD pipelines. Covers cloudbuild.yaml generation, triggers, Artifact Registry, build caching, approvals, and monorepo patterns.
trigger_phrases:
  - build pipeline
  - cloudbuild.yaml
  - CI/CD
  - build trigger
  - artifact registry
  - container build
  - deploy pipeline
---

## Safety

Before running ANY gcloud command from this skill, you MUST follow the GCP Safety Protocol defined in CLAUDE.md. Explain what the command does, what it affects, billing impact, and reversibility. Get user confirmation before executing. The `gcp-command-guard` hook will block destructive and risky commands automatically — you must explain and get confirmation before re-attempting.

## Instructions

When the user asks about Cloud Build or CI/CD pipelines, generate configs and commands following these patterns.

### Generating cloudbuild.yaml

Always generate complete, runnable configs. Use substitutions for project-specific values.

Minimal build-and-deploy pipeline:

```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:${SHORT_SHA}'
      - '-t'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:latest'
      - '.'

  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}'

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - '${_SERVICE}'
      - '--image'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:${SHORT_SHA}'
      - '--region'
      - '${_REGION}'
      - '--service-account'
      - '${_SERVICE_ACCOUNT}'
      - '--quiet'  # Required in CI/CD — suppresses interactive prompts that would hang the build

substitutions:
  _REGION: us-central1
  _REPO: my-repo
  _IMAGE: my-image
  _SERVICE: my-service
  _SERVICE_ACCOUNT: my-sa@${PROJECT_ID}.iam.gserviceaccount.com

images:
  - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:${SHORT_SHA}'
  - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:latest'

options:
  logging: CLOUD_LOGGING_ONLY
```

### Artifact Registry Setup

Always use Artifact Registry (Container Registry is deprecated):

```bash
# Create a Docker repository
gcloud artifacts repositories create REPO_NAME \
  --project PROJECT_ID \
  --repository-format docker \
  --location REGION \
  --description "Container images for my-service"

# Configure Docker auth
gcloud auth configure-docker REGION-docker.pkg.dev
```

### Build Triggers

```bash
# GitHub push trigger (deploy on push to main)
gcloud builds triggers create github \
  --project PROJECT_ID \
  --name "deploy-on-push" \
  --repo-name REPO_NAME \
  --repo-owner OWNER \
  --branch-pattern "^main$" \
  --build-config "cloudbuild.yaml"

# PR trigger (build and test on PRs)
gcloud builds triggers create github \
  --project PROJECT_ID \
  --name "pr-check" \
  --repo-name REPO_NAME \
  --repo-owner OWNER \
  --pull-request-pattern "^main$" \
  --build-config "cloudbuild-pr.yaml" \
  --comment-control COMMENTS_ENABLED
```

### Secret Injection

Use Secret Manager for build-time secrets — never bake secrets into images:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'IMAGE', '--build-arg', 'NPM_TOKEN=$$NPM_TOKEN', '.']
    secretEnv: ['NPM_TOKEN']

availableSecrets:
  secretManager:
    - versionName: projects/PROJECT_ID/secrets/npm-token/versions/latest
      env: NPM_TOKEN
```

### Key Principles

1. **Use substitutions** for all environment-specific values (`_REGION`, `_SERVICE`, etc.)
2. **Tag images with both `SHORT_SHA` and `latest`** — SHA for immutable deploys, latest for convenience
3. **Use `CLOUD_LOGGING_ONLY`** to reduce costs (skip GCS log bucket)
4. **Never bake secrets** into images — use `secretEnv` with Secret Manager

## References

For detailed patterns, see:
- [Triggers](references/triggers.md) — GitHub, webhook, and manual trigger configuration
- [Build Configs](references/build-configs.md) — Advanced cloudbuild.yaml patterns, parallel steps, caching
- [Artifacts](references/artifacts.md) — Artifact Registry setup, image management, cleanup policies
