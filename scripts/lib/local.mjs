// scripts/lib/local.mjs
import fs from 'node:fs'
import path from 'node:path'

const FILE = 'local.json'

export function readLocal(repoRoot) {
  const f = path.join(repoRoot, FILE)
  if (!fs.existsSync(f)) return { paths: {}, plugins: {} }
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'))
  return { ...raw,
           paths: { ...(raw.paths ?? {}) }, plugins: { ...(raw.plugins ?? {}) } }
}

export function writeLocal(repoRoot, local) {
  fs.writeFileSync(path.join(repoRoot, FILE), JSON.stringify(local, null, 2) + '\n')
}

export function isEnabled(entry, local) {
  const user = local.plugins?.[entry.name]?.enabled
  if (typeof user === 'boolean') return user
  return entry.enabled_by_default !== false
}

export function activeState(entry, local) {
  const user = local.plugins?.[entry.name]?.enabled
  if (typeof user === 'boolean') return user ? 'active' : 'off (you)'
  return entry.enabled_by_default === false ? 'off (default)' : 'active'
}

export function setEnabled(repoRoot, name, enabled) {
  const local = readLocal(repoRoot)
  local.plugins[name] = { ...(local.plugins[name] ?? {}), enabled }
  writeLocal(repoRoot, local)
  return local
}

export function activePlugins(manifest, local) {
  return (manifest.plugins ?? []).filter(p => isEnabled(p, local))
}
