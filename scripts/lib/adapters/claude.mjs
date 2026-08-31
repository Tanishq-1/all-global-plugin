// scripts/lib/adapters/claude.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pluginDest } from '../layout.mjs'

function settingsFile(home) {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR
    ? path.resolve(expandTilde(process.env.CLAUDE_CONFIG_DIR))
    : path.join(home, '.claude')
  return path.join(claudeDir, 'settings.json')
}

function expandTilde(p) {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(os.homedir(), p.slice(2))
  return p
}

function desiredMarketplaces(repoRoot, plugins) {
  const out = new Map()
  for (const p of plugins) {
    const key = p.marketplace_key ?? p.name
    const folderFwd = pluginDest(repoRoot, p).replace(/\\/g, '/')
    out.set(key, { path: folderFwd, source: 'agp' })
  }
  return out
}

function desiredEnabledKeys(plugins) {
  const keys = new Map()
  for (const p of plugins) {
    const mk = p.marketplace_key ?? p.name
    const all = Array.isArray(p.plugin_keys) && p.plugin_keys.length
      ? [...new Set([...p.plugin_keys, ...(p.plugin_key ? [p.plugin_key] : [])])]
      : (p.plugin_key ? [p.plugin_key] : [])
    for (const k of all) keys.set(k, mk)
  }
  return keys
}

export function syncClaude({ repoRoot, plugins, home = os.homedir(), dryRun = false }) {
  const file = settingsFile(home)
  if (!fs.existsSync(file)) return { skipped: true, added: [], removed: [] }

  const before = JSON.parse(fs.readFileSync(file, 'utf8'))
  const after = JSON.parse(JSON.stringify(before))
  after.extraKnownMarketplaces = { ...(after.extraKnownMarketplaces ?? {}) }
  after.enabledPlugins = { ...(after.enabledPlugins ?? {}) }

  const desiredMp = desiredMarketplaces(repoRoot, plugins)
  const desiredKeys = desiredEnabledKeys(plugins)
  const repoFwd = fs.realpathSync(repoRoot).replace(/\\/g, '/')

  const added = [], removed = []

  for (const [key, entry] of desiredMp) {
    const cur = after.extraKnownMarketplaces[key]
    if (!cur || JSON.stringify(cur) !== JSON.stringify(entry)) {
      added.push(key)
      after.extraKnownMarketplaces[key] = entry
    }
  }

  const staleMpKeys = new Set()
  for (const [key, entry] of Object.entries(after.extraKnownMarketplaces)) {
    if (desiredMp.has(key)) continue
    const entryPath = typeof entry === 'string' ? entry : entry?.path ?? ''
    if (entryPath.startsWith(repoFwd + '/')) {
      staleMpKeys.add(key)
    }
  }

  const staleEnabledKeys = new Set()
  for (const [key] of Object.entries(after.enabledPlugins)) {
    if (desiredKeys.has(key)) continue
    const mk = key.includes('@') ? key.slice(key.indexOf('@') + 1) : null
    if (!mk) continue
    if (staleMpKeys.has(mk)) { staleEnabledKeys.add(key); continue }
    if (desiredMp.has(mk)) continue
    const mpEntry = after.extraKnownMarketplaces[mk]
    const mpPath = typeof mpEntry === 'string' ? mpEntry : mpEntry?.path ?? ''
    if (!mpEntry || mpPath.startsWith(repoFwd + '/')) staleEnabledKeys.add(key)
  }

  if (dryRun) {
    return { skipped: false, added: added.sort(), removed: [...staleEnabledKeys].sort() }
  }

  for (const k of staleMpKeys) delete after.extraKnownMarketplaces[k]
  for (const k of staleEnabledKeys) {
    delete after.enabledPlugins[k]
    removed.push(k)
  }
  for (const [key] of desiredKeys) {
    after.enabledPlugins[key] = true
  }

  const bak = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`
  fs.copyFileSync(file, bak)
  fs.writeFileSync(file, JSON.stringify(after, null, 2) + '\n')

  return { skipped: false, added: added.sort(), removed: removed.sort(), backupPath: bak }
}
