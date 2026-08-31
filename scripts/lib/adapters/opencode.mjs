// scripts/lib/adapters/opencode.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pluginDest } from '../layout.mjs'

const START = '// agp:skills-start'
const END = '// agp:skills-end'

function configFile(home) {
  const base = process.env.XDG_CONFIG_HOME
    ? path.resolve(process.env.XDG_CONFIG_HOME)
    : path.join(home, '.config')
  return path.join(base, 'opencode', 'opencode.jsonc')
}

function blockFor(paths) {
  const json = JSON.stringify(paths, null, 2).replace(/\n/g, '\n  ')
  return `  ${START}\n  "skills": { "paths": ${json} }\n  ${END}`
}

function insertBeforeClose(src, block) {
  const trimmed = src.trimEnd()
  const idx = trimmed.lastIndexOf('}')
  if (idx === -1) return trimmed + '\n' + block + '\n'
  let head = trimmed.slice(0, idx).trimEnd()
  const needComma = head.length > 0 && !head.endsWith('{') && !head.endsWith(',') && !head.endsWith('[')
  if (needComma) head += ','
  return head + '\n' + block + '\n' + trimmed.slice(idx) + '\n'
}

function replaceManaged(src, newBlock) {
  const s = src.indexOf(START)
  if (s === -1) {
    return newBlock ? { out: insertBeforeClose(src, newBlock) } : { out: src }
  }
  const e = src.indexOf(END, s)
  if (e === -1) throw new Error('agp:skills-start marker without matching end marker')
  let before = src.slice(0, s).replace(/\n[ \t]*$/, '\n')
  const after = src.slice(e + END.length).replace(/^\n+/, '\n')
  if (!newBlock) {
    before = before.replace(/,(\s*)$/, '$1')
    const out = before.trimEnd() + (after.trim() ? '\n' + after.trimStart() : '\n')
    return { out }
  }
  return { out: before + newBlock + after }
}

function extractCurrentPaths(src) {
  const s = src.indexOf(START)
  if (s === -1) return []
  const e = src.indexOf(END, s)
  if (e === -1) return []
  const inner = src.slice(s, e + END.length)
  const m = /"paths"\s*:\s*(\[[^\]]*\])/.exec(inner)
  if (!m) return []
  try { return JSON.parse(m[1]) } catch { return [] }
}

export function syncOpencode({ repoRoot, plugins, home = os.homedir(), dryRun = false }) {
  const file = configFile(home)
  if (!fs.existsSync(file)) return { skipped: true, added: [], removed: [] }

  const src = fs.readFileSync(file, 'utf8')

  const nameByPath = new Map()
  const desired = plugins.map(p => {
    const dest = pluginDest(repoRoot, p)
    const root = p.skill_entry ? path.join(dest, ...p.skill_entry.split('/')) : dest
    const fwd = root.replace(/\\/g, '/')
    nameByPath.set(fwd, p.name)
    return fwd
  })

  const current = extractCurrentPaths(src).map(p => String(p).replace(/\\/g, '/'))
  const currentSet = new Set(current)
  const desiredSet = new Set(desired)
  const added = desired.filter(p => !currentSet.has(p)).map(p => nameByPath.get(p) ?? path.basename(p))
  const removed = current.filter(p => !desiredSet.has(p)).map(p => path.basename(p))

  if (dryRun) {
    return { skipped: false, added, removed }
  }

  const block = desired.length ? blockFor(desired) : null
  const { out } = replaceManaged(src, block)

  const bak = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`
  fs.copyFileSync(file, bak)
  fs.writeFileSync(file, out)

  return { skipped: false, added, removed, backupPath: bak }
}
