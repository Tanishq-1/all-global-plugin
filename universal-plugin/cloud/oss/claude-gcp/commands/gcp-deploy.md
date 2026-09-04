---
name: gcp-deploy
description: Interactive deployment wizard for Google Cloud Run. Detects project type, builds container, deploys, and verifies.
arguments:
  - name: service
    description: Cloud Run service name
    required: false
  - name: region
    description: GCP region (from gcloud config, or asks the user)
    required: false
  - name: project
    description: GCP project ID
    required: false
---

## Instructions

When the user invokes `/gcp-deploy`, act as the Deploy Agent to orchestrate a full deployment to Cloud Run.

### Workflow

1. **Detect** the project type by examining files in the current directory
2. **Validate** the Dockerfile (or offer to generate one)
3. **Confirm** configuration with the user:
   - Service name (from `--service` arg, directory name, or ask)
   - Region (from `--region` arg, gcloud config, or ask the user)
   - Project ID (from `--project` arg, gcloud config, or ask)
4. **Run pre-deploy checks** (validate Dockerfile, secrets, gcloud auth)
5. **Build** the container image and push to Artifact Registry
6. **Deploy** to Cloud Run with appropriate configuration
7. **Verify** the deployment (health check, revision status, error check)
8. **Report** the service URL, revision, and deployment summary

### Example Usage

```
/gcp-deploy
/gcp-deploy --service my-api --region us-central1
/gcp-deploy --service my-api --project my-project --region europe-west1
```

### Behavior

- Always show the full `gcloud` commands before executing them
- Confirm before creating billable resources
- Default to `--no-allow-unauthenticated` unless the user requests public access
- Create a purpose-specific service account if one doesn't exist
- Use Artifact Registry (never Container Registry)
- Tag images with the git SHA when available

### Error Recovery

- If the build fails, show the error and suggest fixes
- If the deploy fails, check permissions and quota
- If the health check fails, tail logs and suggest rollback
