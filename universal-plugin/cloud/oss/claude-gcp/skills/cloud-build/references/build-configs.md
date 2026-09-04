# Cloud Build Configurations

## Parallel Steps

Run independent steps concurrently with `waitFor`:

```yaml
steps:
  # These two run in parallel
  - id: 'lint'
    name: 'node:20-slim'
    entrypoint: 'npm'
    args: ['run', 'lint']
    waitFor: ['-']  # Start immediately

  - id: 'typecheck'
    name: 'node:20-slim'
    entrypoint: 'npm'
    args: ['run', 'typecheck']
    waitFor: ['-']

  # This waits for both lint and typecheck to pass
  - id: 'test'
    name: 'node:20-slim'
    entrypoint: 'npm'
    args: ['run', 'test']
    waitFor: ['lint', 'typecheck']

  # Build only after tests pass
  - id: 'build'
    name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'IMAGE', '.']
    waitFor: ['test']
```

## Kaniko Caching

Use Kaniko for Docker layer caching — significantly speeds up repeat builds:

```yaml
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--destination=${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:${SHORT_SHA}'
      - '--destination=${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:latest'
      - '--cache=true'
      - '--cache-ttl=168h'  # 7 days
```

## Multi-Environment Builds

Use substitutions to deploy to different environments:

```yaml
steps:
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - '${_SERVICE}-${_ENVIRONMENT}'
      - '--image'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:${SHORT_SHA}'
      - '--region'
      - '${_REGION}'
      - '--set-env-vars'
      - 'ENVIRONMENT=${_ENVIRONMENT}'

substitutions:
  _ENVIRONMENT: staging  # Override in trigger config
  _REGION: us-central1
  _REPO: my-repo
  _IMAGE: my-service
  _SERVICE: my-service
```

## Build Notifications

Cloud Build publishes build status messages to the `cloud-builds` Pub/Sub topic automatically. Subscribe to it for notifications:

```bash
# Cloud Build auto-creates a "cloud-builds" topic in your project.
# Create a subscription to receive build events:
gcloud pubsub subscriptions create build-notifications \
  --project PROJECT_ID \
  --topic cloud-builds \
  --push-endpoint "https://YOUR_NOTIFICATION_HANDLER/builds"
```

The Pub/Sub message payload includes build ID, status, images, timing, and substitutions — enough to route to any notification system you use.

For custom filtering (e.g., only notify on failures):

```yaml
# In cloudbuild.yaml, the build status is available after completion.
# Use a final step that only runs on failure:
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'IMAGE', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'IMAGE']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args: ['run', 'deploy', 'SERVICE', '--image', 'IMAGE', '--region', 'REGION']
```

To process build events, create a Cloud Run service or Cloud Function that subscribes to the `cloud-builds` topic and forwards to whatever notification channel your team uses.

## Testing in Build

### Python (pytest)

```yaml
steps:
  - name: 'python:3.12-slim'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements.txt
        pip install -r requirements-test.txt
        pytest tests/ -v --tb=short
```

### Node.js (vitest/jest)

```yaml
steps:
  - name: 'node:20-slim'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm ci
        npm test
```

### Go

```yaml
steps:
  - name: 'golang:1.22'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        go test ./... -v -race
```

## Build with Private Dependencies

Access private registries or repos during build:

```yaml
steps:
  # Install private npm packages
  - name: 'node:20-slim'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        echo "//registry.npmjs.org/:_authToken=$$NPM_TOKEN" > .npmrc
        npm ci
        rm .npmrc
    secretEnv: ['NPM_TOKEN']

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'NPM_TOKEN=$$NPM_TOKEN'
      - '-t'
      - 'IMAGE'
      - '.'
    secretEnv: ['NPM_TOKEN']

availableSecrets:
  secretManager:
    - versionName: projects/${PROJECT_ID}/secrets/npm-token/versions/latest
      env: NPM_TOKEN
```

## Build Timeouts

Default: 10 minutes. Maximum: 24 hours.

```yaml
timeout: '1200s'  # 20 minutes

steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'IMAGE', '.']
    timeout: '600s'  # Per-step timeout: 10 minutes
```

## Machine Type

Use larger machines for faster builds:

```yaml
options:
  machineType: 'E2_HIGHCPU_8'   # 8 vCPUs (default is E2_MEDIUM, 1 vCPU)
  # Available: E2_MEDIUM, E2_HIGHCPU_8, E2_HIGHCPU_32
  logging: CLOUD_LOGGING_ONLY
  diskSizeGb: '100'  # Default is 100GB
```
