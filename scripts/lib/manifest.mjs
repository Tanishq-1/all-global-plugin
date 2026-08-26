// scripts/lib/manifest.mjs
import fs from 'node:fs'
import path from 'node:path'

const REQUIRED = ['name', 'category', 'tier', 'url']
const TIERS = ['official', 'oss']

export function validateManifest(m) {
  const errs = []
  if (m.version !== 2) errs.push('version must be 2')
  for (const [i, p] of (m.plugins ?? []).entries()) {
    for (const k of REQUIRED) if (!p[k]) errs.push(`plugins[${i}].${k} missing`)
    if (p.tier && !TIERS.includes(p.tier)) errs.push(`plugins[${i}].tier must be official|oss`)
  }
  const names = (m.plugins ?? []).map(p => p.name)
  const dupes = names.filter((n, i) => names.indexOf(n) !== i)
  if (dupes.length) errs.push(`duplicate plugin names: ${[...new Set(dupes)].join(', ')}`)
  return errs
}

export function loadManifest(repoRoot) {
  const m = JSON.parse(fs.readFileSync(path.join(repoRoot, 'plugins.json'), 'utf8'))
  const errs = validateManifest(m)
  if (errs.length) throw new Error('invalid manifest:\n' + errs.join('\n'))
  return m
}
