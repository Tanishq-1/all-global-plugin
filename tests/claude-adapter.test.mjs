// tests/claude-adapter.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { syncClaude } from '../scripts/lib/adapters/claude.mjs'

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-claude-'))
  fs.mkdirSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a'), { recursive: true })
  fs.mkdirSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a', '.claude-plugin'), { recursive: true })
  fs.writeFileSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a', '.claude-plugin', 'marketplace.json'),
    '{"name":"plug-a"}')
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'plug-a', category: '_universal', tier: 'oss', url: 'https://x/a',
                marketplace_key: 'plug-a', plugin_key: 'x@plug-a',
                plugin_keys: ['y@plug-a'] }],
  }))
  return root
}

const PLUGINS = [{ name: 'plug-a', category: '_universal', tier: 'oss',
                   marketplace_key: 'plug-a', plugin_key: 'x@plug-a', plugin_keys: ['y@plug-a'] }]

function homeWith(root, settings) {
  const home = path.join(root, 'home')
  const claudeDir = path.join(home, '.claude')
  fs.mkdirSync(claudeDir, { recursive: true })
  fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify(settings))
  return home
}

test('no-op when settings.json missing (adoption gate)', () => {
  const root = repo()
  const home = path.join(root, 'home-empty')
  const res = syncClaude({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  assert.equal(res.skipped, true)
  assert.equal(fs.existsSync(path.join(home, '.claude', 'settings.json')), false)
})

test('merge adds marketplace + enabledPlugins entries, backup written', () => {
  const root = repo()
  const home = homeWith(root, { model: 'opus' })
  const res = syncClaude({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  assert.equal(res.skipped, false)
  assert.deepEqual(res.added, ['plug-a'])
  const after = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'))
  assert.equal(after.model, 'opus')
  const mp = after.extraKnownMarketplaces['plug-a']
  assert.ok(mp.path.includes('plug-a'))
  assert.equal(mp.source, 'agp')
  assert.equal(after.enabledPlugins['x@plug-a'], true)
  assert.equal(after.enabledPlugins['y@plug-a'], true)
  const baks = fs.readdirSync(path.join(home, '.claude')).filter(f => f.startsWith('settings.json.bak-'))
  assert.equal(baks.length, 1)
})

test('stale agp entries removed, user entries preserved', () => {
  const root = repo()
  const staleMp = path.join(root, 'universal-plugin', '_universal', 'oss', 'gone').replace(/\\/g, '/')
  const home = homeWith(root, {
    extraKnownMarketplaces: {
      'plug-a': { path: staleMp, source: 'agp' },
      'user-key': { path: 'C:/elsewhere/user-mp' },
    },
    enabledPlugins: { 'old@gone': true, 'x@plug-a': false, 'user@user-key': true },
  })
  const res = syncClaude({ repoRoot: root, plugins: PLUGINS, home, dryRun: false })
  const after = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'))
  assert.equal(after.extraKnownMarketplaces['plug-a'].path.includes('plug-a'), true)
  assert.equal(after.extraKnownMarketplaces['user-key'].path, 'C:/elsewhere/user-mp')
  assert.equal(after.enabledPlugins['old@gone'], undefined)
  assert.equal(after.enabledPlugins['x@plug-a'], true)
  assert.equal(after.enabledPlugins['user@user-key'], true)
  assert.deepEqual(res.removed, ['old@gone'])
})

test('dry-run reports diff without writing', () => {
  const root = repo()
  const home = homeWith(root, { model: 'opus' })
  const res = syncClaude({ repoRoot: root, plugins: PLUGINS, home, dryRun: true })
  assert.deepEqual(res.added, ['plug-a'])
  const after = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'))
  assert.equal(after.extraKnownMarketplaces, undefined)
})
