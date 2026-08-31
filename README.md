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
├── release-notes/<name>-<ts>.md     # upstream delta per update (Phase 4)
├── scripts/                         # CLI + adapters
└── .github/workflows/maintain.yml   # weekly automation (Phase 4)
```

Naming rules: plugin folders are lowercase-kebab; tier separation is physical
(`official/` vs `oss/`); a plugin lives in exactly one category; skill identity comes
from `SKILL.md` frontmatter and is globally unique.

## Quickstart

Requires Node.js ≥ 21 and git.

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
| `add` | `agp add --plugin N --url U --category C [--tier oss] [--marketplace-key K] [--skill-entry P] [--disabled] [--dry-run]` | Clone, validate, import a new plugin |
| `remove` | `agp remove --plugin N [--dry-run]` | Drop manifest entry; folder retained |
| `status` | `agp status` | Table: category/tier/active/version/behind-by per plugin |
| `doctor` | `agp doctor` | Structure checks + drift detection vs adopted tool configs |
| `index` | `agp index` | Regenerate `INDEX.md` from `plugins.json` |
| `enable` | `agp enable --plugin N` | Activate plugin in your `local.json` (manifest untouched) |
| `disable` | `agp disable --plugin N` | Deactivate plugin in your `local.json` (manifest untouched) |
| `sync` | `agp sync --all\|--tool T\|--plugin N\|--category C [--dry-run]` | Push active plugins into all adopted tool configs/junction roots |
| `rollback` | `agp rollback --plugin N [--to SHA] \| agp rollback --batch last\|<id> [--dry-run]` | Restore a plugin folder (or a whole update batch) to a previous state |

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

## Rollback & batches

Every non-dry-run `agp update` that changes at least one plugin records a **batch**:
an entry in `state.json` (`batches[]`: `{id, pre, post, at, tag, plugins}`) plus an
annotated git tag `batch/<utc-timestamp>` pointing at the bookkeeping commit. Per
plugin, `state.json` also accumulates a `history[]` of
`{repo_commit, version, upstream_commit_sha, ts}` entries, and `snapshot_commit`
holds the repo commit that vendored that version (never the upstream SHA).

Two rollback verbs give every update an instant undo path:

```bash
agp rollback --plugin superpowers            # restore previous version
agp rollback --plugin superpowers --to SHA   # restore a specific snapshot commit
agp rollback --batch last                    # undo the whole last update run
agp rollback --batch batch/2026-08-31T10-00-00-000Z
agp rollback --plugin superpowers --dry-run # plan only, mutate nothing
```

Semantics:

- **Per-plugin** steps back through the plugin's distinct snapshot states (add →
  v1 → v2 …), restoring folder content plus its `state.json` fields, and creates a
  new `Rollback <name> → <version>` commit. Repeating it keeps walking older.
- **Batch** restores every plugin folder that batch touched to the batch's `pre`
  state in a single commit. A plugin that did not exist at `pre` (added during the
  batch window) is **skipped with a warning, never deleted**.

Safety properties: history is never rewritten (rollback = `git checkout <sha> --
<paths>` + a new commit; tags are pointers, never moved); rollback touches only
the named plugin's folder (or the batch's plugin folders) plus their `state.json`
entries — `plugins.json`, unrelated plugins, and user tool configs are never
modified; every rollback path supports `--dry-run`.

## Roadmap

- **Phase 2 — Adapters & sync**: ✅ complete. Six sync adapters (bridge junctions into
  `~/.agents/skills`, claude settings merge, opencode `skills.paths` marker block,
  gemini dual-path junctions, qwen junctions, mcp emitter), the `sync` verb,
  drift-detecting `doctor`, and the per-user `local.json` customize layer with
  `enable`/`disable` verbs. ECC is vendored as the flagship disabled-by-default
  showcase: present in the catalog, `off (default)` in `status`, excluded from every
  sync target, and toggleable per user with `agp enable --plugin ecc` without touching
  the manifest.
- **Phase 3 — Rollback & tags**: ✅ complete. Batch tracking
  (`batch/<utc-timestamp>` annotated tags + `state.json` batch records on every update
  run), per-plugin rollback (`agp rollback --plugin N [--to SHA]`) and whole-batch
  rollback (`agp rollback --batch last|<id>`).
- **Phase 4 — Automation**: weekly GitHub Actions workflow
  (`maintain.yml`: doctor → update → sync → changelog → tag batch).
- **Phase 4 — Automation**: weekly GitHub Actions workflow
  (`maintain.yml`: doctor → update → sync → changelog → tag batch).

## Customize layer (per-user, non-destructive)

A gitignored `local.json` at the repo root holds your personal overlay. A plugin's
active state resolves as: `local.json` `plugins.<name>.enabled` wins if set;
otherwise the manifest's `enabled_by_default` (absent = true).

```bash
agp enable --plugin ecc      # writes local.json only; plugins.json untouched
agp disable --plugin ui-ux-pro-max
agp status                    # shows 'active' | 'off (you)' | 'off (default)'
```

Removing a plugin from your active set never deletes the vendored folder or the
manifest entry — `agp remove` retains the folder, and `disable`/`enable` only edit
`local.json`. `local.json` also accepts `paths` overrides for non-standard tool
config locations.

## Sync targets

`agp sync --all` pushes every **active** plugin into each adopted tool:

| Target | Mechanism | Adoption gate |
|---|---|---|
| `~/.agents/skills` (bridge) | junctions per skill (Codex, Grok, Cline, Warp, Copilot, Cursor, Gemini-bridge) | root created on demand |
| `~/.claude/settings.json` | `extraKnownMarketplaces` + `enabledPlugins` merge, `source:"agp"` markers | file must exist |
| `~/.config/opencode/opencode.jsonc` | `// agp:skills-start/end` managed block | file must exist |
| `~/.gemini/skills` + `~/.gemini/antigravity-cli/skills` | junctions, dual-path | roots created on demand |
| `~/.qwen/skills` | junctions | root created on demand |
| `~/.cursor/mcp.json`, `~/.gemini/settings.json`, `~/.qwen/settings.json` | `mcpServers` merge from plugin `.mcp.json` | file must exist |

Safety rules on every target: user entries are preserved and never clobbered;
stale agp-owned entries (marked `source:"agp"` or resolving inside the repo) are
removed; existing config files get a `.bak-<timestamp>` backup before mutation;
MCP env values are emitted only as `${VAR}` refs — literal secrets are skipped
with a warning. `--dry-run` on any verb shows the exact planned changes without
writing.

## Portability guarantee

Cloning this repo wires everything to **your** home directory, whoever you are.
All target paths in `plugins.json` are written as `~/...` and expanded against
`os.homedir()` at runtime, with `CLAUDE_CONFIG_DIR` / `XDG_CONFIG_HOME` env overrides
respected ahead of that. No username or machine-specific absolute path appears in any
committed file, so the same checkout works unchanged across machines and operating
systems. Non-standard layouts are handled by an optional, gitignored `paths.local.json`.
