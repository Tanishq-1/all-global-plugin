// tests/index.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { generateIndex } from '../scripts/cmd/index.mjs'

test('generateIndex groups by category and tier', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-index-'))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [
      { name: 'expo-skills', category: 'mobile', tier: 'oss', url: 'https://github.com/expo/skills' },
      { name: 'feature-dev', category: 'fullstack', tier: 'official', url: 'https://x/y' },
    ],
  }))
  const md = generateIndex({ repoRoot: root })
  assert.match(md, /# Plugin Catalog/)
  assert.match(md, /## mobile/)
  assert.match(md, /\| expo-skills \| oss \| https:\/\/github\.com\/expo\/skills \|/)
  assert.match(md, /## fullstack/)
})
