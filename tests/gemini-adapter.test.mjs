// tests/gemini-adapter.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { syncGemini } from '../scripts/lib/adapters/gemini.mjs'

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-gem-'))
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

test('creates junctions in both gemini paths; idempotent', () => {
  const root = repo()
  const home = path.join(root, 'home')
  const res = syncGemini({ repoRoot: root, plugins: PLUGINS, home, local, dryRun: false })
  assert.deepEqual(res.created, ['alpha@antigravity', 'alpha@legacy'])
  assert.equal(fs.existsSync(path.join(home, '.gemini', 'skills', 'alpha', 'SKILL.md')), true)
  assert.equal(fs.existsSync(path.join(home, '.gemini', 'antigravity-cli', 'skills', 'alpha', 'SKILL.md')), true)
  const res2 = syncGemini({ repoRoot: root, plugins: PLUGINS, home, local, dryRun: false })
  assert.deepEqual(res2.created, [])
})

test('removes orphan own-junctions from both paths', () => {
  const root = repo()
  const home = path.join(root, 'home')
  syncGemini({ repoRoot: root, plugins: PLUGINS, home, local, dryRun: false })
  const res = syncGemini({ repoRoot: root, plugins: [], home, local, dryRun: false })
  assert.deepEqual(res.removed, ['alpha@antigravity', 'alpha@legacy'])
  assert.equal(fs.existsSync(path.join(home, '.gemini', 'skills', 'alpha')), false)
  assert.equal(fs.existsSync(path.join(home, '.gemini', 'antigravity-cli', 'skills', 'alpha')), false)
})

test('dry-run reports without writing', () => {
  const root = repo()
  const home = path.join(root, 'home')
  const res = syncGemini({ repoRoot: root, plugins: PLUGINS, home, local, dryRun: true })
  assert.deepEqual(res.created, ['alpha@antigravity', 'alpha@legacy'])
  assert.equal(fs.existsSync(path.join(home, '.gemini')), false)
})
