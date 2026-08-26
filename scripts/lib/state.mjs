// scripts/lib/state.mjs
import fs from 'node:fs'
import path from 'node:path'

const FILE = 'state.json'

export function readState(repoRoot) {
  const f = path.join(repoRoot, FILE)
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { plugins: {} }
}

export function writeState(repoRoot, state) {
  fs.writeFileSync(path.join(repoRoot, FILE), JSON.stringify(state, null, 2) + '\n')
}

export function recordUpdate(repoRoot, name, fields) {
  const s = readState(repoRoot)
  s.plugins[name] = { ...(s.plugins[name] ?? {}), ...fields }
  writeState(repoRoot, s)
}
