# Cloud Run + FastAPI Template

FastAPI starter for Cloud Run with structured logging and a health check endpoint.

## What's Included

- `main.py` — FastAPI app with health endpoint and structured logging
- `Dockerfile` — Multi-stage build with distroless base image
- `.dockerignore` — Excludes unnecessary files from build context
- `cloudbuild.yaml` — Cloud Build pipeline (build, push, deploy)
- `requirements.txt` — Python dependencies

## Quick Start

```bash
# 1. Copy this template
cp -r templates/cloud-run-fastapi/ my-api/
cd my-api/

# 2. Set your project
export PROJECT_ID=my-project
export REGION=us-central1
export SERVICE=my-api

# 3. Create a service account
gcloud iam service-accounts create my-api-runner \
  --project $PROJECT_ID \
  --display-name "My API Cloud Run SA"

# 4. Deploy
gcloud builds submit . \
  --project $PROJECT_ID \
  --substitutions _REGION=$REGION,_SERVICE=$SERVICE,_SERVICE_ACCOUNT=my-api-runner@$PROJECT_ID.iam.gserviceaccount.com
```

## Configuration

Environment variables set via Secret Manager:
- `DB_HOST` — Cloud SQL instance connection string
- `DB_PASSWORD` — Database password (from Secret Manager)
- `API_KEY` — External API key (from Secret Manager)

## Customization

1. Add your application code and routes in `main.py`
2. Add dependencies to `requirements.txt`
3. Update `cloudbuild.yaml` substitutions for your project
4. Add secrets to Secret Manager and reference them in the deploy step
