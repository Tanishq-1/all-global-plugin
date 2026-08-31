// scripts/lib/adapters/junctions.mjs
import fs from 'node:fs'
import path from 'node:path'

export function ensureJunction(target, link) {
  if (fs.existsSync(link)) {
    if (fs.lstatSync(link).isSymbolicLink() && fs.realpathSync(link) === fs.realpathSync(target)) {
      return 'exists'
    }
    throw new Error(`refusing to replace non-junction or mismatched link: ${link}`)
  }
  fs.mkdirSync(path.dirname(link), { recursive: true })
  fs.symlinkSync(target, link, 'junction')
  return 'created'
}

export function removeJunctionIfOwn(link, repoRoot) {
  if (!fs.existsSync(link)) return 'skipped'
  const st = fs.lstatSync(link)
  if (!st.isSymbolicLink()) return 'skipped'
  const resolved = fs.realpathSync(link)
  if (!resolved.startsWith(fs.realpathSync(repoRoot))) return 'skipped'
  fs.rmSync(link, { recursive: true, force: true })
  return 'removed'
}
