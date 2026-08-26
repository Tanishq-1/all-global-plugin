// tests/manifest.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { validateManifest, loadManifest } from '../scripts/lib/manifest.mjs'

const valid = {
  version: 2,
  plugin_dir: 'universal-plugin',
  targets: {},
  plugins: [
    { name: 'superpowers', category: '_universal', tier: 'oss',
      url: 'https://github.com/obra/superpowers', pin: null, wrapper: false,
      skill_entry: null, plugin_keys: ['superpowers@superpowers-dev'],
      marketplace_key: 'superpowers-dev', platforms: ['*'] },
  ],
}

test('validateManifest accepts a well-formed manifest', () => {
  assert.deepEqual(validateManifest(valid), [])
})

test('validateManifest rejects wrong version, bad tier, missing name, duplicate names', () => {
  const bad = structuredClone(valid)
  bad.version = 1
  bad.plugins[0].tier = 'nope'
  bad.plugins[0].name = ''
  bad.plugins.push({ ...structuredClone(valid.plugins[0]), name: 'superpowers' })
  bad.plugins.push({ ...structuredClone(valid.plugins[0]), name: 'superpowers' })
  const errs = validateManifest(bad)
  assert.ok(errs.some(e => e.includes('version must be 2')))
  assert.ok(errs.some(e => e.includes('tier')))
  assert.ok(errs.some(e => e.includes('.name missing')))
  assert.ok(errs.some(e => e.includes('duplicate plugin names')))
})

test('loadManifest throws on invalid manifest, parses valid file from disk', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-manifest-'))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify(valid))
  assert.deepEqual(loadManifest(root).plugins.length, 1)
  fs.writeFileSync(path.join(root, 'plugins.json'), '{"version":3}')
  assert.throws(() => loadManifest(root), /invalid manifest/)
})
