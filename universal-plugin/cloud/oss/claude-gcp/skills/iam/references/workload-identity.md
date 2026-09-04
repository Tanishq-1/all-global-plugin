# Workload Identity Federation (WIF)

Workload Identity Federation allows external identities (GitHub Actions, AWS, Azure, Kubernetes) to authenticate to GCP without service account keys.

## GitHub Actions Setup

### 1. Create the Workload Identity Pool

```bash
gcloud iam workload-identity-pools create github-pool \
  --project PROJECT_ID \
  --location global \
  --display-name "GitHub Actions Pool"
```

### 2. Create the OIDC Provider

```bash
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project PROJECT_ID \
  --location global \
  --workload-identity-pool github-pool \
  --display-name "GitHub Actions Provider" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "\
google.subject=assertion.sub,\
attribute.actor=assertion.actor,\
attribute.repository=assertion.repository,\
attribute.repository_owner=assertion.repository_owner,\
attribute.ref=assertion.ref" \
  --attribute-condition "assertion.repository_owner=='YOUR_ORG'"
```

**Security**: The `attribute-condition` restricts which GitHub repos can authenticate. Always restrict by org at minimum; restrict by specific repo for production.

### 3. Create a Service Account

```bash
gcloud iam service-accounts create github-deploy \
  --project PROJECT_ID \
  --display-name "GitHub Actions Deploy SA"

# Grant the roles the deploy workflow needs
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member "serviceAccount:github-deploy@PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member "serviceAccount:github-deploy@PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member "serviceAccount:github-deploy@PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/artifactregistry.writer"
```

### 4. Allow the Provider to Impersonate the SA

```bash
# Allow a specific repo
gcloud iam service-accounts add-iam-policy-binding \
  github-deploy@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID \
  --role "roles/iam.workloadIdentityUser" \
  --member "principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_ORG/YOUR_REPO"

# Or restrict to a specific branch
gcloud iam service-accounts add-iam-policy-binding \
  github-deploy@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID \
  --role "roles/iam.workloadIdentityUser" \
  --member "principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.ref/refs/heads/main"
```

### 5. GitHub Actions Workflow

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write  # Required for OIDC

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider'
          service_account: 'github-deploy@PROJECT_ID.iam.gserviceaccount.com'

      - uses: google-github-actions/setup-gcloud@v2

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy my-service \
            --image us-central1-docker.pkg.dev/${{ env.PROJECT_ID }}/my-repo/my-image:${{ github.sha }} \
            --region us-central1 \
            --quiet
```

## AWS Federation

Allow AWS workloads to authenticate to GCP:

```bash
# Create an AWS provider
gcloud iam workload-identity-pools providers create-aws aws-provider \
  --project PROJECT_ID \
  --location global \
  --workload-identity-pool my-pool \
  --account-id AWS_ACCOUNT_ID \
  --attribute-mapping "\
google.subject=assertion.arn,\
attribute.aws_role=assertion.arn.extract('assumed-role/{role}/')"
```

## Kubernetes (GKE) Workload Identity

For GKE pods to authenticate as GCP service accounts:

```bash
# Enable Workload Identity on the cluster
gcloud container clusters update CLUSTER \
  --project PROJECT_ID --region REGION \
  --workload-pool PROJECT_ID.svc.id.goog

# Create a K8s service account
kubectl create serviceaccount KSA_NAME --namespace NAMESPACE

# Bind the K8s SA to a GCP SA
gcloud iam service-accounts add-iam-policy-binding GSA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID \
  --role "roles/iam.workloadIdentityUser" \
  --member "serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA_NAME]"

# Annotate the K8s SA
kubectl annotate serviceaccount KSA_NAME \
  --namespace NAMESPACE \
  iam.gke.io/gcp-service-account=GSA@PROJECT_ID.iam.gserviceaccount.com
```

## Troubleshooting WIF

### Token exchange fails
```bash
# Verify the pool and provider exist
gcloud iam workload-identity-pools providers describe github-provider \
  --project PROJECT_ID \
  --location global \
  --workload-identity-pool github-pool

# Check attribute conditions
gcloud iam workload-identity-pools providers describe github-provider \
  --project PROJECT_ID \
  --location global \
  --workload-identity-pool github-pool \
  --format="value(attributeCondition)"
```

### Permission denied after authentication
```bash
# Verify the SA has the workloadIdentityUser binding
gcloud iam service-accounts get-iam-policy SA@PROJECT_ID.iam.gserviceaccount.com \
  --project PROJECT_ID \
  --format json

# Check the principal matches the expected format
# GitHub: principalSet://...attribute.repository/ORG/REPO
# AWS: principalSet://...attribute.aws_role/ROLE_NAME
```

### Common mistakes
1. Missing `id-token: write` permission in GitHub Actions workflow
2. Wrong PROJECT_NUMBER (not PROJECT_ID) in the provider URI
3. Attribute condition too restrictive or too permissive
4. SA doesn't have the actual GCP permissions needed (separate from WIF binding)
