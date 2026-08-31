// tests/rollback.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-rb-'))
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

async function seed(repoRoot, up, name) {
  const { runAdd } = await import('../scripts/cmd/manage.mjs')
  const res = await runAdd({ repoRoot, name, url: up.replace(/\\/g, '/'),
                             category: '_universal', tier: 'oss', dryRun: false })
  assert.ok(res.ok, `seed add failed: ${res.error}`)
}

const dest = (name) => path.join('universal-plugin', '_universal', 'oss', name, 'skills')
const v1Body = () => fs.readFileSync(path.join(dest('demo'), 'demo', 'SKILL.md'), 'utf8')

test('rollback restores v1 content + state fields + creates rollback commit', async () => {
  const { root, up } = fixture()
  await seed(root, up, 'demo')
  bumpUpstream(up, 'body-v2')
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  await runUpdate({ repoRoot: root, name: 'demo', dryRun: false })
  assert.ok(v1Body().includes('body-v2'), 'sanity: v2 content present pre-rollback')

  const { runRollback } = await import('../scripts/cmd/rollback.mjs')
  const res = runRollback({ repoRoot: root, name: 'demo', dryRun: false })
  assert.ok(res.ok !== false, `rollback failed: ${res.error}`)
  assert.equal(v1Body().includes('body-v1'), true, 'v1 content restored')

  const { readState } = await import('../scripts/lib/state.mjs')
  const p = readState(root).plugins.demo
  assert.ok(p.history.length >= 3, 'rollback appends history')
  assert.match(p.snapshot_commit, /^[0-9a-f]{40}$/)

  const log = execFileSync('git', ['-C', root, 'log', '--oneline'], { encoding: 'utf8' })
  assert.ok(log.includes('Rollback demo'), 'rollback commit created')
})

test('rollback --to <add-commit> restores initial state', async () => {
  const { root, up } = fixture()
  await seed(root, up, 'demo')
  const addSha = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  bumpUpstream(up, 'body-v2')
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  await runUpdate({ repoRoot: root, name: 'demo', dryRun: false })

  const { runRollback } = await import('../scripts/cmd/rollback.mjs')
  const res = runRollback({ repoRoot: root, name: 'demo', to: addSha, dryRun: false })
  assert.ok(res.ok !== false, `rollback failed: ${res.error}`)
  assert.equal(v1Body().includes('body-v1'), true, 'initial content restored')
})

test('rollback --to with foreign SHA errors and lists candidates', async () => {
  const { root, up } = fixture()
  await seed(root, up, 'demo')
  bumpUpstream(up, 'body-v2')
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  await runUpdate({ repoRoot: root, name: 'demo', dryRun: false })

  const { runRollback } = await import('../scripts/cmd/rollback.mjs')
  const foreign = 'f'.repeat(40)
  const res = runRollback({ repoRoot: root, name: 'demo', to: foreign, dryRun: false })
  assert.equal(res.ok, false)
  assert.match(res.error, /not in commit history|candidates/)
})

test('batch rollback restores both plugins from pre state', async () => {
  const { root, up } = fixture()
  await seed(root, up, 'demo')
  bumpUpstream(up, 'body-v2')
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  await runUpdate({ repoRoot: root, name: 'demo', dryRun: false })
  const firstBatch = (await import('../scripts/lib/state.mjs')).readState(root).batches[0]
  assert.ok(firstBatch, 'update recorded a batch')

  const { runRollback } = await import('../scripts/cmd/rollback.mjs')
  const res = runRollback({ repoRoot: root, batch: 'last', dryRun: false })
  assert.ok(res.ok !== false, `batch rollback failed: ${res.error}`)
  assert.equal(v1Body().includes('body-v1'), true, 'content restored to pre state')
  const log = execFileSync('git', ['-C', root, 'log', '--oneline'], { encoding: 'utf8' })
  assert.ok(log.includes('Rollback batch'), 'batch rollback commit created')
})

test('batch rollback skips plugin added after pre', async () => {
  const { root, up } = fixture()
  await seed(root, up, 'demo')
  bumpUpstream(up, 'body-v2')
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  await runUpdate({ repoRoot: root, name: 'demo', dryRun: false })

  // add a second plugin after the batch window, then forge the last batch
  // record to claim it was part of that batch (added-during-window scenario)
  const up2 = path.join(root, 'upstream2')
  const sk2 = path.join(up2, 'skills', 'beta')
  fs.mkdirSync(sk2, { recursive: true })
  fs.writeFileSync(path.join(sk2, 'SKILL.md'), '---\nname: beta\ndescription: v1\n---\nbeta-v1')
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: up2 })
  execFileSync('git', ['-C', up2, 'add', '-A'])
  execFileSync('git', ['-C', up2, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'v1'])
  await seed(root, up2, 'beta')
  const { readState, writeState } = await import('../scripts/lib/state.mjs')
  const s = readState(root)
  s.batches.at(-1).plugins.beta = { pre_version: null, pre_upstream_sha: null }
  writeState(root, s)

  const { runRollback } = await import('../scripts/cmd/rollback.mjs')
  const res = runRollback({ repoRoot: root, batch: 'last', dryRun: false })
  assert.ok(res.ok !== false, `batch rollback failed: ${res.error}`)
  assert.equal(res.skipped.length, 1, 'beta skipped')
  assert.equal(res.skipped[0].name, 'beta')
  assert.equal(v1Body().includes('body-v1'), true, 'demo restored to pre')
  const betaBody = fs.readFileSync(path.join(dest('beta'), 'beta', 'SKILL.md'), 'utf8')
  assert.ok(betaBody.includes('beta-v1'), 'beta folder untouched by rollback')
})

test('dry-run mutates nothing', async () => {
  const { root, up } = fixture()
  await seed(root, up, 'demo')
  bumpUpstream(up, 'body-v2')
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  await runUpdate({ repoRoot: root, name: 'demo', dryRun: false })

  const stateBefore = fs.readFileSync(path.join(root, 'state.json'), 'utf8')
  const logBefore = execFileSync('git', ['-C', root, 'log', '--oneline'], { encoding: 'utf8' })
  const bodyBefore = v1Body()

  const { runRollback } = await import('../scripts/cmd/rollback.mjs')
  const res = runRollback({ repoRoot: root, name: 'demo', dryRun: true })
  assert.ok(res.ok !== false, `dry-run failed: ${res.error}`)
  assert.equal(res.dryRun, true)
  assert.match(res.to, /^[0-9a-f]{40}$/)

  assert.equal(fs.readFileSync(path.join(root, 'state.json'), 'utf8'), stateBefore)
  assert.equal(execFileSync('git', ['-C', root, 'log', '--oneline'], { encoding: 'utf8' }), logBefore)
  assert.equal(v1Body(), bodyBefore)
})

test('single-commit plugin errors with clear message', async () => {
  const { root, up } = fixture()
  await seed(root, up, 'demo')
  // exactly one commit for the plugin folder — no previous version

  const { runRollback } = await import('../scripts/cmd/rollback.mjs')
  const res = runRollback({ repoRoot: root, name: 'demo', dryRun: false })
  assert.equal(res.ok, false)
  assert.match(res.error, /no previous version/)
})

test('rollback twice returns to oldest', async () => {
  const { root, up } = fixture()
  await seed(root, up, 'demo')
  bumpUpstream(up, 'body-v2')
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  await runUpdate({ repoRoot: root, name: 'demo', dryRun: false })
  bumpUpstream(up, 'body-v3')
  await runUpdate({ repoRoot: root, name: 'demo', dryRun: false })
  assert.ok(v1Body().includes('body-v3'), 'sanity: v3 present')

  const { runRollback } = await import('../scripts/cmd/rollback.mjs')
  let res = runRollback({ repoRoot: root, name: 'demo', dryRun: false })
  assert.ok(res.ok !== false, `first rollback failed: ${res.error}`)
  assert.ok(v1Body().includes('body-v2'), 'back to v2')

  res = runRollback({ repoRoot: root, name: 'demo', dryRun: false })
  assert.ok(res.ok !== false, `second rollback failed: ${res.error}`)
  assert.ok(v1Body().includes('body-v1'), 'back to v1 (oldest)')
})

test('exactly one selector required', async () => {
  const { root } = fixture()
  const { runRollback } = await import('../scripts/cmd/rollback.mjs')
  assert.equal(runRollback({ repoRoot: root, name: 'demo', batch: 'last', dryRun: true }).ok, false)
  assert.equal(runRollback({ repoRoot: root, dryRun: true }).ok, false)
  assert.equal(runRollback({ repoRoot: root, name: 'demo', to: 'x'.repeat(40), batch: null, dryRun: true }).ok, false)
})
