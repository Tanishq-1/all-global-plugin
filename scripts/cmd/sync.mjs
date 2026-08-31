// scripts/cmd/sync.mjs
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'
import { readLocal, activePlugins } from '../lib/local.mjs'
import { syncBridge } from '../lib/adapters/bridge.mjs'
import { syncClaude } from '../lib/adapters/claude.mjs'
import { syncOpencode } from '../lib/adapters/opencode.mjs'
import { syncGemini } from '../lib/adapters/gemini.mjs'
import { syncQwen } from '../lib/adapters/qwen.mjs'
import { syncMcp } from '../lib/adapters/mcp.mjs'
import { syncCodex } from '../lib/adapters/codex.mjs'

const TOOL_KEYS = new Set(['bridge', 'claude', 'opencode', 'gemini', 'qwen', 'mcp', 'codex', 'windsurf', 'q'])

export function isToolKey(t) {
  return TOOL_KEYS.has(t)
}

export function runSync({ repoRoot, tool = null, plugin = null, category = null,
                         home = null, dryRun = false }) {
  const manifest = loadManifest(repoRoot)
  const local = readLocal(repoRoot)

  let selected = activePlugins(manifest, local)
  if (plugin) selected = selected.filter(p => p.name === plugin)
  if (category) selected = selected.filter(p => p.category === category)

  const opts = { repoRoot, plugins: selected, dryRun }
  const homeOpts = home ? { ...opts, home } : opts
  const geminiQwenOpts = home ? { ...opts, home, local } : { ...opts, local }
  const bridgeOpts = home
    ? { ...geminiQwenOpts, bridgeRootPath: path.join(home, '.agents', 'skills') }
    : geminiQwenOpts

  const wanted = tool ? new Set([tool]) : TOOL_KEYS
  const out = {}

  if (wanted.has('bridge')) out.bridge = syncBridge(bridgeOpts)
  if (wanted.has('claude')) out.claude = syncClaude(homeOpts)
  if (wanted.has('opencode')) out.opencode = syncOpencode(homeOpts)
  if (wanted.has('gemini')) out.gemini = syncGemini(geminiQwenOpts)
  if (wanted.has('qwen')) out.qwen = syncQwen(geminiQwenOpts)
  if (wanted.has('mcp')) {
    const mcpOpts = home ? { ...opts, home } : opts
    out.mcp = syncMcp({ ...mcpOpts, targets: ['cursor', 'gemini', 'qwen'] })
  }
  if (wanted.has('codex')) out.codex = syncCodex(homeOpts)
  if (wanted.has('windsurf')) {
    const o = home ? { ...opts, home } : opts
    out.windsurf = syncMcp({ ...o, targets: ['windsurf'] }).windsurf
  }
  if (wanted.has('q')) {
    const o = home ? { ...opts, home } : opts
    out.q = syncMcp({ ...o, targets: ['q'] }).q
  }

  return out
}
