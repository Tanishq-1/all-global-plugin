// tests/atomic.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { stageDir, stripGit, swapIn } from '../scripts/lib/atomic.mjs'

test('swapIn replaces destination and removes retired copy', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-swap-'))
  const dest = path.join(parent, 'plug')
  fs.mkdirSync(dest); fs.writeFileSync(path.join(dest, 'old.txt'), 'old')
  const staged = stageDir(parent)
  fs.writeFileSync(path.join(staged, 'new.txt'), 'new')
  swapIn(staged, dest, () => {})
  assert.equal(fs.readFileSync(path.join(dest, 'new.txt'), 'utf8'), 'new')
  assert.equal(fs.existsSync(path.join(dest, 'old.txt')), false)
  assert.equal(fs.readdirSync(parent).filter(f => f.includes('.old-')).length, 0)
})

test('swapIn restores original when validation fails', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-swap-'))
  const dest = path.join(parent, 'plug')
  fs.mkdirSync(dest); fs.writeFileSync(path.join(dest, 'old.txt'), 'old')
  const staged = stageDir(parent)
  assert.throws(() => swapIn(staged, dest, () => { throw new Error('bad clone') }), /bad clone/)
  assert.equal(fs.readFileSync(path.join(dest, 'old.txt'), 'utf8'), 'old')
  assert.equal(fs.existsSync(staged), false)
})

test('stripGit removes nested .git', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-swap-'))
  fs.mkdirSync(path.join(parent, 'x', '.git'), { recursive: true })
  stripGit(path.join(parent, 'x'))
  assert.equal(fs.existsSync(path.join(parent, 'x', '.git')), false)
})
