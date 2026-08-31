// tests/qwen-adapter.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { syncQwen } from '../scripts/lib/adapters/qwen.mjs'

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-qwen-'))
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a')
  fs.mkdirSync(path.join(dest, 'skills', 'alpha'), { recursive: true })
  fs.writeFileSync(path.join(dest, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: d\n---\n')
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'plug-a', category: '_universal', tier: 'oss', url: 'https://x/a' }],
  }))
  return root
}

const PLUGINS = [{ name: 'plug-a', category: '_universal', tier: 'oss' }]
const local = { paths: {}, plugins: {} }

test('creates junctions into ~/.qwen/skills; idempotent', () => {
  const root = repo()
  const home = path.join(root, 'home')
  const res = syncQwen({ repoRoot: root, plugins: PLUGINS, home, local, dryRun: false })
  assert.deepEqual(res.created, ['alpha'])
  assert.equal(fs.existsSync(path.join(home, '.qwen', 'skills', 'alpha', 'SKILL.md')), true)
  const res2 = syncQwen({ repoRoot: root, plugins: PLUGINS, home, local, dryRun: false })
  assert.deepEqual(res2.created, [])
})

test('removes orphan own-junctions', () => {
  const root = repo()
  const home = path.join(root, 'home')
  syncQwen({ repoRoot: root, plugins: PLUGINS, home, local, dryRun: false })
  const res = syncQwen({ repoRoot: root, plugins: [], home, local, dryRun: false })
  assert.deepEqual(res.removed, ['alpha'])
  assert.equal(fs.existsSync(path.join(home, '.qwen', 'skills', 'alpha')), false)
})

test('dry-run reports without writing', () => {
  const root = repo()
  const home = path.join(root, 'home')
  const res = syncQwen({ repoRoot: root, plugins: PLUGINS, home, local, dryRun: true })
  assert.deepEqual(res.created, ['alpha'])
  assert.equal(fs.existsSync(path.join(home, '.qwen')), false)
})
