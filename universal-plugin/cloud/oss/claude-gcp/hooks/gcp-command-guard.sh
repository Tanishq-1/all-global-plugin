#!/usr/bin/env bash
# gcp-command-guard.sh — PreToolUse hook that intercepts GCP CLI commands
#
# This hook fires BEFORE any Bash tool call. It inspects the command for
# gcloud/gsutil/bq/kubectl usage and classifies the risk level.
#
# Exit codes:
#   0 = Allow the command to proceed
#   2 = Block the command (feedback is sent back to Claude)
#
# Claude Code feeds the tool input as JSON on stdin:
#   { "tool_input": { "command": "gcloud run deploy ..." } }

set -euo pipefail

# --- Fail-closed parsing ---
# If we can't read or parse the command for any reason, BLOCK it.
# A security guard that fails open is no guard at all.

INPUT=$(cat)

# Require jq — if it's missing, block everything and tell the user
if ! command -v jq &>/dev/null; then
  echo "BLOCKED: jq is required for the GCP command guard but is not installed. Install it with: brew install jq (macOS) or sudo apt install jq (Linux)" >&2
  exit 2
fi

# Parse the command from the tool input JSON
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
PARSE_STATUS=$?

# If jq failed or returned empty, block — don't silently allow unknown commands
if [ "$PARSE_STATUS" -ne 0 ] || [ -z "$CMD" ]; then
  echo "BLOCKED: Could not parse the Bash command from tool input. The GCP command guard cannot verify this is safe to run. If this is not a GCP command, check that the hook input format matches { \"tool_input\": { \"command\": \"...\" } }." >&2
  exit 2
fi

# Check if the command contains any GCP CLI tools or database CLIs
IS_GCP=false
IS_DB_CLI=false

if echo "$CMD" | grep -qE '(gcloud|gsutil|bq |kubectl)'; then
  IS_GCP=true
fi

# Also intercept direct database CLIs that could target GCP-hosted databases
if echo "$CMD" | grep -qE '(mysql|psql|mongosh|redis-cli|cbt )'; then
  IS_DB_CLI=true
fi

if ! $IS_GCP && ! $IS_DB_CLI; then
  exit 0
fi

# =====================================================================
# DATABASE PROTECTION — Checked first because data loss is irreversible
# =====================================================================
#
# This section catches BOTH explicit deletion AND indirect operations
# that cause data loss (schema changes forcing recreation, overwrites,
# dangerous SQL piped through connections, etc.)
# =====================================================================

# --- DB-1: Explicit database/instance deletion ---
DB_DELETE_PATTERN='(sql instances delete|sql databases delete|spanner instances delete|spanner databases delete|firestore databases delete|bigtable instances delete|bigtable tables delete|alloydb instances delete|alloydb clusters delete|redis instances delete|memorystore instances delete)'
if echo "$CMD" | grep -qiE "$DB_DELETE_PATTERN"; then
  cat >&2 <<'FEEDBACK'
BLOCKED: Database instance or database deletion detected.

This will PERMANENTLY DESTROY the database and all data it contains.
For Cloud SQL instances, all databases, users, and replicas are also deleted.

Before running this command, you MUST explain to the user:
1. Exactly which database/instance is being deleted and what data it holds
2. This is IRREVERSIBLE — there is no undo
3. Whether a recent backup exists and how to restore from it
4. Whether deletion protection is currently enabled (if so, it must be disabled first — that's a deliberate two-step safety)
5. Recommend creating a final backup before deletion:
   gcloud sql backups create --instance=INSTANCE

Get explicit "yes, delete it" confirmation from the user before re-running.
FEEDBACK
  exit 2
fi

# --- DB-2: BigQuery destructive operations ---
if echo "$CMD" | grep -qiE '(bq rm|bq remove)'; then
  cat >&2 <<'FEEDBACK'
BLOCKED: BigQuery resource deletion detected (bq rm).

bq rm can delete datasets (and ALL tables within them), individual tables,
views, materialized views, or routines.

Before running this command, you MUST explain to the user:
1. What is being deleted (dataset, table, or view) and its contents
2. If deleting a dataset: this deletes ALL tables inside it — list them first
3. Whether time travel recovery is possible (BigQuery retains deleted table data for 7 days via time travel)
4. Suggest listing the resource first:
   bq ls DATASET  (to see tables before deleting a dataset)
   bq show DATASET.TABLE  (to see table info before deleting)

Get explicit confirmation before re-running.
FEEDBACK
  exit 2
fi

# --- DB-3: Cloud SQL instance patch with recreation-triggering flags ---
if echo "$CMD" | grep -qiE 'sql instances patch'; then
  DANGEROUS_PATCH=false
  REASON=""

  if echo "$CMD" | grep -qiE '\-\-database-version'; then
    DANGEROUS_PATCH=true
    REASON="Changing --database-version (e.g., POSTGRES_14 to POSTGRES_15) forces a major version upgrade. This can cause extended downtime, may require dump-and-restore for some versions, and can break applications that depend on version-specific behavior."
  fi
  if echo "$CMD" | grep -qiE '\-\-storage-type'; then
    DANGEROUS_PATCH=true
    REASON="Changing --storage-type (HDD to SSD or vice versa) forces instance recreation. The instance will be stopped, data migrated, and restarted. This causes significant downtime."
  fi
  if echo "$CMD" | grep -qiE '\-\-no-database-flags'; then
    DANGEROUS_PATCH=true
    REASON="--no-database-flags CLEARS ALL database flags on the instance. This can disable replication settings, change connection behavior, reset performance tuning, or break applications that depend on specific flag values."
  fi

  if $DANGEROUS_PATCH; then
    cat >&2 <<FEEDBACK
BLOCKED: Cloud SQL instance patch with potentially destructive flag detected.

$REASON

Before running this command, you MUST explain to the user:
1. What this flag change actually does to the running instance
2. Expected downtime and whether connections will be dropped
3. Whether the current instance state should be backed up first:
   gcloud sql backups create --instance=INSTANCE
4. Whether this change is reversible (some are, some aren't)

Get explicit confirmation before re-running.
FEEDBACK
    exit 2
  fi
fi

# --- DB-4: Cloud SQL import (can overwrite existing data) ---
if echo "$CMD" | grep -qiE 'sql import'; then
  cat >&2 <<'FEEDBACK'
BLOCKED: Cloud SQL import detected.

Importing SQL or CSV data can OVERWRITE existing tables and data.
SQL imports execute arbitrary SQL statements which may include DROP TABLE,
TRUNCATE, or CREATE TABLE IF NOT EXISTS followed by INSERT that replaces data.

Before running this command, you MUST explain to the user:
1. What file/bucket is being imported and what SQL it contains
2. Which database is the import target and what data it currently holds
3. Whether existing tables will be dropped/overwritten by the import
4. Recommend backing up the current state first:
   gcloud sql backups create --instance=INSTANCE
5. Recommend reviewing the SQL file for destructive statements:
   gsutil cat gs://BUCKET/dump.sql | head -100

Get explicit confirmation before re-running.
FEEDBACK
  exit 2
fi

# --- DB-5: Cloud SQL restore-backup (replaces current state) ---
if echo "$CMD" | grep -qiE 'sql (instances restore-backup|backups restore)'; then
  cat >&2 <<'FEEDBACK'
BLOCKED: Cloud SQL backup restore detected.

Restoring a backup REPLACES the entire current database state with the backup's
state. All data written after the backup was taken will be PERMANENTLY LOST.

Before running this command, you MUST explain to the user:
1. Which backup is being restored and when it was created
2. ALL data written since that backup will be lost — quantify the window
3. Recommend creating a backup of the CURRENT state before restoring:
   gcloud sql backups create --instance=INSTANCE
4. Consider restoring to a DIFFERENT instance instead to preserve current data:
   gcloud sql instances clone SOURCE --clone-name=RESTORE_TARGET

Get explicit confirmation before re-running.
FEEDBACK
  exit 2
fi

# --- DB-6: BigQuery load with --replace (truncates table) ---
if echo "$CMD" | grep -qiE 'bq.*load.*\-\-replace'; then
  cat >&2 <<'FEEDBACK'
BLOCKED: BigQuery load with --replace detected.

--replace TRUNCATES the target table and replaces all data with the new load.
All existing rows will be deleted before the new data is inserted.

Before running this command, you MUST explain to the user:
1. Which table is being replaced and how many rows it currently has
2. All existing data in the table will be deleted first
3. BigQuery time travel can recover the old data for up to 7 days
4. Suggest using --append instead if they want to add data without replacing
5. Suggest previewing the target table first:
   bq head -n 10 DATASET.TABLE

Get explicit confirmation before re-running.
FEEDBACK
  exit 2
fi

# --- DB-7: BigQuery DELETE/DROP/TRUNCATE queries ---
if echo "$CMD" | grep -qiE 'bq.*query' && echo "$CMD" | grep -qiE '(DELETE\s+FROM|DROP\s+TABLE|DROP\s+SCHEMA|DROP\s+DATABASE|TRUNCATE)'; then
  cat >&2 <<'FEEDBACK'
BLOCKED: Destructive BigQuery query detected (DELETE FROM / DROP / TRUNCATE).

This query will permanently remove data or schema objects from BigQuery.

Before running this command, you MUST explain to the user:
1. Exactly what data or tables will be affected
2. If DELETE FROM: how many rows match the WHERE clause (run a SELECT COUNT first)
3. If DROP TABLE: this removes the table definition and all data
4. BigQuery time travel allows recovery for up to 7 days
5. If there's no WHERE clause on DELETE, this deletes ALL rows

Get explicit confirmation before re-running.
FEEDBACK
  exit 2
fi

# --- DB-8: Spanner DDL updates with destructive operations ---
if echo "$CMD" | grep -qiE 'spanner.*ddl.*update'; then
  if echo "$CMD" | grep -qiE '(DROP\s+TABLE|DROP\s+COLUMN|DROP\s+INDEX|DROP\s+DATABASE)'; then
    cat >&2 <<'FEEDBACK'
BLOCKED: Destructive Cloud Spanner DDL change detected.

Spanner DDL updates with DROP operations are IRREVERSIBLE:
- DROP TABLE: permanently deletes the table and all rows
- DROP COLUMN: permanently deletes the column and all its data across all rows
- DROP INDEX: removes the index (data is preserved but queries may slow down)

Before running this command, you MUST explain to the user:
1. Exactly which schema objects are being dropped
2. How much data will be lost (query row counts / column usage first)
3. This cannot be undone — there is no Spanner time travel for DDL
4. Recommend exporting affected data before the change:
   gcloud spanner databases execute-sql DB --sql="SELECT * FROM TABLE LIMIT 100"

Get explicit confirmation before re-running.
FEEDBACK
    exit 2
  fi
fi

# --- DB-9: Piped SQL with destructive statements ---
# Catches: gcloud sql connect ... | mysql -e "DROP TABLE ..."
# Catches: echo "DROP TABLE ..." | gcloud sql connect ...
# Catches: mysql -e "DROP TABLE ...", psql -c "DROP DATABASE ..."
DANGEROUS_SQL='(DROP\s+TABLE|DROP\s+DATABASE|DROP\s+SCHEMA|DROP\s+COLUMN|TRUNCATE\s+TABLE|DELETE\s+FROM)'
if echo "$CMD" | grep -qiE "$DANGEROUS_SQL"; then
  cat >&2 <<'FEEDBACK'
BLOCKED: Destructive SQL statement detected in command.

This command contains SQL that will permanently destroy data:
- DROP TABLE/DATABASE/SCHEMA: permanently deletes the object and all data
- DROP COLUMN: permanently removes a column from all rows
- TRUNCATE TABLE: deletes all rows instantly (faster than DELETE, no WHERE clause)
- DELETE FROM: deletes rows (may be all rows if no WHERE clause)

Before running this command, you MUST explain to the user:
1. Which database and table(s) are affected
2. Whether this is running against a production or development database
3. How much data will be lost
4. Recommend creating a backup before executing:
   gcloud sql backups create --instance=INSTANCE
5. For DELETE: show the WHERE clause and confirm it's not deleting everything

Get explicit confirmation before re-running.
FEEDBACK
  exit 2
fi

# --- DB-10: Firestore/Datastore bulk operations ---
if echo "$CMD" | grep -qiE '(firestore.*bulk-delete|firestore.*export|datastore.*cleanup)'; then
  if echo "$CMD" | grep -qiE '(bulk-delete|cleanup)'; then
    cat >&2 <<'FEEDBACK'
BLOCKED: Firestore/Datastore bulk delete operation detected.

Bulk delete permanently removes documents from collections.
If the wrong collection ID is specified, critical data will be lost.

Before running this command, you MUST explain to the user:
1. Which collection(s) are being deleted
2. How many documents are in those collections
3. This is IRREVERSIBLE — deleted documents cannot be recovered
4. Recommend exporting the collection before deleting:
   gcloud firestore export gs://BUCKET --collection-ids=COLLECTION

Get explicit confirmation before re-running.
FEEDBACK
    exit 2
  fi
fi

# --- DB-11: Cloud SQL clone (can overwrite target) ---
if echo "$CMD" | grep -qiE 'sql instances clone'; then
  cat >&2 <<FEEDBACK
GCP SAFETY WARNING: Cloud SQL clone operation detected.

Cloning creates a copy of a Cloud SQL instance. If the target instance name
already exists, this command will fail (it won't overwrite), but confirm:
1. The source instance that will be cloned
2. The target instance name
3. This creates a new billable Cloud SQL instance
4. The clone is a point-in-time copy — it's independent after creation

Ensure the user understands what is being cloned and the billing impact.
FEEDBACK
  # Warn but allow — cloning is generally safe
  exit 0
fi

# --- AR-1: Artifact Registry cleanup policies (silent ongoing deletion) ---
if echo "$CMD" | grep -qiE 'artifacts.*repositories.*set-cleanup-policies'; then
  cat >&2 <<'FEEDBACK'
BLOCKED: Artifact Registry cleanup policy detected.

Cleanup policies run CONTINUOUSLY in the background once applied. They will
automatically and permanently delete container images that match the policy
rules — not just now, but ongoing into the future.

This is dangerous because:
- Users may keep old/untagged images intentionally (rollback, debugging, compliance)
- CI pipelines that retag images (moving "latest") leave untagged previous versions
  that a cleanup policy will silently delete
- Deleted images CANNOT be recovered

Before running this command, you MUST:
1. List all existing images first:
   gcloud artifacts docker images list REPO --include-tags --sort-by=UPDATE_TIME
2. Ask the user if they keep old or untagged images intentionally
3. Run with --dry-run first to preview what would be deleted
4. Explain that this is not a one-time cleanup — it runs continuously
5. Show how to remove the policy later if needed:
   gcloud artifacts repositories delete-cleanup-policies REPO --policy-names=NAME

Get explicit confirmation before re-running.
FEEDBACK
  exit 2
fi

# =====================================================================
# GENERAL GCP PROTECTION — Non-database commands
# =====================================================================

# --- General destructive operations ---
DESTRUCTIVE_PATTERN='\b(delete|destroy|remove-iam-policy-binding|set-iam-policy|purge)\b'
if echo "$CMD" | grep -qiE "$DESTRUCTIVE_PATTERN"; then
  cat >&2 <<'FEEDBACK'
BLOCKED: Destructive GCP command detected.

Before running this command, you MUST:
1. Explain what this command will delete/destroy/remove
2. State whether this action is reversible
3. Mention any recovery options (e.g., 30-day SA undelete window)
4. Get explicit user confirmation with "are you sure?"

After the user confirms, re-run the command. This block is a safety check — the command itself is fine to run once the user has approved it.
FEEDBACK
  exit 2
fi

# --- Permission-escalating operations ---
BROAD_ROLES='(roles/editor|roles/owner|roles/admin)'
if echo "$CMD" | grep -qE 'add-iam-policy-binding' && echo "$CMD" | grep -qiE "$BROAD_ROLES"; then
  cat >&2 <<'FEEDBACK'
BLOCKED: Broad IAM role detected in policy binding.

roles/editor, roles/owner, and most /admin roles violate least-privilege.
Before running this command, you MUST:
1. Explain what access this grants
2. Recommend a narrower, service-specific role instead
3. Get explicit user confirmation if they still want the broad role

After the user confirms, re-run the command.
FEEDBACK
  exit 2
fi

# --- Allow-unauthenticated ---
if echo "$CMD" | grep -qE '\-\-allow-unauthenticated'; then
  cat >&2 <<'FEEDBACK'
BLOCKED: --allow-unauthenticated flag detected.

This makes the Cloud Run service publicly accessible to the entire internet.
Before running this command, you MUST:
1. Confirm with the user that public access is intentional
2. Recommend using --no-allow-unauthenticated with IAM-based auth instead
3. If the user confirms public access, explain the security implications

After the user confirms, re-run the command.
FEEDBACK
  exit 2
fi

# --- Service account key creation ---
if echo "$CMD" | grep -qE 'service-accounts.*keys.*create'; then
  cat >&2 <<'FEEDBACK'
BLOCKED: Service account key creation detected.

Creating SA keys is a security risk. Keys can be leaked, are hard to rotate,
and bypass Workload Identity Federation.
Before running this command, you MUST:
1. Explain why Workload Identity Federation is preferred
2. Ask if the user has a specific reason they need a key file
3. Warn about key rotation requirements

After the user confirms, re-run the command.
FEEDBACK
  exit 2
fi

# --- Resource-creating operations — WARN but allow ---
CREATE_PATTERN='(\bcreate\b|\bdeploy\b|\benable\b|builds submit|add-iam-policy-binding)'
if echo "$CMD" | grep -qiE "$CREATE_PATTERN"; then
  cat >&2 <<FEEDBACK
GCP SAFETY REMINDER: This command creates or modifies GCP resources.

Command: $(echo "$CMD" | head -c 200)

Ensure you have explained to the user:
- What resource is being created/modified
- Any billing implications
- What permissions are required

If you have already explained this and the user has confirmed, proceed.
FEEDBACK
  exit 0
fi

# --- Read-only operations — Allow silently ---
# describe, list, get, logging read, etc. are safe
exit 0
