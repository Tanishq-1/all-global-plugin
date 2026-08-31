// scripts/cmd/update.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'
import { lsRemote, clone, headSha, commitAll } from '../lib/gitsrc.mjs'
import { runGates } from '../lib/gates.mjs'
import { quarantine } from '../lib/quarantine.mjs'
import { stageDir, stripGit, swapIn } from '../lib/atomic.mjs'
import { pluginDest, collectExistingSkillNames } from '../lib/layout.mjs'
import { discoverSkills } from '../lib/discover.mjs'
import { recordUpdate } from '../lib/state.mjs'
import { readLocal, isEnabled } from '../lib/local.mjs'

function selectPlugins(manifest, { name, category }) {
  if (name) return manifest.plugins.filter(p => p.name === name)
  if (category) return manifest.plugins.filter(p => p.category === category)
  return manifest.plugins
}

function readVersion(dir) {
  for (const f of ['.claude-plugin/plugin.json', 'plugin.json', 'package.json']) {
    const p = path.join(dir, f)
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')).version ?? null } catch { /* ignore */ }
    }
  }
  return null
}

function reValidate(dest) {
  // structure-only: uniqueness against the full installed set is enforced pre-swap
  const g = runGates({ stagedDir: dest, existingNames: new Set() })
  if (g.failures.some(f => f.gate === 'structure')) throw new Error('post-swap validation failed')
}

export async function runUpdate({ repoRoot, name = null, category = null, dryRun = false }) {
  const manifest = loadManifest(repoRoot)
  const updated = [], skipped = [], failed = []
  for (const entry of selectPlugins(manifest, { name, category })) {
    const dest = pluginDest(repoRoot, entry)
    console.log(`update: ${entry.name}${dryRun ? ' (dry-run)' : ''}`)
    if (dryRun) { skipped.push(entry.name); continue }
    const reach = lsRemote(entry.url)
    if (!reach) {
      failed.push(entry.name)
      console.error(`  unreachable upstream: ${entry.url}`)
      continue
    }
    // uniqueness matters only for skills that will actually sync: a disabled
    // plugin never lands in any target, so its names (and collisions) are inert
    const local = readLocal(repoRoot)
    let existingNames
    if (isEnabled(entry, local)) {
      existingNames = collectExistingSkillNames(repoRoot)
      for (const p2 of manifest.plugins) {
        if (p2 === entry || isEnabled(p2, local)) continue
        for (const s of discoverSkills(pluginDest(repoRoot, p2))) {
          if (s.name) existingNames.delete(s.name)
        }
      }
      for (const s of discoverSkills(dest)) if (s.name) existingNames.delete(s.name)
    } else {
      existingNames = new Set()
    }
    const staged = stageDir(dest)
    try {
      clone(entry.url, entry.pin, staged)
    } catch (e) {
      fs.rmSync(staged, { recursive: true, force: true }); failed.push(entry.name)
      console.error(`  ${e.message}`); continue
    }
    const gates = runGates({ stagedDir: staged, existingNames })
    if (!gates.ok) {
      quarantine(repoRoot, entry.name, staged, gates.failures); failed.push(entry.name)
      console.error(`  gates failed: ${gates.failures.map(f => f.gate).join(', ')}`); continue
    }
    if (gates.inventory.length) {
      console.warn(`  executable content present (review before enabling hooks): ${gates.inventory.join(', ')}`)
    }
    stripGit(staged)
    try {
      swapIn(staged, dest, reValidate)
    } catch (e) {
      failed.push(entry.name); console.error(`  swap failed: ${e.message}`); continue
    }
    recordUpdate(repoRoot, entry.name, {
      version: readVersion(dest),
      upstream_commit_sha: reach,
      snapshot_commit: reach,
      last_updated: new Date().toISOString(),
    })
    commitAll(repoRoot, `Update ${entry.name} → ${readVersion(dest) ?? 'n/a'} (${String(reach).slice(0, 7)})`)
    updated.push(entry.name)
  }
  return dryRun ? { updated, skipped, failed, dryRun: true } : { updated, skipped, failed }
}
