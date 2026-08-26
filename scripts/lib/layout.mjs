// scripts/lib/layout.mjs
import fs from 'node:fs'
import path from 'node:path'
import { discoverSkills } from './discover.mjs'
import { loadManifest } from './manifest.mjs'

function loadManifestTolerant(repoRoot) {
  return fs.existsSync(path.join(repoRoot, 'plugins.json'))
    ? loadManifest(repoRoot)
    : {}
}

export function pluginDest(repoRoot, entry) {
  const m = loadManifestTolerant(repoRoot)
  return path.join(repoRoot, m.plugin_dir ?? 'universal-plugin',
                   entry.category, entry.tier, entry.name)
}

export function collectExistingSkillNames(repoRoot) {
  const m = loadManifestTolerant(repoRoot)
  const base = path.join(repoRoot, m.plugin_dir ?? 'universal-plugin')
  const names = new Set()
  for (const s of discoverSkills(base)) {
    if (s.name) names.add(s.name)
  }
  return names
}
