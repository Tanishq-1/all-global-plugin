// tests/layout-skillentry.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

test('collectExistingSkillNames discovers skills under a nested skill_entry layout', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-se-'))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'prompts-chat', category: '_universal', tier: 'oss',
                url: 'https://x', pin: null, wrapper: false,
                skill_entry: 'plugins/claude/prompts.chat',
                plugin_keys: [], marketplace_key: null, platforms: ['*'] }],
  }))
  const nested = path.join(root, 'universal-plugin', '_universal', 'oss', 'prompts-chat',
                           'plugins', 'claude', 'prompts.chat', 'skills', 'lookup')
  fs.mkdirSync(nested, { recursive: true })
  fs.writeFileSync(path.join(nested, 'SKILL.md'), '---\nname: prompt-lookup\ndescription: d\n---\n')
  const { collectExistingSkillNames } = await import('../scripts/lib/layout.mjs')
  const names = collectExistingSkillNames(root)
  assert.deepEqual([...names], ['prompt-lookup'])
})
