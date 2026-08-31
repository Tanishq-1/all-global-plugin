// scripts/cmd/inspect.mjs
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { loadManifest } from '../lib/manifest.mjs'
import { structureGate } from '../lib/gates.mjs'
import { pluginDest } from '../lib/layout.mjs'
import { lsRemote } from '../lib/gitsrc.mjs'
import { readState } from '../lib/state.mjs'
import { readLocal, activeState, activePlugins } from '../lib/local.mjs'
import { syncBridge } from '../lib/adapters/bridge.mjs'
import { syncClaude } from '../lib/adapters/claude.mjs'
import { syncOpencode } from '../lib/adapters/opencode.mjs'
import { syncGemini } from '../lib/adapters/gemini.mjs'
import { syncQwen } from '../lib/adapters/qwen.mjs'
import { syncMcp } from '../lib/adapters/mcp.mjs'
import { syncCodex } from '../lib/adapters/codex.mjs'

export function driftProblems({ repoRoot, home, manifest }) {
  const local = readLocal(repoRoot)
  const plugins = activePlugins(manifest, local)
  const lines = []
  const push = (tool, detail) => lines.push(`drift [${tool}]: ${detail}`)

  // adoption-gate: only report drift for tools whose target dirs already exist
  const adopted = (p) => fs.existsSync(p)

  if (adopted(path.join(home, '.agents', 'skills'))) {
    const br = syncBridge({ repoRoot, plugins, local,
      bridgeRootPath: path.join(home, '.agents', 'skills'), dryRun: true })
    const brDiff = [...br.created, ...br.removed]
    if (brDiff.length) push('bridge', brDiff.join(', '))
  }

  const cl = syncClaude({ repoRoot, plugins, home, dryRun: true })
  if (!cl.skipped) {
    const clDiff = [...cl.added, ...cl.removed]
    if (clDiff.length) push('claude', clDiff.join(', '))
  }

  const oc = syncOpencode({ repoRoot, plugins, home, dryRun: true })
  if (!oc.skipped) {
    const ocDiff = [...oc.added, ...oc.removed]
    if (ocDiff.length) push('opencode', ocDiff.join(', '))
  }

  if (adopted(path.join(home, '.gemini'))) {
    const res = syncGemini({ repoRoot, plugins, home, local, dryRun: true })
    const diff = [...(res.created ?? []), ...(res.removed ?? [])]
    if (diff.length) push('gemini', diff.join(', '))
  }

  if (adopted(path.join(home, '.qwen'))) {
    const res = syncQwen({ repoRoot, plugins, home, local, dryRun: true })
    const diff = [...(res.created ?? []), ...(res.removed ?? [])]
    if (diff.length) push('qwen', diff.join(', '))
  }

  const mc = syncMcp({ repoRoot, plugins, home, dryRun: true })
  for (const w of mc.warnings ?? []) push('mcp', w)
  for (const [target, r] of Object.entries(mc)) {
    if (target === 'warnings' || !r || r.skipped) continue
    const diff = [...(r.added ?? []), ...(r.removed ?? [])]
    if (diff.length) push(`mcp/${target}`, diff.join(', '))
  }

  if (adopted(path.join(home, '.codex'))) {
    const cx = syncCodex({ repoRoot, plugins, home, dryRun: true })
    if (!cx.skipped) {
      const cxDiff = [...(cx.added ?? []), ...(cx.removed ?? [])]
      if (cxDiff.length) push('codex', cxDiff.join(', '))
      for (const w of cx.warnings ?? []) push('codex', w)
    }
  }

  return lines
}

export function runDoctor({ repoRoot, home = null }) {
  const manifest = loadManifest(repoRoot)
  const base = path.join(repoRoot, manifest.plugin_dir ?? 'universal-plugin')
  const problems = []
  for (const p of manifest.plugins) {
    const dest = pluginDest(repoRoot, p)
    if (!fs.existsSync(dest)) { problems.push(`missing folder for ${p.name}: ${dest}`); continue }
    const g = structureGate(dest)
    if (!g.ok) problems.push(`structure problem in ${p.name}: ${g.reason}`)
  }
  // orphan folders: exist on disk but not in manifest
  const wanted = new Set(manifest.plugins.map(p => path.relative(base, pluginDest(repoRoot, p))))
  if (!fs.existsSync(base)) return { problems }
  for (const cat of fs.readdirSync(base, { withFileTypes: true })) {
    if (!cat.isDirectory() || cat.name === '_quarantine') continue
    const catPath = path.join(base, cat.name)
    for (const tier of fs.readdirSync(catPath, { withFileTypes: true })) {
      if (!tier.isDirectory()) continue
      const tierPath = path.join(catPath, tier.name)
      for (const leaf of fs.readdirSync(tierPath, { withFileTypes: true })) {
        if (!leaf.isDirectory()) continue
        const leafPath = path.join(tierPath, leaf.name)
        const rel = path.relative(base, leafPath)
        if (!wanted.has(rel)) problems.push(`orphan folder (not in manifest): ${rel}`)
      }
    }
  }
  problems.push(...driftProblems({ repoRoot, home: home ?? os.homedir(), manifest }))
  return { problems }
}

export function runStatus({ repoRoot }) {
  const manifest = loadManifest(repoRoot)
  const state = readState(repoRoot)
  const local = readLocal(repoRoot)
  return manifest.plugins.map(p => {
    const remote = lsRemote(p.url)
    const known = state.plugins[p.name]?.upstream_commit_sha ?? null
    return { name: p.name, category: p.category, tier: p.tier,
             active: activeState(p, local),
             version: state.plugins[p.name]?.version ?? null,
             behindBy: remote && known && remote !== known ? 1 : 0,
             url: p.url }
  })
}
