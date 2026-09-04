# Cloud Run Troubleshooting

## Cold Starts

**Symptom**: First request after idle period has high latency (1-30s depending on image size and initialization).

**Diagnosis**:
```bash
# Check if min-instances is 0
gcloud run services describe my-service \
  --project my-project --region us-central1 \
  --format="value(spec.template.spec.containerConcurrency, spec.template.metadata.annotations)"

# Check instance startup time in logs
gcloud logging read 'resource.type="cloud_run_revision" AND textPayload=~"Started"' \
  --project my-project --limit 10 --format json
```

**Fixes** (in order of impact):
1. Set `--min-instances 1` (eliminates cold starts entirely)
2. Enable `--cpu-boost` (faster startup at no extra cost)
3. Reduce container image size (smaller image = faster pull)
4. Defer heavy initialization (lazy-load ML models, DB connection pools)
5. Use startup probes so Cloud Run knows when you're actually ready

## 503 Service Unavailable

**Symptom**: Requests return 503 errors.

**Common causes and fixes**:

### Container failing to start
```bash
# Check revision status
gcloud run revisions describe REVISION_NAME \
  --project my-project --region us-central1

# Check container logs for startup errors
gcloud logging read 'resource.type="cloud_run_revision" AND severity>=ERROR' \
  --project my-project --limit 20 --format json
```

### Port mismatch
The container must listen on the port specified by `--port` (or the `PORT` env var, default 8080):
```bash
# Verify the configured port
gcloud run services describe my-service \
  --project my-project --region us-central1 \
  --format="value(spec.template.spec.containers[0].ports[0].containerPort)"
```

### All instances at max concurrency
```bash
# Check if you're hitting max instances
gcloud monitoring read \
  'metric.type="run.googleapis.com/container/instance_count"' \
  --project my-project
```
Fix: Increase `--max-instances` or `--concurrency`.

### Health check failures
If startup or liveness probes fail, Cloud Run won't route traffic:
```bash
gcloud logging read 'resource.type="cloud_run_revision" AND textPayload=~"health check"' \
  --project my-project --limit 10
```

## Memory Limit Exceeded (Out of Memory)

**Symptom**: Container killed with exit code 137, logs show "Memory limit exceeded".

**Diagnosis**:
```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND textPayload=~"memory"' \
  --project my-project --limit 10

# Check current memory setting
gcloud run services describe my-service \
  --project my-project --region us-central1 \
  --format="value(spec.template.spec.containers[0].resources.limits.memory)"
```

**Fixes**:
1. Increase memory: `--memory 1Gi` (or 2Gi, 4Gi, etc.)
2. Reduce concurrency to lower per-instance memory pressure
3. Profile your application for memory leaks
4. For Python: watch for large DataFrames, unbounded caches, or forked processes

## Request Timeout (504)

**Symptom**: Long-running requests return 504 Gateway Timeout.

**Default timeout**: 300 seconds (5 minutes). Maximum: 3600 seconds (1 hour).

```bash
# Increase request timeout
gcloud run services update my-service \
  --project my-project --region us-central1 \
  --timeout 600

# For very long operations, consider:
# - Cloud Run Jobs instead of services
# - Cloud Tasks for async processing
# - Pub/Sub for event-driven workflows
```

## Permission Denied Errors

**Symptom**: Service returns 403 or logs show "Permission denied".

### Service-to-service auth
```bash
# Ensure the calling service's SA has roles/run.invoker on the target
gcloud run services add-iam-policy-binding TARGET_SERVICE \
  --project my-project --region us-central1 \
  --member="serviceAccount:CALLER_SA@PROJECT.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### Secret Manager access
```bash
# Grant the Cloud Run SA access to the secret
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --project my-project \
  --member="serviceAccount:SA@PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Cloud SQL access
```bash
# The SA needs roles/cloudsql.client
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:SA@PROJECT.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

## Deployment Failures

**Symptom**: `gcloud run deploy` fails.

### Image not found
```bash
# Verify the image exists in Artifact Registry
gcloud artifacts docker images list REGION-docker.pkg.dev/PROJECT/REPO \
  --include-tags --filter="tags:TAG"
```

### Insufficient permissions
The deploying user/SA needs:
- `roles/run.admin` (deploy and manage services)
- `roles/iam.serviceAccountUser` (act as the service's SA)
- `roles/artifactregistry.reader` (pull images)

### Quota exceeded
```bash
# Check Cloud Run quotas
gcloud run regions describe REGION --project my-project
```

## Debugging Live Traffic

### Tail logs in real-time
```bash
gcloud logging tail 'resource.type="cloud_run_revision" AND resource.labels.service_name="my-service"' \
  --project my-project
```

### Filter by severity
```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="my-service" AND severity>=WARNING' \
  --project my-project --limit 50 --format json
```

### Check traffic distribution
```bash
gcloud run services describe my-service \
  --project my-project --region us-central1 \
  --format="table(status.traffic.revisionName, status.traffic.percent, status.traffic.tag)"
```
