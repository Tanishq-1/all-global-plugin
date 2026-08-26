// tests/state-layout.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readState, writeState, recordUpdate } from '../scripts/lib/state.mjs'
import { pluginDest, collectExistingSkillNames } from '../scripts/lib/layout.mjs'

test('state roundtrip and recordUpdate merge', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-state-'))
  assert.deepEqual(readState(root), { plugins: {} })
  recordUpdate(root, 'x', { version: '1.0', upstream_commit_sha: 'abc' })
  recordUpdate(root, 'x', { last_updated: 'now' })
  assert.deepEqual(readState(root).plugins.x,
    { version: '1.0', upstream_commit_sha: 'abc', last_updated: 'now' })
})

test('pluginDest follows category/tier/name layout', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-layout-'))
  const dest = pluginDest(root, { category: 'mobile', tier: 'oss', name: 'expo-skills' })
  assert.ok(dest.includes(path.join('universal-plugin', 'mobile', 'oss', 'expo-skills')))
})

test('collectExistingSkillNames scans installed plugin folders', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-names-'))
  const sd = path.join(root, 'universal-plugin', '_universal', 'oss', 'sp', 'skills', 'brainstorming')
  fs.mkdirSync(sd, { recursive: true })
  fs.writeFileSync(path.join(sd, 'SKILL.md'), '---\nname: brainstorming\ndescription: d\n---\n')
  assert.deepEqual([...collectExistingSkillNames(root)], ['brainstorming'])
})
