# Secret Manager Access Patterns

## Cloud Run — Environment Variables

The most common pattern. Secrets are injected as env vars at container startup.

```bash
gcloud run deploy my-service \
  --project PROJECT_ID --region us-central1 \
  --image IMAGE \
  --set-secrets "\
DB_HOST=db-host:latest,\
DB_PASSWORD=db-password:3,\
API_KEY=stripe-api-key:latest"
```

Behavior:
- Secret values are resolved at deploy time (for pinned versions) or container start (for `latest`)
- Changing a secret version with `latest` requires a new deployment or revision restart
- Use pinned versions (`db-password:3`) in production for predictable behavior

## Cloud Run — Volume Mounts

Mount secrets as files. Use for certificates, JSON service account keys, or multi-line configs.

```bash
gcloud run deploy my-service \
  --project PROJECT_ID --region us-central1 \
  --image IMAGE \
  --set-secrets "\
/secrets/tls/cert.pem=tls-certificate:latest,\
/secrets/tls/key.pem=tls-private-key:latest,\
/secrets/config/firebase.json=firebase-config:latest"
```

In your application, read from the mounted path:
```python
import json

with open("/secrets/config/firebase.json") as f:
    firebase_config = json.load(f)
```

## Cloud Build — Build-Time Secrets

For secrets needed during the build process, Cloud Build can pull them from Secret Manager and expose them as environment variables to specific steps using `secretEnv`:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'IMAGE', '.']
    secretEnv: ['BUILD_SECRET']

availableSecrets:
  secretManager:
    - versionName: projects/PROJECT_ID/secrets/my-secret/versions/latest
      env: BUILD_SECRET
```

How this works:
- `availableSecrets` tells Cloud Build which secrets to fetch from Secret Manager
- `secretEnv` on a step makes the secret available as an environment variable (`$$BUILD_SECRET`) inside that step only
- The secret is never written to disk or baked into the image — it exists only in the step's process environment

**Never pass secrets as `--build-arg`** — build args are saved in the image layer history and can be read by anyone who pulls the image.

## Cloud Functions

```bash
gcloud functions deploy my-function \
  --project PROJECT_ID --region us-central1 \
  --runtime python312 \
  --set-secrets "DB_PASSWORD=db-password:latest"
```

Or as volume mounts:
```bash
gcloud functions deploy my-function \
  --project PROJECT_ID --region us-central1 \
  --runtime python312 \
  --set-secrets "/secrets/config.json=app-config:latest"
```

## Cross-Project Access

Access secrets from a different project:

```bash
# Grant the consuming SA access to the secret in the source project
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --project SOURCE_PROJECT_ID \
  --member "serviceAccount:SA@CONSUMER_PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/secretmanager.secretAccessor"

# Reference cross-project secrets in Cloud Run
gcloud run deploy my-service \
  --project CONSUMER_PROJECT_ID --region us-central1 \
  --image IMAGE \
  --set-secrets "DB_PASSWORD=projects/SOURCE_PROJECT_ID/secrets/db-password:latest"
```

## Programmatic Access

### Python

```python
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()

name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
response = client.access_secret_version(request={"name": name})
secret_value = response.payload.data.decode("UTF-8")
```

### Node.js

```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

async function getSecret(projectId, secretId) {
  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${secretId}/versions/latest`,
  });
  return version.payload.data.toString('utf8');
}
```

### Go

```go
import secretmanager "cloud.google.com/go/secretmanager/apiv1"

func getSecret(projectID, secretID string) (string, error) {
    ctx := context.Background()
    client, _ := secretmanager.NewClient(ctx)
    defer client.Close()

    name := fmt.Sprintf("projects/%s/secrets/%s/versions/latest", projectID, secretID)
    result, err := client.AccessSecretVersion(ctx, &secretmanagerpb.AccessSecretVersionRequest{Name: name})
    if err != nil {
        return "", err
    }
    return string(result.Payload.Data), nil
}
```

## Replication Policies

### Automatic

Google chooses which regions to store copies of the secret in. You don't control where, but it's replicated for availability:
```bash
gcloud secrets create SECRET_NAME \
  --project PROJECT_ID \
  --replication-policy automatic
```

### User-Managed

You specify exactly which regions store the secret. Use this when regulations require data to stay in specific regions:
```bash
gcloud secrets create SECRET_NAME \
  --project PROJECT_ID \
  --replication-policy user-managed \
  --locations us-central1,us-east1
```

Use user-managed replication when:
- Data residency requirements mandate specific regions
- Compliance requires knowing where secrets are stored
- You need CMEK (Customer-Managed Encryption Keys) per region
