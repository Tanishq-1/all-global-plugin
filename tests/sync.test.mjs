// tests/sync.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runSync } from '../scripts/cmd/sync.mjs'

function seed() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-sync-'))
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', 'plug-a')
  fs.mkdirSync(path.join(dest, 'skills', 'alpha'), { recursive: true })
  fs.writeFileSync(path.join(dest, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: d\n---\n')
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [
      { name: 'plug-a', category: '_universal', tier: 'oss', url: 'https://x/a' },
      { name: 'ecc', category: '_universal', tier: 'oss', url: 'https://x/ecc',
        enabled_by_default: false },
    ],
  }))
  return root
}

function home() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-home-'))
  const claude = path.join(h, '.claude')
  fs.mkdirSync(claude, { recursive: true })
  fs.writeFileSync(path.join(claude, 'settings.json'), '{"model":"opus"}')
  const oc = path.join(h, '.config', 'opencode')
  fs.mkdirSync(oc, { recursive: true })
  fs.writeFileSync(path.join(oc, 'opencode.jsonc'), '{\n  "theme": "dark"\n}\n')
  return h
}

test('runSync orchestrates adapters; ECC excluded via enabled_by_default', async () => {
  const root = seed()
  const h = home()
  const res = await runSync({ repoRoot: root, home: h, dryRun: false })
  assert.ok(res.bridge.created.includes('alpha'))
  assert.deepEqual(res.claude.added, ['plug-a'])
  assert.deepEqual(res.opencode.added, ['plug-a'])
  assert.ok(res.gemini.created.includes('alpha@legacy'))
  assert.deepEqual(res.qwen.created, ['alpha'])
  // bridge honors injected home, not the real profile
  assert.equal(fs.existsSync(path.join(h, '.agents', 'skills', 'alpha', 'SKILL.md')), true)
  // ECC never lands anywhere
  const settings = JSON.parse(fs.readFileSync(path.join(h, '.claude', 'settings.json'), 'utf8'))
  assert.equal(settings.extraKnownMarketplaces['ecc'], undefined)
})

test('runSync selector --tool claude only touches claude', async () => {
  const root = seed()
  const h = home()
  const res = await runSync({ repoRoot: root, home: h, tool: 'claude', dryRun: false })
  assert.equal(res.bridge, undefined)
  assert.equal(fs.existsSync(path.join(h, '.agents')), false)
  assert.deepEqual(res.claude.added, ['plug-a'])
})

test('dry-run mutates nothing', async () => {
  const root = seed()
  const h = home()
  await runSync({ repoRoot: root, home: h, dryRun: true })
  assert.equal(fs.existsSync(path.join(h, '.agents')), false)
  const settings = JSON.parse(fs.readFileSync(path.join(h, '.claude', 'settings.json'), 'utf8'))
  assert.equal(settings.extraKnownMarketplaces, undefined)
  const oc = fs.readFileSync(path.join(h, '.config', 'opencode', 'opencode.jsonc'), 'utf8')
  assert.equal(oc.includes('agp:skills-start'), false)
})
