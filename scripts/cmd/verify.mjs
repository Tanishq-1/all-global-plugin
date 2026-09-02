// scripts/cmd/verify.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'
import { structureGate } from '../lib/gates.mjs'
import { pluginDest } from '../lib/layout.mjs'
import { discoverSkills } from '../lib/discover.mjs'
import { readLocal, activePlugins } from '../lib/local.mjs'

const DEBRIS = (name) => name === '_quarantine' || name.startsWith('.stage-') || name.includes('.old-')

export function runVerify({ repoRoot }) {
  const manifest = loadManifest(repoRoot) // throws on invalid manifest
  const local = readLocal(repoRoot)
  const base = path.join(repoRoot, manifest.plugin_dir ?? 'universal-plugin')
  const problems = []
  const seen = new Map()
  let skillCount = 0
  for (const p of activePlugins(manifest, local)) {
    const dest = pluginDest(repoRoot, p)
    const g = structureGate(dest)
    if (!g.ok) problems.push(`structure problem in ${p.name}: ${g.reason}`)
    for (const s of discoverSkills(dest, DEBRIS)) {
      if (!s.name) continue
      skillCount++
      const owner = seen.get(s.name)
      if (owner !== undefined && owner !== p.name) {
        problems.push(`duplicate skill name '${s.name}' in ${p.name} and ${owner}`)
      } else seen.set(s.name, p.name)
    }
  }
  const wanted = new Set(manifest.plugins.map(p => path.relative(base, pluginDest(repoRoot, p))))
  if (fs.existsSync(base)) {
    for (const cat of fs.readdirSync(base, { withFileTypes: true })) {
      if (!cat.isDirectory() || cat.name === '_quarantine') continue
      const catPath = path.join(base, cat.name)
      for (const tier of fs.readdirSync(catPath, { withFileTypes: true })) {
        if (!tier.isDirectory()) continue
        const tierPath = path.join(catPath, tier.name)
        for (const leaf of fs.readdirSync(tierPath, { withFileTypes: true })) {
          if (!leaf.isDirectory()) continue
          const rel = path.relative(base, path.join(tierPath, leaf.name))
          if (!wanted.has(rel)) problems.push(`orphan folder (not in manifest): ${rel}`)
        }
      }
    }
  }
  return { ok: problems.length === 0, problems, skillCount }
}
