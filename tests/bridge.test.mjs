// tests/bridge.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ensureJunction, removeJunctionIfOwn } from '../scripts/lib/adapters/junctions.mjs'
import { bridgeRoot, syncBridge } from '../scripts/lib/adapters/bridge.mjs'

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-bridge-'))
  return root
}

function seedPlugin(root, name, skills = ['alpha']) {
  const dest = path.join(root, 'universal-plugin', '_universal', 'oss', name)
  for (const s of skills) {
    const d = path.join(dest, 'skills', s)
    fs.mkdirSync(d, { recursive: true })
    fs.writeFileSync(path.join(d, 'SKILL.md'), `---\nname: ${s}\ndescription: d\n---\n`)
  }
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name, category: '_universal', tier: 'oss', url: 'https://x/' + name }],
  }))
  return dest
}

test('ensureJunction creates then reports exists idempotently', () => {
  const root = repo()
  const target = path.join(root, 'target-dir')
  fs.mkdirSync(target)
  const link = path.join(root, 'link-dir')
  assert.equal(ensureJunction(target, link), 'created')
  assert.equal(ensureJunction(target, link), 'exists')
  assert.equal(fs.realpathSync(link), fs.realpathSync(target))
})

test('removeJunctionIfOwn removes own junction, refuses plain dir', () => {
  const root = repo()
  const target = path.join(root, 't')
  fs.mkdirSync(target)
  const link = path.join(root, 'own-link')
  ensureJunction(target, link)
  assert.equal(removeJunctionIfOwn(link, root), 'removed')
  assert.equal(fs.existsSync(link), false)

  const plain = path.join(root, 'plain')
  fs.mkdirSync(plain)
  fs.writeFileSync(path.join(plain, 'f.txt'), 'x')
  assert.equal(removeJunctionIfOwn(plain, root), 'skipped')
  assert.equal(fs.existsSync(path.join(plain, 'f.txt')), true)
})

test('syncBridge creates one junction per skill into bridge root', () => {
  const root = repo()
  seedPlugin(root, 'plug-a', ['alpha', 'beta'])
  const local = { paths: {}, plugins: {} }
  const br = path.join(root, 'home', '.agents', 'skills')
  const res = syncBridge({ repoRoot: root, plugins: [{ name: 'plug-a', category: '_universal', tier: 'oss' }],
                           local, bridgeRootPath: br, dryRun: false })
  assert.deepEqual([...res.created].sort(), ['alpha', 'beta'])
  assert.equal(fs.existsSync(path.join(br, 'alpha', 'SKILL.md')), true)
  assert.equal(bridgeRoot(root, local, br), br)
})

test('syncBridge removes orphan own-junctions on next sync', () => {
  const root = repo()
  seedPlugin(root, 'plug-a', ['alpha'])
  const local = { paths: {}, plugins: {} }
  const br = path.join(root, 'home', '.agents', 'skills')
  syncBridge({ repoRoot: root, plugins: [{ name: 'plug-a', category: '_universal', tier: 'oss' }],
               local, bridgeRootPath: br, dryRun: false })
  const res = syncBridge({ repoRoot: root, plugins: [], local, bridgeRootPath: br, dryRun: false })
  assert.deepEqual(res.removed, ['alpha'])
  assert.equal(fs.existsSync(path.join(br, 'alpha')), false)
})

test('dry-run reports planned creates without writing', () => {
  const root = repo()
  seedPlugin(root, 'plug-a', ['alpha'])
  const local = { paths: {}, plugins: {} }
  const br = path.join(root, 'home', '.agents', 'skills')
  const res = syncBridge({ repoRoot: root, plugins: [{ name: 'plug-a', category: '_universal', tier: 'oss' }],
                           local, bridgeRootPath: br, dryRun: true })
  assert.deepEqual(res.created, ['alpha'])
  assert.equal(fs.existsSync(br), false)
})

test('bridgeRoot honors local.json paths override', () => {
  const root = repo()
  const br = bridgeRoot(root, { paths: { bridge: path.join(root, 'custom-bridge') } })
  assert.equal(br, path.join(root, 'custom-bridge'))
})
