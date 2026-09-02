// scripts/lib/changelog.mjs
import fs from 'node:fs'
import path from 'node:path'

const FILE = 'CHANGELOG.md'
const HEADER = '# Changelog\n\n'

export function appendChangelog({ repoRoot, batch, updateResult }) {
  const abs = path.join(repoRoot, FILE)
  const existing = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : ''
  if (existing.includes(`(${batch.id})`)) return { changed: false, section: '' }
  const { updated = [], skipped = [], failed = [] } = updateResult ?? {}
  const section = [
    `## ${batch.at.slice(0, 10)} — batch ${batch.id.replace('batch/', '')} (${batch.id})`,
    '',
    `- updated: ${updated.join(', ') || 'none'}`,
    `- skipped: ${skipped.join(', ') || 'none'}`,
    `- failed: ${failed.join(', ') || 'none'}`,
    '',
  ].join('\n')
  const body = existing.startsWith('# Changelog') ? existing.slice(HEADER.length) : existing
  fs.writeFileSync(abs, HEADER + section + body)
  return { changed: true, section }
}
