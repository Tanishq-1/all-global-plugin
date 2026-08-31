// tests/verbs.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

function fixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-verbs-'))
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root })
  const up = path.join(root, 'upstream')
  const sk = path.join(up, 'skills', 'one')
  fs.mkdirSync(sk, { recursive: true })
  fs.writeFileSync(path.join(sk, 'SKILL.md'), '---\nname: one\ndescription: one\n---\n')
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: up })
  execFileSync('git', ['-C', up, 'add', '-A'])
  execFileSync('git', ['-C', up, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'v1'])
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify(
    { version: 2, plugin_dir: 'universal-plugin', targets: {}, plugins: [] }))
  fs.mkdirSync(path.join(root, 'universal-plugin'), { recursive: true })
  process.chdir(root)
  return root
}

test('add installs through update and persists manifest entry', async () => {
  const root = fixtureRepo()
  const { runAdd } = await import('../scripts/cmd/manage.mjs')
  const res = await runAdd({ repoRoot: root, name: 'one', url: path.join(root, 'upstream').replace(/\\/g, '/'),
                             category: '_universal', tier: 'oss', dryRun: false })
  assert.equal(res.ok, true, res.error)
  const m = JSON.parse(fs.readFileSync(path.join(root, 'plugins.json'), 'utf8'))
  assert.equal(m.plugins.length, 1)
  assert.equal(fs.existsSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'one')), true)
})

test('add rolls manifest back when install fails', async () => {
  const root = fixtureRepo()
  const { runAdd } = await import('../scripts/cmd/manage.mjs')
  const res = await runAdd({ repoRoot: root, name: 'two', url: 'https://invalid.invalid/x.git',
                             category: '_universal', tier: 'oss', dryRun: false })
  assert.equal(res.ok, false)
  const m = JSON.parse(fs.readFileSync(path.join(root, 'plugins.json'), 'utf8'))
  assert.equal(m.plugins.length, 0)
})

test('add dry-run reports ok + dryRun markers and persists nothing', async () => {
  const root = fixtureRepo()
  const { runAdd } = await import('../scripts/cmd/manage.mjs')
  const res = await runAdd({ repoRoot: root, name: 'one', url: path.join(root, 'upstream').replace(/\\/g, '/'),
                             category: '_universal', tier: 'oss', dryRun: true })
  assert.equal(res.ok, true)
  assert.equal(res.dryRun, true)
  const m = JSON.parse(fs.readFileSync(path.join(root, 'plugins.json'), 'utf8'))
  assert.equal(m.plugins.length, 0)
  assert.equal(fs.existsSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'one')), false)
})

test('remove drops manifest entry but keeps folder', async () => {
  const root = fixtureRepo()
  const { runAdd, runRemove } = await import('../scripts/cmd/manage.mjs')
  await runAdd({ repoRoot: root, name: 'one', url: path.join(root, 'upstream').replace(/\\/g, '/'),
                 category: '_universal', tier: 'oss', dryRun: false })
  runRemove({ repoRoot: root, name: 'one', dryRun: false })
  const m = JSON.parse(fs.readFileSync(path.join(root, 'plugins.json'), 'utf8'))
  assert.equal(m.plugins.length, 0)
  assert.equal(fs.existsSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'one')), true)
})

test('add rolls manifest back when install throws unexpectedly', async () => {
  const root = fixtureRepo()
  const manage = await import('../scripts/cmd/manage.mjs')
  const real = manage._runUpdate.call
  manage._runUpdate.call = async () => { throw new Error('disk exploded') }
  try {
    const res = await manage.runAdd({ repoRoot: root, name: 'boom',
                                      url: 'https://invalid.invalid/x.git',
                                      category: '_universal', tier: 'oss', dryRun: false })
    assert.equal(res.ok, false)
    assert.match(res.error, /install failed for boom; manifest rolled back \(disk exploded\)/)
    const m = JSON.parse(fs.readFileSync(path.join(root, 'plugins.json'), 'utf8'))
    assert.equal(m.plugins.length, 0)
  } finally {
    manage._runUpdate.call = real
  }
})

test('doctor flags orphan folders; status lists installed', async () => {
  const root = fixtureRepo()
  fs.mkdirSync(path.join(root, 'universal-plugin', 'frontend', 'official', 'ghost'), { recursive: true })
  const { runDoctor, runStatus } = await import('../scripts/cmd/inspect.mjs')
  const d = runDoctor({ repoRoot: root })
  assert.ok(d.problems.some(p => p.includes('ghost')))
  const rows = runStatus({ repoRoot: root })
  assert.ok(Array.isArray(rows))
})

test('doctor reports sync drift against target configs', async () => {
  const root = fixtureRepo()
  const { runAdd, runRemove } = await import('../scripts/cmd/manage.mjs')
  await runAdd({ repoRoot: root, name: 'one', url: path.join(root, 'upstream').replace(/\\/g, '/'),
                 category: '_universal', tier: 'oss', dryRun: false })
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-doc-'))
  fs.mkdirSync(path.join(h, '.claude'), { recursive: true })
  fs.writeFileSync(path.join(h, '.claude', 'settings.json'), '{}')
  const { runDoctor } = await import('../scripts/cmd/inspect.mjs')
  const d = runDoctor({ repoRoot: root, home: h })
  assert.ok(d.problems.some(p => p.includes('drift') && p.includes('claude')), JSON.stringify(d.problems))
  const { runSync } = await import('../scripts/cmd/sync.mjs')
  await runSync({ repoRoot: root, tool: 'claude', dryRun: false, home: h })
  const d2 = runDoctor({ repoRoot: root, home: h })
  assert.equal(d2.problems.some(p => p.includes('drift')), false, JSON.stringify(d2.problems))
})

test('doctor stays silent when target configs absent (adoption gate)', async () => {
  const root = fixtureRepo()
  const { runAdd } = await import('../scripts/cmd/manage.mjs')
  await runAdd({ repoRoot: root, name: 'one', url: path.join(root, 'upstream').replace(/\\/g, '/'),
                 category: '_universal', tier: 'oss', dryRun: false })
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-doc2-'))
  const { runDoctor } = await import('../scripts/cmd/inspect.mjs')
  const d = runDoctor({ repoRoot: root, home: h })
  assert.equal(d.problems.some(p => p.includes('drift')), false, JSON.stringify(d.problems))
})
