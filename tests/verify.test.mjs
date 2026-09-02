// tests/verify.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { runVerify } from '../scripts/cmd/verify.mjs'

function seedPlugin(root, name, category, skillName) {
  const dest = path.join(root, 'universal-plugin', category, 'oss', name)
  fs.mkdirSync(path.join(dest, 'skills', skillName), { recursive: true })
  fs.writeFileSync(path.join(dest, 'skills', skillName, 'SKILL.md'),
    `---\nname: ${skillName}\ndescription: d\n---\nbody`)
  return dest
}

function repo({ plugins = ['demo'], local = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-vfy-'))
  fs.mkdirSync(path.join(root, 'universal-plugin'), { recursive: true })
  const entries = plugins.map(([name, skill]) => {
    const cat = name === 'demo' ? '_universal' : 'fullstack'
    seedPlugin(root, name, cat, skill)
    return { name, category: cat, tier: 'oss', url: `https://x/${name}` }
  })
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {}, plugins: entries,
  }))
  if (local) fs.writeFileSync(path.join(root, 'local.json'), JSON.stringify(local))
  return root
}

test('clean repo: ok with skillCount', () => {
  const root = repo({ plugins: [['demo', 'demo-skill']] })
  const res = runVerify({ repoRoot: root })
  assert.equal(res.ok, true)
  assert.deepEqual(res.problems, [])
  assert.equal(res.skillCount, 1)
})

test('duplicate skill names across active plugins: not ok', () => {
  const root = repo({ plugins: [['demo', 'dup-skill'], ['other', 'dup-skill']] })
  const res = runVerify({ repoRoot: root })
  assert.equal(res.ok, false)
  assert.ok(res.problems.some(p => /duplicate skill name 'dup-skill' in other and demo/.test(p)))
})

test('disabled plugin with colliding skill is exempt (active-set rule)', () => {
  const root = repo({ plugins: [['demo', 'dup-skill'], ['other', 'dup-skill']],
                       local: { plugins: { other: { enabled: false } } } })
  const res = runVerify({ repoRoot: root })
  assert.equal(res.ok, true)
})

test('orphan folder is a problem', () => {
  const root = repo({ plugins: [['demo', 'demo-skill']] })
  fs.mkdirSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'orphan'), { recursive: true })
  const res = runVerify({ repoRoot: root })
  assert.equal(res.ok, false)
  assert.ok(res.problems.some(p => p.includes('orphan folder') && p.includes('orphan')))
})

test('broken structure in active plugin is a problem', () => {
  const root = repo({ plugins: [['demo', 'demo-skill']] })
  fs.rmSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'demo', 'skills'), { recursive: true })
  const res = runVerify({ repoRoot: root })
  assert.equal(res.ok, false)
  assert.ok(res.problems.some(p => p.includes('structure problem in demo')))
})

test('invalid manifest throws', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-vfy-'))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({ version: 1, plugins: [] }))
  assert.throws(() => runVerify({ repoRoot: root }), /invalid manifest/)
})

test('CLI: verify exits 0 on clean, 1 on dirty', () => {
  const clean = repo({ plugins: [['demo', 'demo-skill']] })
  const dirty = repo({ plugins: [['demo', 'dup-skill'], ['other', 'dup-skill']] })
  const bin = path.resolve('bin', 'agp.mjs')
  const ok = execFileSync('node', [bin, 'verify'], { cwd: clean, encoding: 'utf8' })
  assert.match(ok, /"ok": ?true/)
  let dirtyOut = ''
  let dirtyCode = 0
  try {
    execFileSync('node', [bin, 'verify'], { cwd: dirty, encoding: 'utf8' })
  } catch (e) {
    dirtyCode = e.status
    dirtyOut = e.stdout
  }
  assert.equal(dirtyCode, 1)
  assert.match(dirtyOut, /"ok": ?false/)
})
