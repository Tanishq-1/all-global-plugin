// scripts/lib/gates.mjs
import fs from 'node:fs'
import path from 'node:path'
import { discoverSkills } from './discover.mjs'

export function structureGate(dir) {
  const mp = path.join(dir, '.claude-plugin', 'marketplace.json')
  if (fs.existsSync(mp)) {
    try { JSON.parse(fs.readFileSync(mp, 'utf8')); return { ok: true } }
    catch (e) { return { ok: false, reason: `marketplace.json unparseable: ${e.message}` } }
  }
  if (discoverSkills(dir).some(s => s.name && s.description)) return { ok: true }
  return { ok: false, reason: 'no marketplace.json and no valid SKILL.md' }
}

export function uniquenessGate(dir, existingNames) {
  const names = discoverSkills(dir).map(s => s.name).filter(Boolean)
  const dupes = [...new Set(names.filter(n => existingNames.has(n)))]
  return dupes.length
    ? { ok: false, reason: `duplicate skill names: ${dupes.join(', ')}` }
    : { ok: true, names }
}

export function safetyInventory(dir) {
  const hits = []
  for (const d of ['hooks', 'scripts']) {
    const p = path.join(dir, d)
    if (fs.existsSync(p)) {
      for (const f of fs.readdirSync(p, { recursive: true })) hits.push(`${d}/${f}`)
    }
  }
  if (fs.existsSync(path.join(dir, '.mcp.json'))) hits.push('.mcp.json')
  return hits
}

export function runGates({ stagedDir, existingNames }) {
  const failures = []
  const s = structureGate(stagedDir)
  if (!s.ok) failures.push({ gate: 'structure', reason: s.reason })
  const u = uniquenessGate(stagedDir, existingNames)
  if (!u.ok) failures.push({ gate: 'uniqueness', reason: u.reason })
  return { ok: failures.length === 0, failures, inventory: safetyInventory(stagedDir),
           skillCount: u.names?.length ?? 0 }
}
