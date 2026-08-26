// scripts/cmd/inspect.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'
import { structureGate } from '../lib/gates.mjs'
import { pluginDest } from '../lib/layout.mjs'
import { lsRemote } from '../lib/gitsrc.mjs'
import { readState } from '../lib/state.mjs'

export function runDoctor({ repoRoot }) {
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
  return { problems }
}

export function runStatus({ repoRoot }) {
  const manifest = loadManifest(repoRoot)
  const state = readState(repoRoot)
  return manifest.plugins.map(p => {
    const remote = lsRemote(p.url)
    const known = state.plugins[p.name]?.upstream_commit_sha ?? null
    return { name: p.name, category: p.category, tier: p.tier,
             version: state.plugins[p.name]?.version ?? null,
             behindBy: remote && known && remote !== known ? 1 : 0,
             url: p.url }
  })
}
