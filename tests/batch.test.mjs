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

// Regression: CI runners have no ambient git identity — commitAll must carry
// its own. Hermetic env: point GIT_CONFIG_GLOBAL/SYSTEM at empty files so the
// machine's real global config (with user.email) can't mask a regression.
test('commitAll works with no ambient git identity (CI runner)', async () => {
  const { root } = fixture()
  const emptyCfg = path.join(root, 'empty-git-config')
  fs.writeFileSync(emptyCfg, '')
  const prevGlobal = process.env.GIT_CONFIG_GLOBAL
  const prevSystem = process.env.GIT_CONFIG_SYSTEM
  process.env.GIT_CONFIG_GLOBAL = emptyCfg
  process.env.GIT_CONFIG_SYSTEM = emptyCfg
  try {
    fs.writeFileSync(path.join(root, 'universal-plugin', 'x.txt'), 'x')
    const { commitAll } = await import('../scripts/lib/gitsrc.mjs')
    const sha = commitAll(root, 'hermetic-commit')
    assert.match(sha, /^[0-9a-f]{40}$/)
    const log = execFileSync('git', ['-C', root, 'log', '-1', '--format=%an <%ae>'])
    assert.equal(log.toString().trim(), 'agp <agp@local>')
  } finally {
    if (prevGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL
    else process.env.GIT_CONFIG_GLOBAL = prevGlobal
    if (prevSystem === undefined) delete process.env.GIT_CONFIG_SYSTEM
    else process.env.GIT_CONFIG_SYSTEM = prevSystem
  }
})

// Regression: createTag must carry its own identity too — annotated tags record
// a tagger, and CI runners have none (same hermetic empty-config technique as
// the commitAll test above).
test('createTag works with no ambient git identity (CI runner)', async () => {
  const { root } = fixture()
  const emptyCfg = path.join(root, 'empty-git-config-tag')
  fs.writeFileSync(emptyCfg, '')
  const prevGlobal = process.env.GIT_CONFIG_GLOBAL
  const prevSystem = process.env.GIT_CONFIG_SYSTEM
  process.env.GIT_CONFIG_GLOBAL = emptyCfg
  process.env.GIT_CONFIG_SYSTEM = emptyCfg
  try {
    fs.writeFileSync(path.join(root, 'universal-plugin', 'x.txt'), 'x')
    const { commitAll, createTag } = await import('../scripts/lib/gitsrc.mjs')
    const sha = commitAll(root, 'tag-basis')
    assert.match(sha, /^[0-9a-f]{40}$/)
    createTag(root, 'batch/hermetic', 'hermetic batch')
    const tagList = execFileSync('git', ['-C', root, 'tag', '-l'], { encoding: 'utf8' }).trim()
    assert.equal(tagList, 'batch/hermetic')
    const tagger = execFileSync('git', ['-C', root, 'for-each-ref',
      'refs/tags/batch/hermetic', '--format=%(taggername) %(taggeremail)'], { encoding: 'utf8' })
    assert.equal(tagger.toString().trim(), 'agp <agp@local>')
  } finally {
    if (prevGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL
    else process.env.GIT_CONFIG_GLOBAL = prevGlobal
    if (prevSystem === undefined) delete process.env.GIT_CONFIG_SYSTEM
    else process.env.GIT_CONFIG_SYSTEM = prevSystem
  }
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

test('runUpdate generates release notes, changelog, index in the batch commit', async () => {
  const { root, up } = fixture()
  const { runAdd } = await import('../scripts/cmd/manage.mjs')
  await runAdd({ repoRoot: root, name: 'demo', url: up.replace(/\\/g, '/'),
                 category: '_universal', tier: 'oss', dryRun: false })
  bumpUpstream(up, 'body-v2')
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  const res = await runUpdate({ repoRoot: root, name: 'demo', dryRun: false })
  assert.deepEqual(res.updated, ['demo'])

  const { readState } = await import('../scripts/lib/state.mjs')
  const b = readState(root).batches[0]

  // release-notes file written, with a version/SHA delta
  const rnDir = path.join(root, 'release-notes')
  assert.ok(fs.existsSync(rnDir), 'release-notes dir must exist')
  const notes = fs.readdirSync(rnDir).filter(f => f.startsWith('demo-'))
  assert.equal(notes.length, 1, `one note for demo, got: ${notes.join(', ')}`)
  const noteContent = fs.readFileSync(path.join(rnDir, notes[0]), 'utf8')
  assert.match(noteContent, /# demo/)
  assert.match(noteContent, /→ /)

  // CHANGELOG.md at repo root contains the batch id
  const cl = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
  assert.match(cl, /# Changelog/)
  assert.ok(cl.includes(b.id), 'changelog must reference the batch id')
  assert.match(cl, /- updated: demo/)

  // INDEX.md regenerated
  const idx = fs.readFileSync(path.join(root, 'INDEX.md'), 'utf8')
  assert.match(idx, /# Plugin Catalog/)

  // everything rides the Record batch commit
  const logMsgs = execFileSync('git', ['-C', root, 'log', '--format=%H %s'], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean)
  const recordLine = logMsgs.find(l => l.includes('Record batch'))
  assert.ok(recordLine, 'Record batch commit must exist')
  const recordSha = recordLine.split(' ')[0]
  const names = execFileSync('git', ['-C', root, 'show', '--name-only', '--format=', recordSha], { encoding: 'utf8' })
  assert.ok(names.replace(/\\/g, '/').includes('release-notes/'), `Record batch commit must stage release-notes: ${names}`)
  assert.ok(names.includes('CHANGELOG.md'), 'Record batch commit must stage CHANGELOG.md')
  assert.ok(names.includes('INDEX.md'), 'Record batch commit must stage INDEX.md')
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
