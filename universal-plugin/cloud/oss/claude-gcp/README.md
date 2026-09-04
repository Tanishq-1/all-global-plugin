# Claude Code GCP Plugin

> **v0.1.1-beta** — This plugin is in active development. Expect breaking changes before v1.0.

GCP skills, safety hooks, and deploy automation for Claude Code.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-blueviolet)](https://docs.anthropic.com/en/docs/claude-code)
[![GCP Services](https://img.shields.io/badge/GCP_Services-10-orange)]()
[![Status](https://img.shields.io/badge/Status-Beta-yellow)]()

---

## Installation

### Prerequisites

You need these before using the plugin:

```bash
# 1. Install the gcloud CLI: https://cloud.google.com/sdk/docs/install

# 2. Authenticate
gcloud auth login
gcloud auth application-default login

# 3. Set your project
gcloud config set project YOUR_PROJECT_ID

# 4. jq is required by the safety hook
# macOS:
brew install jq
# Linux:
sudo apt install jq
```

### Step 1: Clone the repo

```bash
git clone https://github.com/shamis6ali/claude-gcp.git
```

### Step 2: Register the safety hook

The plugin includes a safety hook (`gcp-command-guard.sh`) that blocks dangerous GCP commands before they run. Claude Code loads skills from `--plugin-dir` automatically, but hooks need to be registered in your settings.

Add this to your Claude Code settings file (`~/.claude/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash /absolute/path/to/claude-gcp/hooks/gcp-command-guard.sh"
          }
        ]
      }
    ]
  }
}
```

Replace `/absolute/path/to/claude-gcp` with the actual path where you cloned the repo.

If you already have other settings in that file (like `enabledPlugins` or `effortLevel`), add the `hooks` key alongside them — don't replace the whole file.

**Scope options:**
- `~/.claude/settings.json` — hook runs in all Claude Code sessions (recommended)
- `.claude/settings.json` in a specific project — hook only runs in that project

### Step 3: Start Claude Code

After step 2, the safety hook is active in **every Claude Code session** — you don't need to do anything special. Any dangerous `gcloud` command (delete, broad IAM roles, public access, etc.) will be blocked automatically.

To also load the GCP skills, deploy agent, and slash commands, pass the plugin directory:

```bash
claude --plugin-dir /path/to/claude-gcp
```

To avoid typing the flag every time, add an alias to your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
alias claude-gcp='claude --plugin-dir /path/to/claude-gcp'
```

Then just run `claude-gcp` to start a session with the full plugin loaded.

**What you get with just the hook (step 2):**
- Dangerous GCP commands are blocked and require explanation + confirmation
- Works in any project, any Claude Code session

**What you get with the hook + plugin (`--plugin-dir`):**
- Everything above, plus:
- Cloud Run, Cloud Build, IAM, and Secret Manager skills
- Deploy agent (full build-push-deploy workflow)
- GCP Safety Protocol (Claude explains every command before running it)
- `/gcp-deploy` and `/gcp-status` slash commands

### Verify it's working

Once Claude Code starts, try these:

```
delete my cloud run service called my-api
```
Expected: Claude asks for project/region, explains it's irreversible, asks for confirmation. If it tries to run the command, the hook blocks it.

```
give my service account editor access to the project
```
Expected: Hook blocks `roles/editor` as too broad, Claude suggests narrower alternatives.

```
list my cloud run services
```
Expected: Goes through without heavy warnings (read-only operation).

### Uninstalling

To remove the safety hook, delete the `hooks` key from `~/.claude/settings.json`. To stop loading the plugin, just don't pass `--plugin-dir`.

---

## What's Inside

### Skills

Reference docs and instructions that Claude loads when you ask about a GCP service.

| Skill | GCP Services | What It Does |
|-------|-------------|--------------|
| **Cloud Run** | Cloud Run, Artifact Registry | Deploy, scale, traffic split, canary/blue-green, jobs |
| **Cloud Build** | Cloud Build, Artifact Registry | CI/CD pipelines, triggers, caching, approvals |
| **IAM** | IAM, Workload Identity | Service accounts, least privilege, WIF, custom roles |
| **Secret Manager** | Secret Manager | Create/version/mount secrets, rotation, access patterns |

*Coming in v0.2.0: Vertex AI, Cloud Tasks, VPC Networking*
*Coming in v0.3.0: Cloud Logging, Cloud Storage, Pub/Sub*

### Agents

Agents that chain multiple steps together (detect project type, build, deploy, verify).

| Agent | What It Does |
|-------|-------------|
| **Deploy Agent** | Detects project type → validates Dockerfile → builds image → deploys to Cloud Run → verifies health |

*Coming in v0.2.0: Security Audit Agent, Cost Agent*
*Coming in v0.3.0: Incident Agent*

### Commands

Interactive slash commands for common operations.

| Command | Description |
|---------|-------------|
| `/gcp-deploy` | Interactive deploy wizard — detects project, builds, deploys to Cloud Run |
| `/gcp-status` | Service health dashboard — revisions, traffic, errors, resource config |

*Coming in v0.2.0: `/gcp-iam-audit`, `/gcp-cost`*
*Coming in v0.3.0: `/gcp-logs`*

### Safety System

**No GCP command runs without your explicit approval.** This plugin enforces a three-layer safety model:

1. **CLAUDE.md Safety Protocol** — Claude must explain every command (what it does, billing impact, reversibility) and get your confirmation before running it
2. **PreToolUse Hook (`gcp-command-guard.sh`)** — Automatically intercepts and blocks high-risk commands:
   - Destructive operations (`delete`, `destroy`, `remove-iam-policy-binding`)
   - Overly broad IAM roles (`roles/editor`, `roles/owner`)
   - Public access (`--allow-unauthenticated`)
   - Service account key creation
3. **Claude Code's built-in permission system** — You still approve every Bash command in the terminal

The hook blocks the command and feeds context back to Claude, forcing it to explain the impact and re-confirm before retrying.

### Hooks

Automated safety checks that run before and after operations.

| Hook | When | What It Checks |
|------|------|---------------|
| `gcp-command-guard.sh` | Before ANY gcloud command | Risk classification, blocks destructive/escalating ops |
| `pre-deploy-check.sh` | Before deploy | Dockerfile, secrets in .env, gcloud auth, API enabled |
| `post-deploy-verify.sh` | After deploy | Health check, revision status, traffic, error rate |

### Templates

Starter templates you can copy and customize.

| Template | Stack |
|----------|-------|
| `cloud-run-fastapi` | FastAPI + Cloud Run + Secret Manager + structured logging |
| `github-actions-wif` | GitHub Actions + Workload Identity Federation (keyless deploy) |

*Coming in v0.2.0: `vertex-ai-serving`, `pub-sub-pipeline`*
*Coming in v0.3.0: `cloud-run-nextjs`*

---

## Architecture

```
claude-gcp/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── skills/
│   ├── cloud-run/               # Deploy, scale, traffic management
│   │   ├── SKILL.md
│   │   └── references/          # deploy-patterns, scaling, troubleshooting
│   ├── cloud-build/             # CI/CD pipelines
│   │   ├── SKILL.md
│   │   └── references/          # triggers, build-configs, artifacts
│   ├── iam/                     # Permissions, service accounts, WIF
│   │   ├── SKILL.md
│   │   └── references/          # least-privilege, service-accounts, workload-identity
│   └── secret-manager/          # Secrets lifecycle
│       ├── SKILL.md
│       └── references/          # rotation, access-patterns
├── agents/
│   └── deploy-agent.md          # Full deploy orchestration
├── hooks/
│   ├── pre-deploy-check.sh      # Pre-deploy validation
│   └── post-deploy-verify.sh    # Post-deploy health check
├── commands/
│   ├── gcp-deploy.md            # /gcp-deploy wizard
│   └── gcp-status.md            # /gcp-status dashboard
└── templates/
    ├── cloud-run-fastapi/       # FastAPI starter kit
    └── github-actions-wif/      # Keyless CI/CD starter kit
```

---

## Skills Reference

Each skill follows a consistent pattern:
- **`SKILL.md`** — Core instructions (under 200 lines). Loaded when Claude detects relevant intent.
- **`references/`** — Deep-dive guides loaded on-demand for specific patterns.

### Trigger Phrases

Claude activates skills based on natural language. Examples:

| You Say | Skill Activated |
|---------|----------------|
| "deploy to cloud run" | Cloud Run |
| "set up a build pipeline" | Cloud Build |
| "create a service account" | IAM |
| "store this API key securely" | Secret Manager |
| "deploy my app" | Deploy Agent |

---

## Templates Quick Start

### Cloud Run + FastAPI

```bash
cp -r templates/cloud-run-fastapi/ my-api/
cd my-api/

# Deploy directly
gcloud builds submit . \
  --project YOUR_PROJECT \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT/my-repo/my-api:latest

gcloud run deploy my-api \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT/my-repo/my-api:latest \
  --region YOUR_REGION \
  --no-allow-unauthenticated
```

### GitHub Actions + WIF (Keyless Deploy)

```bash
cd templates/github-actions-wif/

# Edit variables in setup-wif.sh, then:
./setup-wif.sh

# Copy workflows to your repo
cp -r .github/ /path/to/your/repo/
```

---

## Hooks Usage

### Pre-Deploy Check

Run before deploying to catch common issues:

```bash
cd /your/project
/path/to/claude-gcp/hooks/pre-deploy-check.sh
```

Checks: Dockerfile exists, no secrets in .env, gcloud authenticated, Cloud Run API enabled.

### Post-Deploy Verify

Run after deploying to verify health:

```bash
/path/to/claude-gcp/hooks/post-deploy-verify.sh SERVICE_NAME PROJECT_ID REGION
```

Checks: HTTP 200 health check, revision status, traffic distribution, error rate.

---

## Roadmap

- **v0.1.0** (current) — Cloud Run, Cloud Build, IAM, Secret Manager, Deploy Agent, hooks, commands, templates
- **v0.2.0** — Vertex AI, Cloud Tasks, VPC Networking, Security Audit Agent, Cost Agent
- **v0.3.0** — Cloud Logging, Cloud Storage, Pub/Sub, Incident Agent, Terraform output option
- **v1.0.0** — Full test coverage, plugin marketplace submission, community contributions

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding skills, agents, templates, and hooks.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

Built by [Shamis Ali](https://github.com/shamis6ali) ([Orchestrator](https://orchestrator.ai))
