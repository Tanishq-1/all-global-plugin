// scripts/lib/adapters/codex.mjs — Codex CLI MCP config (~/.codex/config.toml).
// Managed marker block in TOML comments; user TOML never parsed or reformatted.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { collectMcpEntries } from './mcp.mjs'
import { emitMcpBlock, extractManagedBlock, serverNamesInBlock, replaceManagedBlock } from '../toml.mjs'

function configFile(home) {
  const base = process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(home, '.codex')
  return path.join(base, 'config.toml')
}

function isStdioServer(srv) {
  return typeof srv?.command === 'string' && !srv.type && !srv.url
}

export function syncCodex({ repoRoot, plugins, home = os.homedir(), dryRun = false }) {
  const file = configFile(home)
  if (!fs.existsSync(file)) return { skipped: true, added: [], removed: [], warnings: [] }

  const { servers: collected, warnings } = collectMcpEntries(repoRoot, plugins)

  const servers = {}
  for (const [name, srv] of Object.entries(collected)) {
    if (isStdioServer(srv)) servers[name] = srv
    else warnings.push(`${name}: non-stdio MCP server skipped for codex (TOML target supports command servers only)`)
  }

  const src = fs.readFileSync(file, 'utf8')
  const currentBlock = extractManagedBlock(src)
  const currentNames = serverNamesInBlock(currentBlock)

  const desiredBlock = emitMcpBlock(servers)
  const desiredNames = Object.keys(servers)

  const added = desiredNames.filter(n => !currentNames.includes(n))
  const removed = currentNames.filter(n => !desiredNames.includes(n))

  if (currentBlock === (desiredBlock || null)) {
    return { skipped: false, added: [], removed: [], warnings }
  }
  if (dryRun) return { skipped: false, added, removed, warnings }

  const out = replaceManagedBlock(src, desiredBlock || null)

  const bak = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`
  fs.copyFileSync(file, bak)
  fs.writeFileSync(file, out)

  return { skipped: false, added, removed, warnings, backupPath: bak }
}
