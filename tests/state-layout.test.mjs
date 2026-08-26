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

test('collectExistingSkillNames ignores quarantine and staging debris', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-debris-'))
  const qd = path.join(root, 'universal-plugin', '_quarantine', 'badplug-123', 'skills', 'x')
  fs.mkdirSync(qd, { recursive: true })
  fs.writeFileSync(path.join(qd, 'SKILL.md'), '---\nname: ghost-skill\ndescription: d\n---\n')
  const stage = path.join(root, 'universal-plugin', '.stage-abc123', 'skills', 'y')
  fs.mkdirSync(stage, { recursive: true })
  fs.writeFileSync(path.join(stage, 'SKILL.md'), '---\nname: staged-ghost\ndescription: d\n---\n')
  const old = path.join(root, 'universal-plugin', '_universal', 'oss', 'sp.old-1700000000000', 'skills', 'z')
  fs.mkdirSync(old, { recursive: true })
  fs.writeFileSync(path.join(old, 'SKILL.md'), '---\nname: old-ghost\ndescription: d\n---\n')
  const live = path.join(root, 'universal-plugin', '_universal', 'oss', 'sp', 'skills', 'live')
  fs.mkdirSync(live, { recursive: true })
  fs.writeFileSync(path.join(live, 'SKILL.md'), '---\nname: live-skill\ndescription: d\n---\n')
  assert.deepEqual([...collectExistingSkillNames(root)], ['live-skill'])
})
