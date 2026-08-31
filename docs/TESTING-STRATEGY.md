# All-Global-Plugin — Phase 4 Testing Strategy

> **Date:** 2026-09-01 | **Scope:** error-handling procedures, the step-by-step test plan covering all functionality, and the scenario matrix for every failure mode we can provoke. Feeds directly into the Phase 4 automation plan (`maintain.yml` weekly loop).
> **Current state:** 121/121 tests passing across 23 test files.

---

## 1. Error handling procedures (failure mode → mandated response)

The invariant across every adapter: **never a partial write.** Either the full intended change lands (after a `.bak-<ts>` backup) or nothing does.

### 1.1 Update path (upstream pulls)

| Failure | Where it surfaces | Mandated response | Already enforced by |
|---|---|---|---|
| Upstream unreachable (`git ls-remote` fails) | `runUpdate` reachability gate | plugin lands in `failed[]` with reason; no folder touched, no batch recorded, no tag created | `tests/batch.test.mjs` ("failed update → no batch, no tag") |
| Structure/uniqueness/safety gate failure on update | validation gates during atomic swap | staged clone discarded; current folder untouched; swap never happens; plugin in `failed[]` | atomic swap discipline (update.mjs) |
| Gate failure on a brand-new plugin (`add`) | same gates, first import | clone quarantined to `universal-plugin/_quarantine/`, logged to `QUARANTINE.md`, manifest rolled back | `tests/verbs.test.mjs` ("add rolls manifest back when install fails") |
| Post-swap validation failure | re-validate after rename-old/move-new | reverse swap: retired folder restored, new clone discarded — a broken update never destroys the previous version | swap discipline |
| Unexpected throw mid-update | any | caught, `failed[]` entry with message, manifest unchanged (add-path rolls manifest back) | verbs test ("disk exploded") |

### 1.2 Adapter path (sync)

| Failure | Mandated response | Enforcement |
|---|---|---|
| Target config file absent (tool not adopted) | `{skipped: true}` — never create a tool config on the user's behalf | every adapter's adoption gate; codex/windsurf/q/claude/opencode/mcp tests |
| Target config unparsable (corrupt JSON) | abort before any write; `.bak` untouched; error surfaced — never write over a file we could not read | `JSON.parse` before mutation in syncJsonTarget/syncClaude; parse failure = exception = no write |
| Marker start present without end (user mangled our block) | abort with `agp:...-start marker without matching end marker` — no write | opencode `replaceManaged`, toml `replaceManagedBlock` throw |
| Foreign entry where we'd place a junction | `ensureJunction` refuses (error, never clobber) | junctions.mjs ownership checks |
| Stale agp entry detected | remove only entries marked `source:"agp"` (or marker-block content / junctions resolving inside repo) — user entries always preserved | every adapter test |
| Literal secret in MCP env | server skipped entirely with warning; never written to any target | `collectMcpEntries` + all adapter tests |
| Concurrent agp runs | second run converges (all adapters idempotent — diff-empty second run touches nothing); worst case both write the same content, `.bak` timestamps differ | idempotency tests (codex, claude, mcp) |

### 1.3 Rollback path

| Failure | Mandated response | Enforcement |
|---|---|---|
| Unknown plugin name | error, exit non-zero, nothing mutated | rollback guards |
| Plugin has exactly one snapshot state (nothing older) | `no previous version to roll back to` — no mutation | rollback.test.mjs |
| `--to` SHA not in plugin history | validation error before checkout | rollback `--to` validation |
| Batch id unknown / `last` with no batches | error, no mutation | findBatch null → error |
| Plugin added during batch window (absent at `batch.pre`) | skipped with warning, **never deleted** | rollback.test.mjs (forged-batch test) |
| Rollback lands mid-state (rollback commits re-creating older trees) | distinct-tree chronological walk dedupes; repeated rollback keeps stepping older | rollback-twice test |

### 1.4 CLI path

| Failure | Mandated response |
|---|---|
| Unknown command / no command | usage to stderr, exit 2 |
| Unknown `--option`, missing flag value, stray positional | error line + usage, exit 2 |
| `--tool` value not in the tool set | error listing valid tools, exit 2 |
| Verb requires selector (`sync`, `rollback`) but none/both given | exit 2 |
| Validation failures in verbs | JSON error output, exit 1; never a stack trace to the user |

### 1.5 Logging contract

All verb results are JSON objects (`{ok, ...}` or per-verb shapes) on stdout; human-readable error lines go to stderr; exit codes: 0 success, 1 validation/operation failure, 2 usage error. The weekly `maintain.yml` (Phase 4) parses these JSON results, never scrapes text.

---

## 2. Step-by-step testing plan (execution order)

1. **Unit (per feature commit)** — `node --test "tests/**/*.test.mjs"`. TDD discipline: red → focused green → full suite green → commit. Currently 121 tests / 23 files; every adapter has its own file; gates, state, manifest, rollback, batch, CLI all covered.
2. **Integration (temp-HOME fixtures per adapter)** — each adapter test seeds a temp HOME with adopted configs (claude settings, opencode jsonc, gemini/qwen roots, cursor/windsurf/q/codex configs), runs sync, asserts: user content preserved, agp entries added, stale agp removed, `.bak` created, secret servers skipped. This is the layer that catches "adapter works in isolation but corrupts real configs."
3. **E2E CLI loop (temp git repo)** — spawn the real `bin/agp.mjs` (spawnSync): `add → update (upstream bump) → doctor (drift) → sync --all → rollback --plugin → update again → rollback --batch last`. Asserts: v1 content restored, batch tag exists, linear append-only history, doctor converges to 0 drift after sync. Pattern exists in `tests/cli.test.mjs` (rollback e2e) — Phase 4 extends it to the full loop.
4. **Real-profile smoke (opt-in, dry-run first)** — `agp sync --all --dry-run` against the real HOME: read the plan, verify every added/removed entry is expected, then run live. After sync, `agp doctor` must report 0 problems. Never skip the dry-run step; never sync into a profile whose configs lack backups.
5. **CI smoke (Phase 4 `maintain.yml`)** — on every push: manifest validation + structure + uniqueness gates (the four gates as library calls). Weekly (cron): full loop — `doctor → update --all → sync --all → changelog → status → commit → push → tag batch`. Guards: no force-push, no third-party bots, exit on first non-zero step, JSON results uploaded as artifacts.

---

## 3. Scenario matrix (provoke → expect → covered where)

| # | Scenario | Expected behavior | Coverage |
|---|---|---|---|
| 1 | No network during update | reachability fails → `failed[]`, no batch, no tag | batch.test |
| 2 | Upstream moves/renames repo | `ls-remote` on recorded URL fails → same as #1; folder/version unchanged | batch.test |
| 3 | Plugin adds literal secret mid-life (update) | that server skipped with warning across all 5 JSON targets + codex TOML | mcp + codex tests |
| 4 | Target config locked/read-only | write throws → verb exits 1 with error; `.bak` logic is copy-first so no data loss | Phase 4: add explicit test |
| 5 | User manually edits inside our managed block | next sync regenerates the block (marker blocks are fully owned); user edits within markers are overwritten by design — documented | codex/opencode tests (block regeneration) |
| 6 | User edits outside our managed block | preserved verbatim — never touched by agp | every adapter test |
| 7 | Concurrent agp runs | idempotent convergence; no corruption (full-content atomic-ish writes) | idempotency tests |
| 8 | Disabled plugin carries colliding skill names | never synced → cannot collide; uniqueness gate excludes disabled plugins | verbs.test ("duplicate skill names, enabled_by_default:false") |
| 9 | Plugin removed from manifest, junctions remain | doctor flags orphans; sync removes only agp-owned stale junctions | verbs.test orphan + bridge tests |
| 10 | Batch rollback after manual commit between batch and rollback | `batch.pre` is a commit SHA — `git checkout pre -- paths` restores folder state regardless of later commits; manual commit untouched (paths-scoped) | rollback batch test |
| 11 | Upstream force-pushes history | update pins to new head; `history[]` append-only; old snapshots still reachable for rollback | batch/rollback tests |
| 12 | Windows junction permission denied | `ensureJunction` throws → sync result carries error, verb exits 1, no clobbered entries | Phase 4: add explicit test |
| 13 | Non-standard HOME / config locations via `local.json` `paths` | `targetPath` override chain (local > manifest > default) honored | bridge paths tests |
| 14 | Rollback with forged/mismatched batch record | plugins absent at `pre` skipped with warning, never deleted | rollback.test (forged-batch) |
| 15 | Marker start without end (user truncated our block) | hard error, no write | toml/opencode throw paths |

Scenarios 4 and 12 are the two gaps with no dedicated test today — both are Phase 4 additions to the unit layer (fixture a read-only file / a junction under a deny ACL).

---

## 4. Team responsibilities (Phase 4 mapping)

Per the PM brief: research and compatibility → adapter implementation → test authoring → verification sign-off.

| Role | Owns | Definition of done |
|---|---|---|
| Research/compat (this phase, complete) | COMPATIBILITY.md matrix; format verification for candidate tools | every catalog tool mapped to a status; needs-verification items have a probe plan |
| Adapter implementation | one adapter per verified format, reusing `syncJsonTarget`/marker-block patterns; wiring in sync/doctor/CLI | tests green in isolation + full suite; doctor converges; adoption-gated |
| Test authoring | per-adapter test file + e2e loop extensions + scenario-matrix gaps (#4, #12) | new scenarios covered; suite stays green; coverage does not regress |
| Verification sign-off | real-profile dry-run smoke review; weekly CI green for 2 consecutive runs | dry-run plan reviewed line-by-line before live sync; doctor = 0 after; CI artifacts inspected |

Handoff between roles follows the repo convention: work is committed in TDD-sized commits with a verb-first message (`feat:`, `docs:`, `test:`), and the session handoff doc (`docs/HANDOFF.md`) is updated at each phase boundary.

---

## 5. What Phase 4 automation must preserve

The weekly workflow inherits every guarantee above, so its guardrails are:

1. Run `doctor` first — abort on structural problems before touching upstream.
2. `update --all` failures are per-plugin (batches record only successful runs); a failed plugin never blocks others.
3. `sync --all` is idempotent and adoption-gated — safe on any runner profile.
4. Commits are append-only (`Record batch`, `Rollback`, `Update` commits); never rebase, never force-push.
5. Batch tags are created by the tool, not humans; `rollback --batch last` is the universal undo.
