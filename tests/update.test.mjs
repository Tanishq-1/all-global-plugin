// tests/update.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

async function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-up-'))
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root })
  // upstream fixture repo containing one valid skill
  const up = path.join(root, 'upstream')
  const sk = path.join(up, 'skills', 'demo')
  fs.mkdirSync(sk, { recursive: true })
  fs.writeFileSync(path.join(sk, 'SKILL.md'), '---\nname: demo\ndescription: demo desc\n---\nb')
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: up })
  execFileSync('git', ['-C', up, 'add', '-A'])
  execFileSync('git', ['-C', up, '-c', 'user.email=t@t', '-c', 'user.name=t',
                       'commit', '-qm', 'v1'])
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'demo', category: '_universal', tier: 'oss',
                url: up.replace(/\\/g, '/'), pin: null, wrapper: false, skill_entry: null,
                plugin_keys: [], marketplace_key: 'demo', platforms: ['*'] }],
  }))
  fs.mkdirSync(path.join(root, 'universal-plugin', '_universal', 'oss'), { recursive: true })
  process.chdir(root)
  const { runUpdate } = await import('../scripts/cmd/update.mjs')
  return { root, runUpdate }
}

test('runUpdate installs plugin, records state, commits once', async () => {
  const { root, runUpdate } = await setup()
  const res = await runUpdate({ repoRoot: root, name: 'demo', category: null, dryRun: false })
  assert.deepEqual(res.failed, [])
  assert.deepEqual(res.updated, ['demo'])
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'demo')
  assert.equal(fs.existsSync(path.join(dest, 'skills', 'demo', 'SKILL.md')), true)
  assert.equal(fs.existsSync(path.join(dest, '.git')), false)
  const st = JSON.parse(fs.readFileSync(path.join(root, 'state.json'), 'utf8'))
  assert.match(st.plugins.demo.upstream_commit_sha, /^[0-9a-f]{40}$/)
})

test('runUpdate quarantines structurally broken upstream and leaves dest untouched', async () => {
  const { root, runUpdate } = await setup()
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'demo')
  fs.mkdirSync(dest, { recursive: true })
  fs.writeFileSync(path.join(dest, 'sentinel.txt'), 'keep me')
  // break upstream: replace skill with junk (no valid frontmatter, no marketplace)
  const sk = path.join(root, 'upstream', 'skills', 'demo')
  fs.writeFileSync(path.join(sk, 'SKILL.md'), 'no frontmatter here')
  execFileSync('git', ['-C', path.join(root, 'upstream'), 'add', '-A'])
  execFileSync('git', ['-C', path.join(root, 'upstream'), '-c', 'user.email=t@t',
                       '-c', 'user.name=t', 'commit', '-qm', 'break'])
  const res = await runUpdate({ repoRoot: root, name: 'demo', category: null, dryRun: false })
  assert.deepEqual(res.failed, ['demo'])
  assert.equal(fs.readFileSync(path.join(dest, 'sentinel.txt'), 'utf8'), 'keep me')
})

test('dry-run mutates nothing and reports dryRun marker', async () => {
  const { root, runUpdate } = await setup()
  const res = await runUpdate({ repoRoot: root, name: 'demo', category: null, dryRun: true })
  assert.deepEqual(res.skipped, ['demo'])
  assert.equal(res.dryRun, true)
  assert.equal(fs.existsSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'demo')), false)
})
