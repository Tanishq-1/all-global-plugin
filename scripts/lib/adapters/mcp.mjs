// scripts/lib/adapters/mcp.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pluginDest } from '../layout.mjs'

const LITERAL = /^[A-Za-z0-9_\-]{8,}$/

function hasLiteralSecret(cfg) {
  const env = cfg?.env ?? {}
  for (const v of Object.values(env)) {
    if (typeof v === 'string' && !v.startsWith('${') && LITERAL.test(v)) return true
  }
  return false
}

export function collectMcpEntries(repoRoot, plugins) {
  const servers = {}
  const warnings = []
  for (const p of plugins) {
    const f = path.join(pluginDest(repoRoot, p), '.mcp.json')
    if (!fs.existsSync(f)) continue
    let cfg
    try { cfg = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { continue }
    for (const [name, srv] of Object.entries(cfg.mcpServers ?? {})) {
      if (hasLiteralSecret(srv)) {
        warnings.push(`${p.name}/${name}: literal secret in env — skipped for safety (use \${VAR} refs)`)
        continue
      }
      servers[name] = { ...srv, source: 'agp' }
    }
  }
  return { servers, warnings }
}

function targetFile(home, target) {
  if (target === 'cursor') return path.join(home, '.cursor', 'mcp.json')
  if (target === 'gemini') return path.join(home, '.gemini', 'settings.json')
  if (target === 'qwen') return path.join(home, '.qwen', 'settings.json')
  throw new Error(`unknown mcp target: ${target}`)
}

function syncJsonTarget({ file, servers, dryRun }) {
  if (!fs.existsSync(file)) return { skipped: true, added: [], removed: [] }
  const before = JSON.parse(fs.readFileSync(file, 'utf8'))
  const after = JSON.parse(JSON.stringify(before))
  after.mcpServers = { ...(after.mcpServers ?? {}) }

  const added = [], removed = []
  for (const [name, srv] of Object.entries(servers)) {
    if (!after.mcpServers[name] || JSON.stringify(after.mcpServers[name]) !== JSON.stringify(srv)) {
      added.push(name)
    }
  }
  for (const [name, entry] of Object.entries(after.mcpServers)) {
    if (!servers[name] && entry?.source === 'agp') removed.push(name)
  }

  if (dryRun) return { skipped: false, added, removed }

  for (const name of removed) delete after.mcpServers[name]
  for (const [name, srv] of Object.entries(servers)) after.mcpServers[name] = srv

  const bak = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`
  fs.copyFileSync(file, bak)
  fs.writeFileSync(file, JSON.stringify(after, null, 2) + '\n')
  return { skipped: false, added, removed, backupPath: bak }
}

export function syncMcp({ repoRoot, plugins, home = os.homedir(),
                          targets = ['cursor', 'gemini', 'qwen'], dryRun = false }) {
  const { servers, warnings } = collectMcpEntries(repoRoot, plugins)
  const out = { warnings }
  for (const t of targets) {
    out[t] = syncJsonTarget({ file: targetFile(home, t), servers, dryRun })
  }
  return out
}
