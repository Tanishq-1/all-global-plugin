# All-Global-Plugin

One organized home for AI agent skills/plugins — vendored once, validated on entry,
and maintained by a small manifest-driven CLI. This is the standalone lab repo that ports
the proven patterns of `claude-global-plugins` (manifest CLI, atomic swap, validation
gating) into a portable, cross-tool design.

Design spec: [`docs/superpowers/specs/2026-08-26-all-global-plugin-design.md`](docs/superpowers/specs/2026-08-26-all-global-plugin-design.md)

## Folder layout (spec §3)

```
All-Global-Plugin/
├── universal-plugin/
│   ├── _universal/{official,oss}/
│   ├── fullstack/{official,oss}/
│   ├── frontend/{official,oss}/
│   ├── backend/{official,oss}/
│   ├── mobile/{official,oss}/
│   ├── cloud/{official,oss}/
│   ├── salesforce/{official,oss}/
│   └── _quarantine/                 # failed-validation clones; never synced
├── plugins.json                     # single source of truth (schema v2)
├── state.json                       # auto-managed: version, upstream SHA, batch id
├── INDEX.md                         # generated human-readable catalog
├── QUARANTINE.md                    # failure log: plugin, gate failed, reason
├── release-notes/<name>-<ts>.md     # upstream delta per update
├── scripts/                         # CLI + adapters
└── .github/workflows/maintain.yml   # weekly automation (Phase 4)
```

Naming rules: plugin folders are lowercase-kebab; tier separation is physical
(`official/` vs `oss/`); a plugin lives in exactly one category; skill identity comes
from `SKILL.md` frontmatter and is globally unique.

## Quickstart

Requires Node.js ≥ 18 and git.

```bash
git clone <this-repo-url> && cd All-Global-Plugin
node bin/agp.mjs status          # see what's installed
node bin/agp.mjs add --plugin superpowers --url https://github.com/obra/superpowers \
     --category _universal --tier oss
node bin/agp.mjs index           # regenerate INDEX.md
node bin/agp.mjs doctor          # verify catalog health
```

A real seed example as run during Phase 1 (Task 10):

```bash
node bin/agp.mjs add --plugin azure-skills --url https://github.com/microsoft/azure-skills \
     --category cloud --tier oss
```

The `add` verb clones upstream, runs all four validation gates, stages an atomic swap
into `universal-plugin/<category>/<tier>/`, records the entry in `plugins.json`, and
rolls the manifest back automatically if anything fails. Any gate failure quarantines
the clone instead of importing it.

## Verb reference

| Verb | Usage | Effect |
|---|---|---|
| `update` | `agp update [--all\|--plugin N\|--category C] [--dry-run]` | Pull upstream for installed plugins through the validation gates + atomic swap |
| `add` | `agp add --plugin N --url U --category C [--tier oss] [--marketplace-key K] [--skill-entry P] [--dry-run]` | Clone, validate, import a new plugin |
| `remove` | `agp remove --plugin N [--dry-run]` | Drop manifest entry; folder retained |
| `status` | `agp status` | Table: category/tier/url/version/SHA/behind-by per plugin |
| `doctor` | `agp doctor` | Structure checks: missing folders, invalid structures, orphan folders |
| `index` | `agp index` | Regenerate `INDEX.md` from `plugins.json` |

Unknown or missing commands print a usage line to stderr and exit with code 2;
validation failures exit non-zero with JSON error output.

## Validation gates

Every plugin must pass **all four** gates before entering a category (spec §6):

1. **Reachability** — `git ls-remote <url>` succeeds.
2. **Structure** — `.claude-plugin/marketplace.json` parses OR at least one valid
   `SKILL.md` (with `name` + `description` frontmatter) exists.
3. **Uniqueness** — no skill-name collisions with already-imported skills.
4. **Safety inventory** — `hooks/`, `scripts/`, `.mcp.json` are scanned; executable
   content is flagged for manual review and never synced cross-tool by default.

Updates use the same atomic-swap discipline: stage a temp clone on the same volume,
validate, rename-old/move-new, strip nested `.git`, re-validate, delete the retired
folder only after post-swap validation passes — reverse on any failure, so a broken
update never leaves the previous version behind.

## Quarantine

Clones that fail any gate are parked in `universal-plugin/_quarantine/<name>/` and
logged to `QUARANTINE.md` (plugin, gate, reason, timestamp). Quarantined plugins are
unreachable by every adapter by construction: they are not in the manifest's synced
set, so they can never leak into tool configs. Example from this repo's history:
`flutter-agent-plugins` was quarantined for duplicate skill names (`code-review`,
`grill-with-docs`). Fixing a quarantined plugin means resolving the failure upstream
(or locally) and re-running `add`.

## Roadmap

- **Phase 2 — Adapters & sync**: six sync adapters (bridge junctions into
  `~/.agents/skills`, claude settings merge, opencode `skills.paths`, cursor/qwen
  junctions, mcp emitters) plus the `sync` verb and drift-detecting `doctor`.
- **Phase 3 — Rollback & tags**: batch tags (`batch/<utc-timestamp>`), per-plugin and
  whole-batch rollback verbs backed by `state.json`.
- **Phase 4 — Automation**: weekly GitHub Actions workflow
  (`maintain.yml`: doctor → update → sync → changelog → tag batch).

## Portability guarantee

Cloning this repo wires everything to **your** home directory, whoever you are.
All target paths in `plugins.json` are written as `~/...` and expanded against
`os.homedir()` at runtime, with `CLAUDE_CONFIG_DIR` / `XDG_CONFIG_HOME` env overrides
respected ahead of that. No username or machine-specific absolute path appears in any
committed file, so the same checkout works unchanged across machines and operating
systems. Non-standard layouts are handled by an optional, gitignored `paths.local.json`.
