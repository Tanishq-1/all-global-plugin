---
name: secret-manager
description: Create, version, and mount secrets from Secret Manager. Covers Cloud Run integration, rotation, cross-project access, and migration from env vars.
trigger_phrases:
  - secrets
  - secret manager
  - env vars
  - credentials
  - rotation
  - sensitive config
  - API key storage
---

## Safety

Before running ANY gcloud command from this skill, you MUST follow the GCP Safety Protocol defined in CLAUDE.md. Secret operations are sensitive — destroying a secret version is irreversible. Explain what the command does and get user confirmation before executing. The `gcp-command-guard` hook will block destructive commands automatically.

## Instructions

When the user asks about secrets, credentials, or API keys, generate commands following these patterns.

### Creating Secrets

```bash
# Create a secret
gcloud secrets create SECRET_NAME \
  --project PROJECT_ID \
  --replication-policy automatic  # Google chooses where to store copies; use "user-managed" to pick specific regions

# Add a version (the actual secret value)
echo -n "my-secret-value" | gcloud secrets versions add SECRET_NAME \
  --project PROJECT_ID \
  --data-file=-

# Or from a file
gcloud secrets versions add SECRET_NAME \
  --project PROJECT_ID \
  --data-file=path/to/secret.txt
```

### Cloud Run Integration

Mount secrets as environment variables or files — never bake them into images.

```bash
# As environment variables (most common)
gcloud run deploy SERVICE \
  --project PROJECT_ID --region REGION \
  --image IMAGE \
  --set-secrets "DB_PASSWORD=db-password:latest,API_KEY=api-key:latest"

# As volume mounts (for files like certificates, JSON keys)
gcloud run deploy SERVICE \
  --project PROJECT_ID --region REGION \
  --image IMAGE \
  --set-secrets "/secrets/tls.crt=tls-cert:latest,/secrets/tls.key=tls-key:latest"

# Pin to a specific version (recommended for production)
gcloud run deploy SERVICE \
  --project PROJECT_ID --region REGION \
  --image IMAGE \
  --set-secrets "DB_PASSWORD=db-password:5"
```

### Granting Access

The service account running your Cloud Run service needs `secretmanager.secretAccessor`:

```bash
# Grant access to a specific secret
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --project PROJECT_ID \
  --member "serviceAccount:SA@PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/secretmanager.secretAccessor"
```

Prefer per-secret bindings over project-level `roles/secretmanager.secretAccessor` — only grant access to the secrets the service actually needs.

### Secret Versioning

```bash
# List versions
gcloud secrets versions list SECRET_NAME --project PROJECT_ID

# Access a specific version
gcloud secrets versions access VERSION_ID --secret SECRET_NAME --project PROJECT_ID

# Disable a version (prevents access but retains data)
gcloud secrets versions disable VERSION_ID --secret SECRET_NAME --project PROJECT_ID

# Destroy a version (irreversible)
gcloud secrets versions destroy VERSION_ID --secret SECRET_NAME --project PROJECT_ID
```

### Cloud Build Integration

Inject secrets at build time without baking them into images:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '--build-arg', 'NPM_TOKEN=$$NPM_TOKEN', '-t', 'IMAGE', '.']
    secretEnv: ['NPM_TOKEN']

availableSecrets:
  secretManager:
    - versionName: projects/PROJECT_ID/secrets/npm-token/versions/latest
      env: NPM_TOKEN
```

### Migration from .env Files

When migrating existing projects from `.env` files to Secret Manager:

```bash
# Bulk create secrets from a .env file
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  echo -n "$value" | gcloud secrets create "$key" \
    --project PROJECT_ID \
    --replication-policy automatic \  # Google chooses storage regions
    --data-file=-
  echo "Created secret: $key"
done < .env
```

Then update Cloud Run to mount them:
```bash
# Build the --set-secrets flag from the .env keys
SECRETS=$(grep -v '^#' .env | grep -v '^$' | cut -d= -f1 | \
  awk '{printf "%s=%s:latest,", $1, $1}' | sed 's/,$//')

gcloud run deploy SERVICE \
  --project PROJECT_ID --region REGION \
  --image IMAGE \
  --set-secrets "$SECRETS"
```

### Key Principles

1. **Never hardcode secrets** in source code, environment variables, or Docker images.
2. **Use Secret Manager** for all sensitive values (DB passwords, API keys, tokens, certificates).
3. **Per-secret IAM bindings** — only grant access to the secrets a service needs.
4. **Pin versions in production** — use explicit version numbers, not `latest`.
5. **Rotate with user involvement** — never rotate secrets automatically without the user's knowledge. See [Rotation](references/rotation.md) for the step-by-step process.

## References

For detailed patterns, see:
- [Rotation](references/rotation.md) — Automatic rotation with Cloud Functions
- [Access Patterns](references/access-patterns.md) — Cloud Run mounting, cross-project access, replication
