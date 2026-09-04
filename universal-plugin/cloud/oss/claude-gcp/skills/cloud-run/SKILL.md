---
name: cloud-run
description: Deploy, scale, and configure Cloud Run services and jobs. Covers deployments, traffic management, scaling, Dockerfiles, domain mapping, and integration patterns.
trigger_phrases:
  - deploy to cloud run
  - scale my service
  - cloud run config
  - cold start
  - traffic splitting
  - canary deployment
  - blue-green deploy
  - cloud run job
  - domain mapping
---

## Safety

Before running ANY gcloud command from this skill, you MUST follow the GCP Safety Protocol defined in CLAUDE.md. Explain what the command does, what it affects, billing impact, and reversibility. Get user confirmation before executing. The `gcp-command-guard` hook will block destructive and risky commands automatically — you must explain and get confirmation before re-attempting.

## Instructions

When the user asks about Cloud Run, generate commands following these patterns.

### Deploying Services

Generate `gcloud run deploy` commands with explicit flags. Never rely on interactive prompts or implicit defaults.

Required flags for every deploy:
```
gcloud run deploy SERVICE_NAME \
  --image REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG \
  --project PROJECT_ID \
  --region REGION \
  --service-account SA_EMAIL \
  --port PORT
```

Key optional flags to consider:
- `--set-secrets` for Secret Manager integration (prefer over `--set-env-vars` for sensitive values)
- `--vpc-connector` for private networking
- `--min-instances` / `--max-instances` for scaling bounds
- `--concurrency` for request concurrency per instance
- `--cpu` and `--memory` for resource allocation
- `--cpu-boost` for cold start mitigation
- `--ingress` to restrict traffic (`all`, `internal`, `internal-and-cloud-load-balancing`)
- `--no-allow-unauthenticated` for private services (default to this unless explicitly public)

### Container Images

Always use Artifact Registry (not Container Registry, which is deprecated):
```
REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/IMAGE_NAME:TAG
```

For Dockerfiles, recommend:
- Multi-stage builds to minimize image size
- Distroless or slim base images for production
- Non-root user execution
- `.dockerignore` to exclude unnecessary files

### Traffic Management

For blue-green and canary deployments, use revision tags and traffic splitting:
```bash
# Deploy new revision without traffic
gcloud run deploy SERVICE --image NEW_IMAGE --no-traffic --tag canary

# Test the tagged URL: https://canary---SERVICE-HASH.a.run.app

# Gradually shift traffic
gcloud run services update-traffic SERVICE --to-revisions REVISION=10

# Full cutover
gcloud run services update-traffic SERVICE --to-latest
```

### Cloud Run Jobs

For batch workloads that run to completion:
```bash
gcloud run jobs create JOB_NAME \
  --image IMAGE \
  --project PROJECT_ID \
  --region REGION \
  --service-account SA_EMAIL \
  --tasks TASK_COUNT \
  --max-retries MAX_RETRIES \
  --task-timeout TIMEOUT
```

Schedule jobs with Cloud Scheduler for cron-based execution.

### Integration Patterns

- **Cloud SQL**: Use Unix socket (`/cloudsql/CONNECTION_NAME`) or Private IP with VPC connector
- **Pub/Sub**: Push subscriptions to Cloud Run endpoints (configure SA with `roles/run.invoker`)
- **Cloud Tasks**: HTTP targets to Cloud Run with OIDC authentication
- **Secret Manager**: Mount as env vars or volumes via `--set-secrets`

### Key Principles

1. **Never use the default compute service account.** Create a purpose-specific SA with least-privilege roles.
2. **Default to private.** Use `--no-allow-unauthenticated` unless the service must be public.
3. **Use Artifact Registry.** Container Registry is deprecated.
4. **Structured logging.** Output JSON to stdout — Cloud Run automatically ingests it to Cloud Logging.
5. **Health checks.** Always include a health/readiness endpoint.

## References

For detailed patterns, see:
- [Deploy Patterns](references/deploy-patterns.md) — Blue-green, canary, traffic splitting strategies
- [Scaling](references/scaling.md) — Min/max instances, concurrency, CPU allocation, cold starts
- [Troubleshooting](references/troubleshooting.md) — Cold starts, 503s, memory limits, timeout issues
