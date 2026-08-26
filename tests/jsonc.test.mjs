import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseJsonc, stripComments } from '../scripts/lib/jsonc.mjs'

test('parses jsonc with line comments and urls intact', () => {
  const src = `{
    // tool config
    "$schema": "https://example.com/x.json", // trailing comment
    "nested": { "deep": true }
  }`
  const o = parseJsonc(src)
  assert.equal(o.$schema, 'https://example.com/x.json')
  assert.equal(o.nested.deep, true)
})

test('block comments stripped, escaped quotes preserved', () => {
  assert.deepEqual(parseJsonc('{ /* c */ "a": "http://x // y" }'), { a: 'http://x // y' })
})
