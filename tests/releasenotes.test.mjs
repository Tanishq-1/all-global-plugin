// tests/releasenotes.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { generateReleaseNotes, writeReleaseNotes } from '../scripts/lib/releasenotes.mjs'
import { readState } from '../scripts/lib/state.mjs'

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-rn-'))
  fs.mkdirSync(path.join(root, 'universal-plugin'), { recursive: true })
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'demo', category: '_universal', tier: 'oss',
                url: 'https://github.com/acme/demo-skills' }],
  }))
  fs.writeFileSync(path.join(root, 'state.json'), JSON.stringify({
    plugins: { demo: { version: '2.0.0', upstream_commit_sha: 'c'.repeat(40),
                       snapshot_commit: 'd'.repeat(40), last_updated: '2026-09-03T00:00:00.000Z' } },
    batches: [{ id: 'batch/2026-09-03T00-00-00-000Z', pre: 'a'.repeat(40), post: 'b'.repeat(40),
                at: '2026-09-03T00:00:00.000Z', tag: 'batch/2026-09-03T00-00-00-000Z',
                plugins: { demo: { pre_version: '1.0.0', pre_upstream_sha: 'e'.repeat(40) } } }],
  }))
  return root
}

test('generateReleaseNotes: one file per changed plugin, delta + compare link', () => {
  const root = fixture()
  const s = readState(root)
  const { files, skipped } = generateReleaseNotes({ repoRoot: root, batch: s.batches[0] })
  assert.deepEqual(skipped, [])
  assert.equal(files.length, 1)
  assert.ok(files[0].file.replace(/\\/g, '/').startsWith('release-notes/demo-2026-09-03T00-00-00.000Z.md'),
    `unexpected filename: ${files[0].file}`)
  assert.match(files[0].content, /# demo/)
  assert.match(files[0].content, /Version: 1\.0\.0 → 2\.0\.0/)
  assert.match(files[0].content, /github\.com\/acme\/demo-skills\/compare\/e{40}\.\.\.c{40}/)
  assert.match(files[0].content, /snapshot: d{7}/i)
})

test('writeReleaseNotes: creates release-notes/ on demand, writes file', () => {
  const root = fixture()
  const s = readState(root)
  const res = writeReleaseNotes({ repoRoot: root, batch: s.batches[0] })
  assert.equal(res.written.length, 1)
  const abs = path.join(root, 'release-notes', 'demo-2026-09-03T00-00-00.000Z.md')
  assert.ok(fs.existsSync(abs))
  assert.match(fs.readFileSync(abs, 'utf8'), /# demo/)
})

test('generateReleaseNotes: skips unmanifested plugin and no-delta plugin', () => {
  const root = fixture()
  const s = readState(root)
  const b = { ...s.batches[0], plugins: {
    ghost: { pre_version: null, pre_upstream_sha: 'f'.repeat(40) },
    demo: { pre_version: '2.0.0', pre_upstream_sha: 'c'.repeat(40) },
  } }
  const { files, skipped } = generateReleaseNotes({ repoRoot: root, batch: b })
  assert.deepEqual(files, [])
  assert.deepEqual(skipped.sort(), ['demo', 'ghost'])
})

test('non-github url omits compare link', () => {
  const root = fixture()
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'demo', category: '_universal', tier: 'oss', url: 'https://gitlab.com/acme/demo' }],
  }))
  const s = readState(root)
  const { files } = generateReleaseNotes({ repoRoot: root, batch: s.batches[0] })
  assert.equal(files.length, 1)
  assert.ok(!/compare\//.test(files[0].content))
})
