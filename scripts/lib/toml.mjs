// scripts/lib/toml.mjs — minimal TOML emitter for MCP server tables + marker-block surgery.
// We only ever rewrite our own managed block; the user's TOML is never parsed.

export const MCP_START = '# agp:mcp-start'
export const MCP_END = '# agp:mcp-end'

export function tomlString(v) {
  const s = String(v)
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function tomlValue(v) {
  if (typeof v === 'string') return tomlString(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return tomlString(String(v))
}

export function emitServerTable(name, srv) {
  const lines = [`[mcp_servers.${name}]`]
  lines.push(`command = ${tomlValue(srv.command)}`)
  if (Array.isArray(srv.args) && srv.args.length) {
    lines.push(`args = [${srv.args.map(tomlValue).join(', ')}]`)
  }
  const env = srv.env ?? {}
  const envKeys = Object.keys(env)
  if (envKeys.length) {
    const inner = envKeys.map(k => `${k} = ${tomlValue(env[k])}`).join(', ')
    lines.push(`env = { ${inner} }`)
  }
  return lines.join('\n')
}

export function emitMcpBlock(servers) {
  const tables = Object.entries(servers).map(([name, srv]) => emitServerTable(name, srv))
  if (!tables.length) return ''
  return [MCP_START, '', tables.join('\n\n'), '', MCP_END].join('\n')
}

export function extractManagedBlock(src) {
  const s = src.indexOf(MCP_START)
  if (s === -1) return null
  const e = src.indexOf(MCP_END, s)
  if (e === -1) throw new Error('agp:mcp-start marker without matching end marker')
  return src.slice(s, e + MCP_END.length)
}

export function serverNamesInBlock(block) {
  if (!block) return []
  const names = []
  for (const m of block.matchAll(/^\[mcp_servers\.([^\]]+)\]/gm)) names.push(m[1])
  return names
}

export function replaceManagedBlock(src, block) {
  const s = src.indexOf(MCP_START)
  if (s === -1) {
    if (!block) return src
    const trimmed = src.replace(/\n*$/, '\n')
    return trimmed + '\n' + block + '\n'
  }
  const e = src.indexOf(MCP_END, s)
  if (e === -1) throw new Error('agp:mcp-start marker without matching end marker')
  const before = src.slice(0, s).replace(/\n[ \t]*\n*$/, '\n')
  const after = src.slice(e + MCP_END.length).replace(/^\n+/, '\n')
  if (!block) return before.trimEnd() + '\n' + after.replace(/^\n/, '')
  return before + '\n' + block + '\n' + after.replace(/^\n/, '')
}
