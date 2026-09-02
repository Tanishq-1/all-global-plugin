// scripts/lib/adapters/qwen.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { discoverSkills } from '../discover.mjs'
import { pluginDest } from '../layout.mjs'
import { ensureJunction, removeJunctionIfOwn } from './junctions.mjs'

function desiredSkills(repoRoot, plugins) {
  const DEBRIS = (name) => name === '_quarantine' || name.startsWith('.stage-') || name.includes('.old-')
  const desired = new Map()
  for (const p of plugins) {
    const dest = pluginDest(repoRoot, p)
    const skillRoot = p.skill_entry ? path.join(dest, ...p.skill_entry.split('/')) : dest
    for (const s of discoverSkills(skillRoot, DEBRIS)) {
      if (s.name && !desired.has(s.name)) desired.set(s.name, s.dir)
    }
  }
  return desired
}

export function syncQwen({ repoRoot, plugins, home = os.homedir(), local, dryRun = false }) {
  const desired = desiredSkills(repoRoot, plugins)
  const rootDir = path.join(home, '.qwen', 'skills')
  const created = [], removed = []

  if (dryRun) {
    for (const name of desired.keys()) {
      if (!fs.existsSync(path.join(rootDir, name))) created.push(name)
    }
    return { created: created.sort(), removed, skipped: [] }
  }

  for (const [name, dirPath] of desired) {
    if (ensureJunction(dirPath, path.join(rootDir, name)) === 'created') created.push(name)
  }

  if (fs.existsSync(rootDir)) {
    for (const e of fs.readdirSync(rootDir, { withFileTypes: true })) {
      if (!e.isSymbolicLink()) continue
      const link = path.join(rootDir, e.name)
      if (!desired.has(e.name) && removeJunctionIfOwn(link, repoRoot) === 'removed') {
        removed.push(e.name)
      }
    }
  }

  return { created: created.sort(), removed: removed.sort(), skipped: [] }
}
