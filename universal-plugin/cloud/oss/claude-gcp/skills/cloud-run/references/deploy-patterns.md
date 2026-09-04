# Cloud Run Deploy Patterns

## Standard Deployment

The simplest deploy replaces the current revision and routes 100% of traffic:

```bash
gcloud run deploy my-service \
  --image us-central1-docker.pkg.dev/my-project/my-repo/my-image:v1.2.0 \
  --project my-project \
  --region us-central1 \
  --service-account my-service-sa@my-project.iam.gserviceaccount.com \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 80 \
  --set-secrets DB_PASSWORD=db-password:latest \
  --no-allow-unauthenticated
```

## Blue-Green Deployment

Deploy a new revision without traffic, validate, then switch:

```bash
# 1. Deploy new revision with a tag, no traffic
gcloud run deploy my-service \
  --image us-central1-docker.pkg.dev/my-project/my-repo/my-image:v2.0.0 \
  --project my-project \
  --region us-central1 \
  --no-traffic \
  --tag green

# 2. Test the tagged URL
# https://green---my-service-xxxxx.a.run.app/health

# 3. Switch 100% traffic to the new revision
gcloud run services update-traffic my-service \
  --project my-project \
  --region us-central1 \
  --to-latest
```

## Canary Deployment

Gradually shift traffic to validate the new revision under production load:

```bash
# 1. Deploy new revision, no traffic
gcloud run deploy my-service \
  --image us-central1-docker.pkg.dev/my-project/my-repo/my-image:v2.0.0 \
  --project my-project \
  --region us-central1 \
  --no-traffic \
  --tag canary

# 2. Send 5% of traffic to the canary
gcloud run services update-traffic my-service \
  --project my-project \
  --region us-central1 \
  --to-tags canary=5

# 3. Check the canary before increasing traffic.
#    Run these commands and compare the canary revision against the stable one.

# Check for errors on the canary revision in the last 10 minutes:
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="my-service" AND severity>=ERROR' \
  --project my-project --limit 20 --freshness=10m --format="table(timestamp, textPayload)"

# Check request latency and status codes:
gcloud run services describe my-service \
  --project my-project --region us-central1 \
  --format="table(status.traffic.revisionName, status.traffic.percent, status.traffic.tag)"

# What to look for before increasing traffic:
#   - No new ERROR-level logs from the canary revision
#   - HTTP 5xx rate is not higher than the stable revision
#   - Response latency is comparable to the stable revision
#   - The health endpoint returns 200:
curl -s -o /dev/null -w "%{http_code}" https://canary---my-service-xxxxx.a.run.app/health

# 4. If healthy, increase to 25%
gcloud run services update-traffic my-service \
  --project my-project \
  --region us-central1 \
  --to-tags canary=25

# Repeat the checks above. Then increase to 50%, check again, then 100%.

# 5. Full cutover
gcloud run services update-traffic my-service \
  --project my-project \
  --region us-central1 \
  --to-latest
```

## Rollback

Instantly roll back to a previous revision:

```bash
# List revisions
gcloud run revisions list --service my-service \
  --project my-project --region us-central1

# Route 100% traffic to the previous revision
gcloud run services update-traffic my-service \
  --project my-project \
  --region us-central1 \
  --to-revisions my-service-00042-abc=100
```

## Revision Cleanup

Cloud Run retains all revisions by default. Old revisions you're not using don't cost anything (they're scaled to zero), so there is no urgency to delete them. Users may want to keep old revisions for rollback.

**Before deleting any revision, always:**
1. List all revisions and their traffic allocation so the user can see what exists
2. Confirm which specific revision(s) the user wants to delete and why
3. Warn that deleted revisions cannot be recovered

```bash
# List all revisions and their status
gcloud run revisions list --service my-service \
  --project my-project --region us-central1

# List only revisions NOT currently serving traffic
gcloud run revisions list --service my-service \
  --project my-project --region us-central1 \
  --filter="status.conditions.type=Active AND status.conditions.status=False"

# Delete a specific revision (only after user confirms)
gcloud run revisions delete my-service-00040-xyz \
  --project my-project --region us-central1
```

## Domain Mapping

Map a custom domain to a Cloud Run service:

```bash
# Verify domain ownership (one-time)
gcloud domains verify DOMAIN

# Create the mapping
gcloud run domain-mappings create \
  --service my-service \
  --domain api.example.com \
  --project my-project \
  --region us-central1

# Follow the DNS record instructions output by the command
```

For production, prefer using a Global External HTTPS Load Balancer with a Serverless NEG instead of direct domain mapping — it gives you Cloud CDN, Cloud Armor, and SSL certificate management.

## Multi-Region Deployment

Deploy the same service to multiple regions behind a load balancer:

```bash
REGIONS="us-central1 europe-west1 asia-east1"
for REGION in $REGIONS; do
  gcloud run deploy my-service \
    --image us-central1-docker.pkg.dev/my-project/my-repo/my-image:v1.0.0 \
    --project my-project \
    --region $REGION \
    --service-account my-service-sa@my-project.iam.gserviceaccount.com
done
```

Then configure a Global External HTTPS Load Balancer with Serverless NEGs pointing to each regional service.
