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

export function appendHistory(repoRoot, name, entry) {
  const s = readState(repoRoot)
  s.plugins[name] = { ...(s.plugins[name] ?? {}) }
  s.plugins[name].history = [...(s.plugins[name].history ?? []), entry]
  writeState(repoRoot, s)
}

export function recordBatch(repoRoot, batch) {
  const s = readState(repoRoot)
  s.batches = [...(s.batches ?? []), batch]
  writeState(repoRoot, s)
}

export function findBatch(state, idOrLast) {
  const batches = state.batches ?? []
  if (idOrLast === 'last') return batches.at(-1) ?? null
  return batches.find(b => b.id === idOrLast
    || (idOrLast.startsWith('batch/') ? false : b.id === `batch/${idOrLast}`)) ?? null
}
