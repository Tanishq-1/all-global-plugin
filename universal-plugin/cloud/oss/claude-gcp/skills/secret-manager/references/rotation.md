# Secret Rotation

**Rotating a secret changes the credential that running services depend on. If the new value isn't picked up by all consumers before the old one is disabled, services break.** Always rotate with the user's explicit knowledge and approval.

## Manual Rotation (Recommended)

Manual rotation keeps the user in control of every step. This is the safest approach and should be the default.

### Step-by-Step Process

```bash
# 1. Check which services currently use this secret
#    (so you know what will be affected by the rotation)
gcloud secrets get-iam-policy SECRET_NAME --project PROJECT_ID

# 2. Check current versions
gcloud secrets versions list SECRET_NAME --project PROJECT_ID

# 3. Add the new secret value as a new version
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME \
  --project PROJECT_ID \
  --data-file=-

# 4. Update consuming services to pick up the new version.
#    If services use "latest", they need a redeploy to refresh:
gcloud run services update SERVICE_NAME \
  --project PROJECT_ID --region REGION

#    If services pin a specific version number, update the reference:
gcloud run services update SERVICE_NAME \
  --project PROJECT_ID --region REGION \
  --set-secrets "DB_PASSWORD=db-password:NEW_VERSION_NUMBER"

# 5. Verify all consuming services are healthy with the new secret
#    (check logs, health endpoints, etc. before proceeding)

# 6. Only after confirming everything works — disable the old version
gcloud secrets versions disable OLD_VERSION_ID \
  --secret SECRET_NAME --project PROJECT_ID

# 7. Revoke the old credential at the source
#    (change the password in the database, invalidate the old API key
#    with the provider, etc.)
```

### What Can Go Wrong

- **Service uses a pinned version**: If a Cloud Run service references `db-password:3` and you add version 4, the service keeps using version 3 until you update the deploy config. Disabling version 3 before updating the service will break it.
- **Service uses `latest` but doesn't restart**: Cloud Run resolves `latest` at deploy time. Adding a new secret version doesn't automatically restart running instances. You need to trigger a new deployment.
- **Multiple consumers**: If three services use the same secret, all three must be updated and verified before the old version is disabled.
- **Old credential not revoked at source**: Disabling the secret version in Secret Manager only stops your services from reading it. The old password/key may still work at the source (database, API provider) until you explicitly revoke it there.

## Rotation Notifications

Get notified when a secret version is added (useful for auditing):

```bash
# Create a Pub/Sub topic for notifications
gcloud pubsub topics create secret-notifications --project PROJECT_ID

# Subscribe to secret version events
gcloud secrets update SECRET_NAME \
  --project PROJECT_ID \
  --add-topics projects/PROJECT_ID/topics/secret-notifications \
  --event-types SECRET_VERSION_ADD
```

## Automated Rotation (Advanced — Use With Caution)

Automated rotation can be set up using Cloud Scheduler + Cloud Functions, but **only do this if the user explicitly asks for it** and understands the risks:

- The rotation function must update BOTH the secret AND the downstream system (database, API) atomically
- If the downstream update fails and the secret version is already added, services may pick up a credential that doesn't work anywhere
- All consuming services must be configured to handle secret changes gracefully (use `latest` + automatic restarts, or have a refresh mechanism)
- The old version should NOT be automatically disabled — keep it enabled as a fallback until the next rotation cycle

If the user wants automated rotation, the architecture is:

```
Cloud Scheduler (cron) → Pub/Sub Topic → Cloud Function
                                            ├── Updates the credential at the source (DB, API)
                                            └── Adds a new version to Secret Manager
```

**Do not offer to set this up proactively.** Only configure it if the user specifically requests automated rotation and you've discussed the failure modes above.

## Expiration Policy

Setting a TTL on secrets forces them to expire, which can break services if rotation doesn't happen in time.

```bash
# Set TTL — versions will become inaccessible after this duration
gcloud secrets update SECRET_NAME \
  --project PROJECT_ID \
  --ttl 7776000s  # 90 days
```

**Before setting a TTL, confirm with the user:**
1. They have a rotation process in place (manual or automated) that will add a new version before expiry
2. They understand that expired versions become permanently inaccessible to consuming services
3. They want expiry as a security enforcement mechanism, not just a reminder
