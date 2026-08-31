// scripts/lib/adapters/bridge.mjs
import fs from 'node:fs'
import path from 'node:path'
import { discoverSkills } from '../discover.mjs'
import { targetPath } from '../paths.mjs'
import { readLocal } from '../local.mjs'
import { ensureJunction, removeJunctionIfOwn } from './junctions.mjs'
import { pluginDest } from '../layout.mjs'

export function bridgeRoot(repoRoot, local = readLocal(repoRoot), bridgeRootPath = null) {
  if (bridgeRootPath) return bridgeRootPath
  return targetPath('bridge', {}, local.paths ?? {})
}

export function syncBridge({ repoRoot, plugins, local = null, bridgeRootPath = null, dryRun = false }) {
  const localJson = local ?? readLocal(repoRoot)
  const br = bridgeRoot(repoRoot, localJson, bridgeRootPath)

  const DEBRIS = (name) => name === '_quarantine' || name.startsWith('.stage-') || name.includes('.old-')
  const desired = new Map()
  for (const p of plugins) {
    const dest = pluginDest(repoRoot, p)
    const skillRoot = p.skill_entry ? path.join(dest, ...p.skill_entry.split('/')) : dest
    for (const s of discoverSkills(skillRoot, DEBRIS)) {
      if (s.name && !desired.has(s.name)) desired.set(s.name, s.dir)
    }
  }

  const created = [], removed = [], skipped = []
  if (dryRun) {
    for (const name of desired.keys()) {
      if (!fs.existsSync(path.join(br, name))) created.push(name)
    }
    return { created: created.sort(), removed, skipped }
  }

  for (const [name, dir] of desired) {
    const link = path.join(br, name)
    const r = ensureJunction(dir, link)
    if (r === 'created') created.push(name)
  }

  if (fs.existsSync(br)) {
    for (const e of fs.readdirSync(br, { withFileTypes: true })) {
      if (!e.isSymbolicLink()) continue
      const link = path.join(br, e.name)
      if (!desired.has(e.name) && removeJunctionIfOwn(link, repoRoot) === 'removed') {
        removed.push(e.name)
      }
    }
  }

  return { created: created.sort(), removed: removed.sort(), skipped }
}
