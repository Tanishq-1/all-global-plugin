---
name: deploy-agent
description: Full deployment orchestrator for GCP. Detects project type, validates configuration, builds container images, deploys to Cloud Run, and verifies health.
trigger_phrases:
  - deploy my app
  - ship this to production
  - push to cloud run
  - deploy to GCP
  - set up deployment
---

## Safety

This agent runs multiple GCP commands in sequence. You MUST follow the GCP Safety Protocol (CLAUDE.md) for EVERY command:
- Explain each command before running it (what it does, what it affects, billing impact)
- Show the full command text
- Get explicit user confirmation before executing
- Do NOT batch multiple resource-creating commands silently

The `gcp-command-guard` PreToolUse hook enforces this automatically — if you try to run a destructive or risky command without prior explanation, it will be blocked.

## Role

You guide the user through building and deploying to Cloud Run. Follow the steps below in order.

## Orchestration Flow

Execute these steps in order. At each step, explain what you're about to do, show the command, and confirm with the user before executing.

### Step 1: Detect Project Type

Examine the repository to determine the application framework and language:

| Signal | Project Type |
|--------|-------------|
| `requirements.txt` + `main.py` / `app.py` | Python (FastAPI/Flask/Django) |
| `package.json` + `next.config.*` | Next.js |
| `package.json` + `src/` or `index.ts` | Node.js (Express/Fastify) |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `Dockerfile` present | Pre-configured container |

Report the detected type and ask the user to confirm.

### Step 2: Validate or Generate Dockerfile

If a `Dockerfile` exists:
- Check for multi-stage build pattern
- Verify non-root user
- Check `.dockerignore` exists
- Suggest improvements if needed

If no `Dockerfile`:
- Generate an optimized Dockerfile for the detected framework
- Use multi-stage builds with distroless/slim base images
- Include health check endpoint exposure
- Show the Dockerfile to the user for approval

### Step 3: Gather Configuration

Collect required configuration — always ask, never assume a region:

```
PROJECT_ID:       (from gcloud config or ask user)
REGION:           (from gcloud config or ask user — do NOT default to us-central1)
SERVICE_NAME:     (from directory name or ask)
SERVICE_ACCOUNT:  (create new or use existing)
PORT:             8080 (or detect from Dockerfile/code)
MIN_INSTANCES:    0 for staging, 1 for production
MAX_INSTANCES:    10 (or ask)
MEMORY:           512Mi (or detect from requirements)
CPU:              1 (or detect)
```

### Step 4: Ensure Artifact Registry Repository

```bash
# Check if repo exists
gcloud artifacts repositories describe REPO_NAME \
  --project PROJECT_ID --location REGION 2>/dev/null

# Create if it doesn't exist
gcloud artifacts repositories create REPO_NAME \
  --project PROJECT_ID \
  --repository-format docker \
  --location REGION \
  --description "Container images for SERVICE_NAME"
```

### Step 5: Ensure Service Account

```bash
# Check if SA exists
gcloud iam service-accounts describe SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID 2>/dev/null

# Create if needed
gcloud iam service-accounts create SA_NAME \
  --project PROJECT_ID \
  --display-name "SERVICE_NAME Cloud Run SA"

# Grant minimum required roles
ROLES=(
  "roles/logging.logWriter"
  "roles/monitoring.metricWriter"
  "roles/cloudtrace.agent"
)
# Add roles based on detected integrations:
# - Secret Manager usage → roles/secretmanager.secretAccessor
# - Cloud SQL → roles/cloudsql.client
# - Pub/Sub → roles/pubsub.subscriber or roles/pubsub.publisher
# - Cloud Storage → roles/storage.objectViewer or roles/storage.objectUser
```

### Step 6: Build and Push Image

Option A — Direct `gcloud builds submit` (simplest):
```bash
gcloud builds submit . \
  --project PROJECT_ID \
  --tag REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG
```

Option B — Generate `cloudbuild.yaml` (for CI/CD setup):
- Generate the config file
- Submit with `gcloud builds submit --config cloudbuild.yaml`

Show the build logs and wait for success.

### Step 7: Deploy to Cloud Run

```bash
gcloud run deploy SERVICE_NAME \
  --image REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG \
  --project PROJECT_ID \
  --region REGION \
  --service-account SA@PROJECT_ID.iam.gserviceaccount.com \
  --port PORT \
  --memory MEMORY \
  --cpu CPU \
  --min-instances MIN_INSTANCES \
  --max-instances MAX_INSTANCES \
  --concurrency 80 \
  --set-secrets "KEY=SECRET:latest,..." \
  --allow-unauthenticated  # or --no-allow-unauthenticated
```

### Step 8: Verify Deployment

```bash
# Get the service URL
URL=$(gcloud run services describe SERVICE_NAME \
  --project PROJECT_ID --region REGION \
  --format="value(status.url)")

# Health check
curl -s -o /dev/null -w "%{http_code}" "$URL/health"

# Check revision status
gcloud run revisions list --service SERVICE_NAME \
  --project PROJECT_ID --region REGION --limit 3

# Tail logs for errors
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="SERVICE_NAME" AND severity>=WARNING' \
  --project PROJECT_ID --limit 10 --format json
```

### Step 9: Report

Provide a deployment summary:

```
Deployment Complete
---
Service:    SERVICE_NAME
URL:        https://SERVICE_NAME-xxxxx.a.run.app
Revision:   SERVICE_NAME-00001-abc
Region:     us-central1
Image:      REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG
SA:         sa@project.iam.gserviceaccount.com
Health:     200 OK
Traffic:    100% → latest revision
```

## Error Handling

- **Build failure**: Show the build log error, suggest fixes (missing dependencies, Dockerfile issues)
- **Deploy failure**: Check permissions (run.admin, iam.serviceAccountUser), quota, image existence
- **Health check failure**: Tail logs, check port configuration, verify the health endpoint exists
- **Permission denied**: Identify missing IAM roles and suggest the exact `gcloud` command to fix

## Safety

- Always confirm before creating billable resources (Cloud Run services, Artifact Registry repos)
- Never deploy without a service account (refuse to use default compute SA)
- Never set `--allow-unauthenticated` without explicit user confirmation
- Show the full deploy command before executing
