// tests/cli.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync, execFileSync } from 'node:child_process'
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

test('parseArgs accepts --to and --batch values', async () => {
  const { parseArgs } = await import('../bin/agp.mjs')
  assert.deepEqual(parseArgs(['--to', 'a'.repeat(40), '--batch', 'last']),
                   { _: [], to: 'a'.repeat(40), batch: 'last' })
})

test('cli: rollback with no selector exits 2', () => {
  const r = runCli(['rollback', '--dry-run'])
  assert.equal(r.status, 2)
  assert.match(r.stderr, /error: rollback requires exactly one of --plugin or --batch/)
})

test('cli: rollback with both selectors exits 2', () => {
  const r = runCli(['rollback', '--plugin', 'demo', '--batch', 'last'])
  assert.equal(r.status, 2)
  assert.match(r.stderr, /error: rollback requires exactly one of --plugin or --batch/)
})

test('cli: rollback --to without --plugin exits 2', () => {
  const r = runCli(['rollback', '--batch', 'last', '--to', 'a'.repeat(40)])
  assert.equal(r.status, 2)
  assert.match(r.stderr, /error: --to is only valid with --plugin/)
})

test('cli: rollback e2e happy path (rollback after update, exit 0)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-cli-rb-'))
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root })
  const up = path.join(root, 'upstream')
  const sk = path.join(up, 'skills', 'demo')
  fs.mkdirSync(sk, { recursive: true })
  fs.writeFileSync(path.join(sk, 'SKILL.md'), '---\nname: demo\ndescription: v1\n---\nbody-v1')
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: up })
  execFileSync('git', ['-C', up, 'add', '-A'])
  execFileSync('git', ['-C', up, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'v1'])
  fs.writeFileSync(path.join(root, 'plugins.json'), JSON.stringify(
    { version: 2, plugin_dir: 'universal-plugin', targets: {}, plugins: [] }))
  fs.mkdirSync(path.join(root, 'universal-plugin'), { recursive: true })

  let r = runCli(['add', '--plugin', 'demo', '--url', up.replace(/\\/g, '/'),
                  '--category', '_universal'], root)
  assert.equal(r.status, 0, `add stderr: ${r.stderr}`)
  fs.writeFileSync(path.join(sk, 'SKILL.md'), '---\nname: demo\ndescription: v2\n---\nbody-v2')
  execFileSync('git', ['-C', up, 'add', '-A'])
  execFileSync('git', ['-C', up, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'bump'])
  r = runCli(['update', '--plugin', 'demo'], root)
  assert.equal(r.status, 0, `update stderr: ${r.stderr}`)
  r = runCli(['rollback', '--plugin', 'demo'], root)
  assert.equal(r.status, 0, `rollback stderr: ${r.stderr}`)
  assert.match(r.stdout, /"ok": true/)
  const body = fs.readFileSync(path.join(root, 'universal-plugin', '_universal', 'oss', 'demo',
    'skills', 'demo', 'SKILL.md'), 'utf8')
  assert.ok(body.includes('body-v1'), 'v1 content restored via CLI')
})
