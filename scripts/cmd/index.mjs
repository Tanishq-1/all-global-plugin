// scripts/cmd/index.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'

export function generateIndex({ repoRoot }) {
  const m = loadManifest(repoRoot)
  const lines = ['# Plugin Catalog', '',
    `_Generated ${new Date().toISOString().slice(0, 10)} — do not edit by hand_`, '']
  const cats = [...new Set(m.plugins.map(p => p.category))].sort()
  for (const c of cats) {
    lines.push(`## ${c}`, '', '| name | tier | url |', '|---|---|---|')
    for (const p of m.plugins.filter(p => p.category === c)
                            .sort((a, b) => a.tier.localeCompare(b.tier))) {
      lines.push(`| ${p.name} | ${p.tier} | ${p.url} |`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

export function writeIndex({ repoRoot }) {
  const md = generateIndex({ repoRoot })
  fs.writeFileSync(path.join(repoRoot, 'INDEX.md'), md)
  return md
}
