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
