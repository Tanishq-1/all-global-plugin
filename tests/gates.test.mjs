// tests/gates.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { structureGate, uniquenessGate, safetyInventory, runGates } from '../scripts/lib/gates.mjs'
import { quarantine } from '../scripts/lib/quarantine.mjs'

function makePlugin(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-gate-'))
  const skillDir = path.join(dir, 'skills', 'sample')
  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'),
    `---\nname: ${opts.skillName ?? 'sample'}\ndescription: sample desc\n---\nbody`)
  if (opts.marketplace) {
    fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true })
    fs.writeFileSync(path.join(dir, '.claude-plugin', 'marketplace.json'),
      opts.marketplace === 'broken' ? '{oops' : '{"name":"x"}')
  }
  if (opts.hooks) {
    fs.mkdirSync(path.join(dir, 'hooks'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'hooks', 'h.sh'), 'echo hi')
  }
  return dir
}

test('structureGate: valid skill passes; broken marketplace fails', () => {
  assert.equal(structureGate(makePlugin()).ok, true)
  const bad = structureGate(makePlugin({ marketplace: 'broken', skillName: '' }))
  assert.equal(bad.ok, false)
})

test('uniquenessGate detects collisions', () => {
  const u = uniquenessGate(makePlugin(), new Set(['sample']))
  assert.equal(u.ok, false)
  assert.match(u.reason, /duplicate skill names: sample/)
})

test('safetyInventory reports hooks and .mcp.json', () => {
  const dir = makePlugin({ hooks: true })
  fs.writeFileSync(path.join(dir, '.mcp.json'), '{}')
  const inv = safetyInventory(dir)
  assert.ok(inv.some(f => f.startsWith('hooks')))
  assert.ok(inv.includes('.mcp.json'))
})

test('runGates aggregates failures and counts skills', () => {
  const r = runGates({ stagedDir: makePlugin(), existingNames: new Set() })
  assert.equal(r.ok, true)
  assert.equal(r.skillCount, 1)
})

test('quarantine moves clone and logs QUARANTINE.md row', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-q-'))
  fs.mkdirSync(path.join(repo, 'universal-plugin', '_quarantine'), { recursive: true })
  const staged = makePlugin()
  quarantine(repo, 'badplug', staged, [{ gate: 'structure', reason: 'no valid skill' }])
  assert.equal(fs.existsSync(staged), false)
  const qdir = path.join(repo, 'universal-plugin', '_quarantine')
  const moved = fs.readdirSync(qdir).find(d => d.startsWith('badplug-'))
  assert.ok(moved)
  const log = fs.readFileSync(path.join(repo, 'QUARANTINE.md'), 'utf8')
  assert.match(log, /badplug.*structure.*no valid skill/)
})
