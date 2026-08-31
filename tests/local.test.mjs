// tests/local.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readLocal, writeLocal, isEnabled, activeState, setEnabled, activePlugins }
  from '../scripts/lib/local.mjs'

const entry = (over = {}) => ({ name: 'x', category: '_universal', tier: 'oss',
                                url: 'https://x/y', ...over })

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'agp-local-')) }

test('missing local.json yields defaults; plain entry is active', () => {
  const root = tmp()
  assert.deepEqual(readLocal(root), { paths: {}, plugins: {} })
  assert.equal(isEnabled(entry(), readLocal(root)), true)
  assert.equal(activeState(entry(), readLocal(root)), 'active')
})

test('local.plugins.x.enabled=false marks off (you)', () => {
  const root = tmp()
  writeLocal(root, { paths: {}, plugins: { x: { enabled: false } } })
  const local = readLocal(root)
  assert.equal(isEnabled(entry(), local), false)
  assert.equal(activeState(entry(), local), 'off (you)')
})

test('manifest enabled_by_default=false marks off (default)', () => {
  const root = tmp()
  const local = readLocal(root)
  assert.equal(isEnabled(entry({ enabled_by_default: false }), local), false)
  assert.equal(activeState(entry({ enabled_by_default: false }), local), 'off (default)')
})

test('local enabled=true beats manifest enabled_by_default=false', () => {
  const root = tmp()
  writeLocal(root, { paths: {}, plugins: { x: { enabled: true } } })
  const local = readLocal(root)
  assert.equal(isEnabled(entry({ enabled_by_default: false }), local), true)
  assert.equal(activeState(entry({ enabled_by_default: false }), local), 'active')
})

test('setEnabled upserts and preserves unknown keys; activePlugins filters', () => {
  const root = tmp()
  writeLocal(root, { paths: { bridge: '~/custom' }, plugins: {}, future: { keep: 1 } })
  setEnabled(root, 'x', false)
  const local = readLocal(root)
  assert.equal(local.plugins.x.enabled, false)
  assert.equal(local.paths.bridge, '~/custom')
  assert.deepEqual(local.future, { keep: 1 })
  const m = { plugins: [entry(), entry({ name: 'y' })] }
  assert.deepEqual(activePlugins(m, local).map(p => p.name), ['y'])
})
