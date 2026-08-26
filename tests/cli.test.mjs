// tests/cli.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const BIN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'agp.mjs')

function runCli(args, cwd) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8' })
}

test('parseArgs throws on value flag missing its value', async () => {
  const { parseArgs } = await import('../bin/agp.mjs')
  assert.throws(() => parseArgs(['--plugin']), /error: missing value for --plugin/)
  assert.throws(() => parseArgs(['--category', '--all']), /error: missing value for --category/)
})

test('parseArgs throws on unknown --option', async () => {
  const { parseArgs } = await import('../bin/agp.mjs')
  assert.throws(() => parseArgs(['--aln']), /error: unknown option --aln/)
})

test('parseArgs valid input unchanged', async () => {
  const { parseArgs } = await import('../bin/agp.mjs')
  assert.deepEqual(parseArgs(['--all', '--dry-run', '--plugin', 'demo', '--category', 'oss']),
                   { _: [], all: true, 'dry-run': true, plugin: 'demo', category: 'oss' })
})

test('cli: missing flag value exits 2 with error line', () => {
  const r = runCli(['update', '--plugin'])
  assert.equal(r.status, 2)
  assert.match(r.stderr, /error: missing value for --plugin/)
})

test('cli: unknown option exits 2 with error line', () => {
  const r = runCli(['update', '--aln'])
  assert.equal(r.status, 2)
  assert.match(r.stderr, /error: unknown option --aln/)
})

test('cli: stray positional exits 2 with usage line', () => {
  const r = runCli(['update', 'oopsie', '--dry-run'])
  assert.equal(r.status, 2)
  assert.match(r.stderr, /usage: agp update/)
})

test('cli: bare invocation still exits 2 with usage', () => {
  const r = runCli([])
  assert.equal(r.status, 2)
  assert.match(r.stderr, /unknown command: \(none\)/)
})

test('cli: valid --plugin dry-run unchanged (exit 0, skipped)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-cli2-'))
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify({
    version: 2, plugin_dir: 'universal-plugin', targets: {},
    plugins: [{ name: 'demo', category: '_universal', tier: 'oss',
                url: 'https://invalid.invalid/x.git', pin: null, wrapper: false,
                skill_entry: null, plugin_keys: [], marketplace_key: 'demo',
                platforms: ['*'] }],
  }))
  const r = runCli(['update', '--plugin', 'demo', '--dry-run'], root)
  assert.equal(r.status, 0, `stderr: ${r.stderr}`)
  assert.match(r.stdout, /"skipped"/)
  assert.match(r.stdout, /"demo"/)
})
