# Claude Code GCP Plugin

## GCP Safety Protocol — MANDATORY

**This is the most important section in this file. These rules are non-negotiable.**

You MUST follow this protocol before running ANY `gcloud`, `gsutil`, `bq`, `kubectl`, or other GCP CLI command:

### Step 1: Explain BEFORE Running

Before presenting any GCP command for execution, you MUST provide a clear explanation that includes:

1. **What it does** — Plain English description of the operation
2. **What it affects** — Which GCP resources, services, or configurations will be created, modified, or deleted
3. **Billing impact** — Whether this creates billable resources, and approximate cost implications if known
4. **Reversibility** — Whether this action is reversible or destructive (can it be undone?)
5. **Permissions required** — What IAM roles/permissions are needed to run this command

Format the explanation as a structured block BEFORE the command:

```
GCP Action: [short description]
Affects:    [resource type and name]
Billing:    [free / creates billable resource / modifies billing]
Reversible: [yes — how to undo / no — this is permanent]
Requires:   [IAM roles needed]
```

### Step 2: Show the Full Command

After the explanation, show the exact command that will be run. Never hide or abbreviate commands.

### Step 3: Wait for User Confirmation

After showing the explanation and command, explicitly ask the user to confirm before proceeding. Use language like:

- "Should I run this command?"
- "Proceed with this?"
- "Ready to execute?"

Do NOT chain multiple GCP commands together without explaining each one. If a workflow involves multiple commands, explain and confirm each separately, OR present the full plan upfront and confirm the batch.

### Risk Classification

Classify every GCP command by risk level:

**READ-ONLY (Low Risk)** — `describe`, `list`, `get`, `logging read`
- Still explain what you're querying and why
- Can run after brief explanation without heavy confirmation

**RESOURCE-CREATING (Medium Risk)** — `create`, `deploy`, `enable`, `add-iam-policy-binding`
- Full explanation required (billing, what gets created)
- Explicit confirmation required before running

**DESTRUCTIVE (High Risk)** — `delete`, `destroy`, `disable`, `remove-iam-policy-binding`, `update-traffic` (to 0%)
- Full explanation with emphasis on irreversibility
- Explicit "are you sure?" confirmation
- Suggest how to verify before deleting
- Mention recovery options (if any)

**PERMISSION-ESCALATING (High Risk)** — `add-iam-policy-binding` with broad roles (`roles/editor`, `roles/owner`), `set-iam-policy`
- Full explanation of what access is being granted
- Warn about least-privilege violations
- Suggest narrower alternatives

**DATABASE (Critical Risk)** — Any command that touches database instances, tables, schemas, or data
- Database operations get the highest level of scrutiny because data loss is permanent
- See the full Database Protection Protocol below

### Database Protection Protocol

Database operations are the most dangerous commands in GCP. Data loss is almost always irreversible. You MUST follow these rules for ALL database-related commands across Cloud SQL, Spanner, Firestore, BigQuery, Bigtable, AlloyDB, and Memorystore.

#### Explicit Deletion

Before ANY database delete command (`sql instances delete`, `sql databases delete`, `spanner databases delete`, `bq rm`, `bigtable tables delete`, `firestore databases delete`, etc.):
1. State exactly which database/instance/table is being deleted
2. State what data it contains (or ask the user if you don't know)
3. Confirm whether a recent backup exists
4. Recommend creating a final backup BEFORE deleting
5. Warn that this is irreversible (no undo)
6. Get explicit "yes, delete it" confirmation

#### Indirect Data Loss — Schema and Config Changes

These commands do NOT say "delete" but CAN destroy data:

| Command | Why It's Dangerous |
|---------|-------------------|
| `gcloud sql instances patch --database-version` | Major version upgrade can force dump-and-restore, causing downtime and potential data issues |
| `gcloud sql instances patch --storage-type` | Forces instance recreation — instance is stopped, data migrated |
| `gcloud sql instances patch --no-database-flags` | Clears ALL database flags — can disable replication, break connections |
| `gcloud sql import sql` | Executes arbitrary SQL from a file — may contain DROP TABLE, TRUNCATE |
| `gcloud sql instances restore-backup` | Replaces the ENTIRE current database state with the backup. All data since the backup is lost |
| `gcloud spanner databases ddl update` with DROP | DROP TABLE/COLUMN permanently removes data — no Spanner time travel for DDL |
| `bq load --replace` | Truncates the target table before loading new data |
| `bq query "DELETE FROM ..."` | Deletes rows — may be ALL rows if no WHERE clause |

For every one of these, you MUST:
1. Explain the specific data loss risk (not generic — tell the user exactly what data they'll lose)
2. Recommend creating a backup first
3. Get explicit confirmation

#### Piped SQL

Watch for destructive SQL piped through connections:
- `gcloud sql connect ... | mysql -e "DROP TABLE ..."`
- `echo "TRUNCATE TABLE users" | psql ...`
- `mysql -h CLOUD_SQL_IP -u root < destructive.sql`
- `bq query "DELETE FROM dataset.table WHERE true"`

If a command contains `DROP TABLE`, `DROP DATABASE`, `DROP COLUMN`, `TRUNCATE TABLE`, or `DELETE FROM`, treat it as Critical Risk regardless of how it's invoked.

#### Before ANY Database Mutation

Always recommend:
```
gcloud sql backups create --instance=INSTANCE --project=PROJECT
```
before destructive operations on Cloud SQL. For BigQuery, note that time travel allows 7-day recovery. For Spanner, recommend exporting data first.

### What You MUST NEVER Do

- NEVER run `gcloud` commands silently or without explanation
- NEVER chain destructive commands in a single bash call without individual confirmation
- NEVER use `--quiet` or `--format=none` to suppress output from commands that create or modify resources
- NEVER use the default compute service account for production workloads
- NEVER set `--allow-unauthenticated` without explicitly warning that the service will be publicly accessible
- NEVER run `set-iam-policy` (which REPLACES the entire policy) — use `add-iam-policy-binding` instead
- NEVER create or download service account keys unless the user explicitly requests it and you've warned about the security implications
- NEVER assume `us-central1` as the region — read it from `gcloud config get-value compute/region` or ask the user. Not everyone is in the US.

## Prerequisites

Before using this plugin, ensure:
- `gcloud` CLI is installed and authenticated (`gcloud auth login`)
- Application Default Credentials are set (`gcloud auth application-default login`)
- A project is configured (`gcloud config set project <PROJECT_ID>`)
- Required APIs are enabled for the services you want to use

## Plugin Structure

- `skills/` — Domain-specific GCP knowledge (Cloud Run, Cloud Build, IAM, Secret Manager). Each skill has a `SKILL.md` and `references/` directory with detailed guides.
- `agents/` — Multi-step orchestrators that combine skills (deploy, security audit, cost analysis, incident triage).
- `hooks/` — Automated safety checks that run before/after operations (pre-deploy validation, post-deploy health checks).
- `commands/` — Slash commands for interactive workflows (`/gcp-deploy`, `/gcp-status`).
- `templates/` — Starter kits for common GCP patterns (Cloud Run + FastAPI, GitHub Actions + WIF).

## Conventions

- All `gcloud` commands include explicit `--project` and `--region` flags — never rely on implicit defaults.
- Service accounts follow least-privilege: create purpose-specific SAs rather than reusing the default compute SA.
- Secrets belong in Secret Manager, not environment variables or `.env` files.
- Container images go to Artifact Registry, not Container Registry (deprecated).
- Structured JSON logging is the default for Cloud Run services.

## Skill Authoring

- Each `SKILL.md` stays under 200 lines. Detailed content goes in `references/`.
- Reference files are loaded on-demand — the skill file points to them, Claude reads them when needed.
- Frontmatter format: `name`, `description`, `trigger_phrases`.
