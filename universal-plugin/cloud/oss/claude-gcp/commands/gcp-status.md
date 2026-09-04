---
name: gcp-status
description: Show the health and status of a Cloud Run service — revisions, traffic, recent errors, and resource configuration.
arguments:
  - name: service
    description: Cloud Run service name
    required: true
  - name: region
    description: GCP region (default: from gcloud config)
    required: false
  - name: project
    description: GCP project ID (default: from gcloud config)
    required: false
---

## Instructions

When the user invokes `/gcp-status`, gather and display a comprehensive health dashboard for a Cloud Run service.

### Information to Collect

Run these commands and compile the results into a readable dashboard:

#### 1. Service Overview
```bash
gcloud run services describe SERVICE \
  --project PROJECT --region REGION \
  --format="yaml(metadata.name, status.url, spec.template.spec.serviceAccountName, \
    spec.template.spec.containers[0].resources, \
    spec.template.metadata.annotations.'autoscaling.knative.dev/minScale', \
    spec.template.metadata.annotations.'autoscaling.knative.dev/maxScale', \
    spec.template.spec.containerConcurrency)"
```

#### 2. Active Revisions and Traffic
```bash
gcloud run services describe SERVICE \
  --project PROJECT --region REGION \
  --format="table(status.traffic.revisionName, status.traffic.percent, status.traffic.tag)"

gcloud run revisions list --service SERVICE \
  --project PROJECT --region REGION \
  --format="table(metadata.name, metadata.creationTimestamp, status.conditions[0].status)" \
  --limit 5
```

#### 3. Recent Errors
```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="SERVICE" AND severity>=WARNING' \
  --project PROJECT --limit 10 --format json
```

#### 4. Health Check
```bash
# Store token in a variable — don't inline it in curl args (visible in ps aux)
TOKEN=$(gcloud auth print-identity-token --audiences="SERVICE_URL" 2>/dev/null || true)
CURL_CFG=$(mktemp) && chmod 600 "$CURL_CFG"
printf 'header = "Authorization: Bearer %s"\n' "$TOKEN" > "$CURL_CFG"

curl -s -o /dev/null -w "%{http_code}" -K "$CURL_CFG" "SERVICE_URL/health"

rm -f "$CURL_CFG"
```

### Output Format

Present as a clean dashboard:

```
Cloud Run Status: SERVICE_NAME
==========================================
URL:            https://...
Region:         us-central1
Service Account: sa@project.iam.gserviceaccount.com
Health:         200 OK

Resources:
  CPU:          1
  Memory:       512Mi
  Concurrency:  80
  Min Instances: 1
  Max Instances: 10

Traffic:
  REVISION-001  100%  (latest)

Recent Revisions:
  REVISION-001  2025-01-15  Ready
  REVISION-000  2025-01-14  Ready

Recent Errors: 0 in the last hour
==========================================
```

### Example Usage

```
/gcp-status my-api
/gcp-status my-api --region europe-west1
/gcp-status my-api --project my-project --region us-central1
```
