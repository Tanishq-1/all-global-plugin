// scripts/lib/paths.mjs
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

export function expandHome(p) {
  if (!p) return p
  if (p === '~') return os.homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(os.homedir(), p.slice(2))
  return p
}

function pick(raw) {
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object') return raw.settings_path ?? raw.config_path ?? raw.path
  return undefined
}

const DEFAULTS = {
  claude: () =>
    expandHome(process.env.CLAUDE_CONFIG_DIR ?? '~/.claude') + path.sep + 'settings.json',
  opencode: () =>
    path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'),
              'opencode', 'opencode.jsonc'),
  bridge: () => path.join(os.homedir(), '.agents', 'skills'),
  cursor: () => path.join(os.homedir(), '.cursor', 'skills'),
  qwen: () => path.join(os.homedir(), '.qwen', 'skills'),
}

export function targetPath(name, manifestTargets = {}, localOverrides = {}) {
  if (localOverrides[name] !== undefined) return expandHome(pick(localOverrides[name]))
  if (manifestTargets?.[name] !== undefined) return expandHome(pick(manifestTargets[name]))
  if (!DEFAULTS[name]) throw new Error(`unknown target: ${name}`)
  return DEFAULTS[name]()
}

export function loadLocalOverrides(repoRoot) {
  const f = path.join(repoRoot, 'paths.local.json')
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}
}
