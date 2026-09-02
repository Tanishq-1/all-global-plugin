// tests/workflows.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const wf = (f) => fs.readFileSync(path.join(ROOT, '.github', 'workflows', f), 'utf8')

test('ci.yml: tests + verify on push and PR', () => {
  const y = wf('ci.yml')
  assert.match(y, /push:/)
  assert.match(y, /pull_request:/)
  assert.match(y, /node-version: '?21'?/)
  assert.match(y, /npm test/)
  assert.match(y, /node bin\/agp\.mjs verify/)
})

test('maintain.yml: weekly cron full loop, append-only push', () => {
  const y = wf('maintain.yml')
  assert.match(y, /cron:/)
  for (const s of [
    'git config user.name',
    'git config user.email',
    'node bin/agp.mjs doctor',
    'node bin/agp.mjs update --all',
    'node bin/agp.mjs sync --all',
    'node bin/agp.mjs status',
    'git push origin HEAD --follow-tags',
  ]) assert.ok(y.includes(s), `maintain.yml missing: ${s}`)
  assert.ok(!y.includes('--force'), 'no force-push anywhere')
  assert.ok(!/uses: (?!actions\/)/.test(y), 'only first-party actions allowed')
  assert.ok(y.includes('# undo: node bin/agp.mjs rollback --batch last'),
    'rollback undo path documented in file')
})
