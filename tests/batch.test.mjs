// tests/batch.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-batch-'))
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root })
  const up = path.join(root, 'upstream')
  const sk = path.join(up, 'skills', 'demo')
  fs.mkdirSync(sk, { recursive: true })
  fs.writeFileSync(path.join(sk, 'SKILL.md'), '---\nname: demo\ndescription: v1\n---\nbody-v1')
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: up })
  execFileSync('git', ['-C', up, 'add', '-A'])
  execFileSync('git', ['-C', up, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'v1'])
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify(
    { version: 2, plugin_dir: 'universal-plugin', targets: {}, plugins: [] }))
  fs.mkdirSync(path.join(root, 'universal-plugin'), { recursive: true })
  process.chdir(root)
  return { root, up }
}

function bumpUpstream(up, body) {
  fs.writeFileSync(path.join(up, 'skills', 'demo', 'SKILL.md'),
    `---\nname: demo\ndescription: v2\n---\n${body}`)
  execFileSync('git', ['-C', up, 'add', '-A'])
  execFileSync('git', ['-C', up, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'bump'])
}

test('commitAll returns new SHA; null on no-op', async () => {
  const { root } = fixture()
  fs.writeFileSync(path.join(root, 'universal-plugin', 'x.txt'), 'x')
  const { commitAll } = await import('../scripts/lib/gitsrc.mjs')
  const sha = commitAll(root, 'first')
  assert.match(sha, /^[0-9a-f]{40}$/)
  const again = commitAll(root, 'noop')
  assert.equal(again, null)
})

test('appendHistory and recordBatch accumulate across calls', async () => {
  const { root } = fixture()
  const { appendHistory, recordBatch, readState } = await import('../scripts/lib/state.mjs')
  appendHistory(root, 'demo', { repo_commit: 'a'.repeat(40), version: '1', upstream_commit_sha: 'b'.repeat(40), ts: 't1' })
  appendHistory(root, 'demo', { repo_commit: 'c'.repeat(40), version: '2', upstream_commit_sha: 'd'.repeat(40), ts: 't2' })
  recordBatch(root, { id: 'batch/x1', pre: 'e'.repeat(40), post: 'f'.repeat(40), at: 't', tag: 'batch/x1', plugins: {} })
  const s = readState(root)
  assert.equal(s.plugins.demo.history.length, 2)
  assert.equal(s.plugins.demo.history[1].version, '2')
  assert.equal(s.batches.length, 1)
  assert.equal(s.batches[0].id, 'batch/x1')
})

test('findBatch resolves last / full id / timestamp suffix', async () => {
  const { root } = fixture()
  const { recordBatch, readState, findBatch } = await import('../scripts/lib/state.mjs')
  recordBatch(root, { id: 'batch/2026-08-31T10-00-00-000Z', pre: 'a', post: 'b', at: 't', tag: null, plugins: {} })
  recordBatch(root, { id: 'batch/2026-08-31T11-00-00-000Z', pre: 'c', post: 'd', at: 't', tag: null, plugins: {} })
  const s = readState(root)
  assert.equal(findBatch(s, 'last').id, 'batch/2026-08-31T11-00-00-000Z')
  assert.equal(findBatch(s, 'batch/2026-08-31T10-00-00-000Z').id, 'batch/2026-08-31T10-00-00-000Z')
  assert.equal(findBatch(s, '2026-08-31T10-00-00-000Z').id, 'batch/2026-08-31T10-00-00-000Z')
  assert.equal(findBatch(s, 'batch/nope'), null)
})

test('runUpdate records history, batch, tag; snapshot_commit is a repo SHA', async () => {
  const { root, up } = fixture()
  const { runAdd } = await import('../scripts/cmd/manage.mjs')
  await runAdd({ repoRoot: root, name: 'demo', url: up.replace(/\\/g, '/'),
                 category: '_universal', tier: 'oss', dryRun: false })
  bumpUpstream(up, 'body-v2')
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  const res = await runUpdate({ repoRoot: root, name: 'demo', dryRun: false })
  assert.deepEqual(res.updated, ['demo'])

  const { readState } = await import('../scripts/lib/state.mjs')
  const s = readState(root)
  const p = s.plugins.demo
  assert.ok(Array.isArray(p.history) && p.history.length >= 2, 'history should accumulate add+update')
  assert.equal(p.snapshot_commit, p.history.at(-1).repo_commit, 'snapshot_commit must equal latest repo commit')
  assert.notEqual(p.snapshot_commit, p.upstream_commit_sha, 'snapshot_commit must not duplicate upstream sha')
  assert.match(p.snapshot_commit, /^[0-9a-f]{40}$/)

  assert.equal(s.batches.length, 1, 'update run must record a batch')
  const b = s.batches[0]
  assert.match(b.id, /^batch\//)
  assert.match(b.pre, /^[0-9a-f]{40}$/)
  assert.match(b.post, /^[0-9a-f]{40}$/)
  assert.equal(b.plugins.demo.pre_version, null)
  assert.equal(b.plugins.demo.pre_upstream_sha.length, 40)

  const tags = execFileSync('git', ['-C', root, 'tag', '-l'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
  assert.ok(tags.includes(b.id), `annotated tag ${b.id} must exist`)
})

test('failed update run records no batch and no tag', async () => {
  const { root } = fixture()
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'dead', category: '_universal', tier: 'oss',
                url: 'https://invalid.invalid/x.git' }],
  }))
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  const res = await runUpdate({ repoRoot: root, dryRun: false })
  assert.deepEqual(res.failed, ['dead'])
  const { readState } = await import('../scripts/lib/state.mjs')
  assert.equal(readState(root).batches, undefined)
  const tags = execFileSync('git', ['-C', root, 'tag', '-l'], { encoding: 'utf8' }).trim()
  assert.equal(tags, '')
})
