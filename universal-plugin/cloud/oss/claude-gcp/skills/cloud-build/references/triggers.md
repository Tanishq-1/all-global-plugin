# Cloud Build Triggers

## GitHub Triggers

### Push to Branch

```bash
# Deploy on push to main
gcloud builds triggers create github \
  --project PROJECT_ID \
  --name "deploy-main" \
  --repo-name my-repo \
  --repo-owner my-org \
  --branch-pattern "^main$" \
  --build-config "cloudbuild.yaml" \
  --substitutions _ENVIRONMENT=production

# Deploy on push to develop
gcloud builds triggers create github \
  --project PROJECT_ID \
  --name "deploy-staging" \
  --repo-name my-repo \
  --repo-owner my-org \
  --branch-pattern "^develop$" \
  --build-config "cloudbuild.yaml" \
  --substitutions _ENVIRONMENT=staging
```

### Pull Request Triggers

```bash
# Run tests on PRs targeting main
gcloud builds triggers create github \
  --project PROJECT_ID \
  --name "pr-check" \
  --repo-name my-repo \
  --repo-owner my-org \
  --pull-request-pattern "^main$" \
  --build-config "cloudbuild-pr.yaml" \
  --comment-control COMMENTS_ENABLED
```

The `--comment-control` flag enables `/gcbrun` comments to re-trigger builds on external contributor PRs.

### Tag-Based Triggers

```bash
# Build on semantic version tags (v1.0.0, v2.1.3, etc.)
gcloud builds triggers create github \
  --project PROJECT_ID \
  --name "release-build" \
  --repo-name my-repo \
  --repo-owner my-org \
  --tag-pattern "^v[0-9]+\\.[0-9]+\\.[0-9]+$" \
  --build-config "cloudbuild-release.yaml"
```

## Webhook Triggers

For external systems (Slack, custom tools) to trigger builds:

```bash
# Create a webhook trigger
gcloud builds triggers create webhook \
  --project PROJECT_ID \
  --name "external-deploy" \
  --secret projects/PROJECT_ID/secrets/webhook-secret/versions/latest \
  --build-config "cloudbuild.yaml" \
  --substitutions '_IMAGE=$(body.image),_TAG=$(body.tag)'
```

Invoke with:
```bash
curl -X POST "https://cloudbuild.googleapis.com/v1/projects/PROJECT_ID/triggers/TRIGGER_NAME:webhook" \
  -H "Content-Type: application/json" \
  -d '{"image": "my-image", "tag": "v1.0.0"}'
```

## Manual Triggers

```bash
# Create a trigger that only runs manually
gcloud builds triggers create manual \
  --project PROJECT_ID \
  --name "manual-deploy" \
  --repo-name my-repo \
  --repo-owner my-org \
  --branch main \
  --build-config "cloudbuild.yaml" \
  --substitutions _ENVIRONMENT=production

# Run it
gcloud builds triggers run manual-deploy \
  --project PROJECT_ID \
  --region REGION \
  --branch main
```

## Monorepo Triggers

Use `includedFiles` and `ignoredFiles` for path-based triggers:

```bash
# Only trigger when files in services/api/ change
gcloud builds triggers create github \
  --project PROJECT_ID \
  --name "deploy-api" \
  --repo-name my-monorepo \
  --repo-owner my-org \
  --branch-pattern "^main$" \
  --build-config "services/api/cloudbuild.yaml" \
  --included-files "services/api/**" \
  --substitutions _SERVICE=api
```

In `cloudbuild.yaml`, scope the build context:
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    dir: 'services/api'
    args: ['build', '-t', 'IMAGE', '.']
```

## Trigger Management

```bash
# List triggers
gcloud builds triggers list --project PROJECT_ID

# Describe a trigger
gcloud builds triggers describe TRIGGER_NAME --project PROJECT_ID

# Disable a trigger (without deleting)
gcloud builds triggers update TRIGGER_NAME \
  --project PROJECT_ID --disabled

# Delete a trigger
gcloud builds triggers delete TRIGGER_NAME --project PROJECT_ID

# View build history for a trigger
gcloud builds list --project PROJECT_ID \
  --filter="trigger_id=TRIGGER_ID" --limit 10
```

## Approval Gates

Require manual approval before production deploys:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'IMAGE', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'IMAGE']

  # This step requires approval
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args: ['run', 'deploy', 'SERVICE', '--image', 'IMAGE', '--region', 'REGION']

options:
  pool:
    name: 'projects/PROJECT_ID/locations/REGION/workerPools/my-pool'
```

Configure approval in the trigger:
```bash
gcloud builds triggers update TRIGGER_NAME \
  --project PROJECT_ID \
  --require-approval
```
