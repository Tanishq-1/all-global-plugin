# Cloud Run Scaling

## Instance Scaling

Cloud Run autoscales from zero (or a configured minimum) based on incoming requests.

### Min Instances

Keep instances warm to avoid cold starts:

```bash
# Set minimum instances (eliminates cold starts but incurs idle cost)
gcloud run services update my-service \
  --project my-project --region us-central1 \
  --min-instances 1

# For production APIs with response time requirements (e.g., must respond within 200ms), set min-instances >= 1
# For dev/staging or batch services, 0 is fine
```

**Cost note**: Min instances are billed at idle rates (CPU is not allocated unless processing requests, with default CPU allocation). To keep CPU allocated at all times, use `--cpu-throttling=false` (always-on CPU).

### Max Instances

Cap the maximum to control costs and protect downstream services:

```bash
gcloud run services update my-service \
  --project my-project --region us-central1 \
  --max-instances 100
```

Choose max instances based on:
- Downstream capacity (database connection limits, API rate limits)
- Budget constraints
- Expected peak traffic with headroom

### Concurrency

Number of simultaneous requests per instance (default: 80, max: 1000):

```bash
gcloud run services update my-service \
  --project my-project --region us-central1 \
  --concurrency 80
```

Guidelines:
- **Async frameworks** (FastAPI, Express, Go): 80-250 depending on workload
- **CPU-heavy workloads** (image processing, ML inference): 1-10
- **Memory-heavy workloads**: Lower concurrency to prevent running out of memory
- **Single-threaded runtimes**: Start at 1, benchmark up

## CPU and Memory Allocation

```bash
gcloud run services update my-service \
  --project my-project --region us-central1 \
  --cpu 2 \
  --memory 1Gi
```

Available CPU/memory combinations:
| CPU | Memory Range |
|-----|-------------|
| 1   | 128Mi - 4Gi |
| 2   | 256Mi - 8Gi |
| 4   | 512Mi - 16Gi |
| 8   | 1Gi - 32Gi |

### CPU Allocation Modes

```bash
# Default: CPU only allocated during request processing
# Good for: request-driven workloads, cost optimization

# Always-on CPU: CPU allocated even when idle
# Good for: background tasks, websockets, long polling
gcloud run services update my-service \
  --project my-project --region us-central1 \
  --no-cpu-throttling
```

### Startup CPU Boost

Temporarily allocate additional CPU during instance startup to reduce cold start latency:

```bash
gcloud run services update my-service \
  --project my-project --region us-central1 \
  --cpu-boost
```

This gives the instance extra CPU during startup (up to the next CPU tier) at no additional cost.

## Cold Start Mitigation

Cold starts happen when a new instance is created. Strategies to minimize impact:

1. **Min instances >= 1** — Keeps warm instances ready
2. **CPU boost** — Speeds up container startup
3. **Optimize container image**:
   - Use slim/distroless base images
   - Minimize layer count and image size
   - Lazy-load heavy dependencies
4. **Startup probes** — Tell Cloud Run when your app is actually ready:
   ```bash
   gcloud run services update my-service \
     --project my-project --region us-central1 \
     --startup-probe-path /healthz \
     --startup-probe-initial-delay 0 \
     --startup-probe-timeout 3 \
     --startup-probe-period 3 \
     --startup-probe-failure-threshold 3
   ```
5. **Liveness probes** — Restart unhealthy instances:
   ```bash
   gcloud run services update my-service \
     --project my-project --region us-central1 \
     --liveness-probe-path /healthz \
     --liveness-probe-period 30 \
     --liveness-probe-failure-threshold 3
   ```

## Scaling to Zero

By default (min-instances=0), Cloud Run scales to zero when there are no requests. This is cost-efficient but introduces cold starts.

When to scale to zero:
- Development/staging environments
- Low-traffic services where latency spikes are acceptable
- Batch-triggered services (Cloud Tasks, Pub/Sub)

When NOT to scale to zero:
- Production APIs with response time requirements (e.g., must respond within 200ms)
- Services handling websocket connections
- Services with expensive initialization (ML model loading)

## GPU Support

For ML inference workloads, Cloud Run supports GPU attachment:

```bash
gcloud run deploy my-ml-service \
  --image IMAGE \
  --project my-project \
  --region us-central1 \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --cpu 8 \
  --memory 32Gi \
  --no-cpu-throttling \
  --concurrency 1
```

GPU availability is region-dependent. Check `gcloud run regions list` for GPU-enabled regions.
