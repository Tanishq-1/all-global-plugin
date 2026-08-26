// tests/paths.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { expandHome, targetPath } from '../scripts/lib/paths.mjs'

test('expandHome resolves ~/ against homedir', () => {
  assert.equal(
    expandHome('~/.claude/settings.json').endsWith(path.join('.claude', 'settings.json')),
    true,
  )
  assert.equal(expandHome('/abs/x'), '/abs/x')
})

test('targetPath default bridge is ~/.agents/skills', () => {
  const got = targetPath('bridge', {})
  assert.ok(got.endsWith(path.join('.agents', 'skills')))
})

test('CLAUDE_CONFIG_DIR overrides claude settings location', () => {
  const prev = process.env.CLAUDE_CONFIG_DIR
  process.env.CLAUDE_CONFIG_DIR = '/custom/claude'
  try {
    assert.equal(
      path.resolve(targetPath('claude', {})),
      path.resolve('/custom/claude/settings.json'),
    )
  } finally {
    if (prev === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = prev
  }
})

test('local overrides win over manifest targets', () => {
  const got = targetPath('opencode', { opencode: { config_path: '~/.other/oc.jsonc' } },
                                   { opencode: '~/.mine/oc.jsonc' })
  assert.ok(got.endsWith('oc.jsonc') && got.includes('.mine'))
})
