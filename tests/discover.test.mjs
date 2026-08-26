import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs'
import { discoverSkills } from '../scripts/lib/discover.mjs'

test('parseFrontmatter extracts name + folded multiline description', () => {
  const md = `---
name: my-skill
description: Does X. Use when
  the user asks for X handling.
license: MIT
---
body`
  const fm = parseFrontmatter(md)
  assert.equal(fm.name, 'my-skill')
  assert.equal(fm.description, 'Does X. Use when the user asks for X handling.')
})

test('parseFrontmatter folds continuations after an empty inline value', () => {
  const fm = parseFrontmatter('---\nname: x\ndescription:\n  folded text here\n---\nbody')
  assert.equal(fm.name, 'x')
  assert.equal(fm.description, 'folded text here')
})

test('parseFrontmatter returns null without frontmatter', () => {
  assert.equal(parseFrontmatter('just text'), null)
})

test('discoverSkills finds skills, skips .git and node_modules', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-disc-'))
  for (const d of ['skills/a', 'skills/b', 'node_modules/x', '.git/y']) {
    fs.mkdirSync(path.join(root, d), { recursive: true })
  }
  const sm = (name) => `---\nname: ${name}\ndescription: ${name} desc\n---\nbody`
  fs.writeFileSync(path.join(root, 'skills/a/SKILL.md'), sm('alpha'))
  fs.writeFileSync(path.join(root, 'skills/b/SKILL.md'), sm('beta'))
  fs.writeFileSync(path.join(root, 'node_modules/x/SKILL.md'), sm('junk'))
  fs.writeFileSync(path.join(root, '.git/y/SKILL.md'), sm('junk'))
  const got = discoverSkills(root)
  assert.deepEqual(got.map(s => s.name).sort(), ['alpha', 'beta'])
})
