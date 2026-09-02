// tests/changelog.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { appendChangelog } from '../scripts/lib/changelog.mjs'

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-cl-'))
  return root
}

function batch(over = {}) {
  return { id: 'batch/2026-09-03T00-00-00-000Z', pre: 'a'.repeat(40), post: 'b'.repeat(40),
           at: '2026-09-03T00:00:00.000Z', tag: 'batch/2026-09-03T00-00-00-000Z', plugins: {},
           ...over }
}

test('creates CHANGELOG.md with header + batch section when absent', () => {
  const root = fixture()
  const res = appendChangelog({ repoRoot: root, batch: batch(),
    updateResult: { updated: ['demo'], skipped: [], failed: [] } })
  assert.equal(res.changed, true)
  const md = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
  assert.ok(md.startsWith('# Changelog\n\n'))
  assert.match(md, /2026-09-03 — batch 2026-09-03T00-00-00-000Z \(batch\/2026-09-03T00-00-00-000Z\)/)
  assert.match(md, /- updated: demo/)
  assert.match(md, /- failed: none/)
})

test('idempotent: same batch appended twice changes nothing the second time', () => {
  const root = fixture()
  const b = batch()
  appendChangelog({ repoRoot: root, batch: b, updateResult: { updated: ['demo'] } })
  const before = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
  const res = appendChangelog({ repoRoot: root, batch: b, updateResult: { updated: ['demo'] } })
  assert.equal(res.changed, false)
  const after = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
  assert.equal(after, before)
})

test('preserves pre-existing user changelog body below the header', () => {
  const root = fixture()
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'),
    '# Changelog\n\n## 2026-01-01 — old entry\n\n- updated: legacy\n\n')
  appendChangelog({ repoRoot: root, batch: batch(), updateResult: { updated: ['demo'] } })
  const md = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
  const newIdx = md.indexOf('batch/2026-09-03T00-00-00-000Z')
  const oldIdx = md.indexOf('## 2026-01-01 — old entry')
  assert.ok(newIdx !== -1 && oldIdx !== -1)
  assert.ok(newIdx < oldIdx, 'newest section must be on top')
  assert.match(md, /- updated: legacy\n/)
})

test('renders failed plugins', () => {
  const root = fixture()
  appendChangelog({ repoRoot: root, batch: batch(),
    updateResult: { updated: ['a'], skipped: ['b'], failed: ['x', 'y'] } })
  const md = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
  assert.match(md, /- failed: x, y/)
  assert.match(md, /- skipped: b/)
})

test('each batch id appears exactly once across multiple appends', () => {
  const root = fixture()
  appendChangelog({ repoRoot: root, batch: batch(), updateResult: { updated: ['a'] } })
  appendChangelog({ repoRoot: root, batch: batch({ id: 'batch/2026-09-10T00-00-00-000Z',
                                                    at: '2026-09-10T00:00:00.000Z' }),
    updateResult: { updated: ['b'] } })
  const md = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
  assert.equal((md.match(/batch\/2026-09-03T00-00-00-000Z/g) ?? []).length, 1)
  assert.equal((md.match(/batch\/2026-09-10T00-00-00-000Z/g) ?? []).length, 1)
  assert.ok(md.indexOf('2026-09-10') < md.indexOf('2026-09-03'), 'newest first')
})
