import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lsRemote, cloneArgs } from '../scripts/lib/gitsrc.mjs'

test('commitAll stages explicit plugin paths; unrelated WIP stays uncommitted', async (t) => {
  const { headSha, commitAll } = await import('../scripts/lib/gitsrc.mjs')
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const cp = await import('node:child_process')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agp-git-'))
  cp.execFileSync('git', ['init', '-q'], { cwd: dir })
  fs.mkdirSync(path.join(dir, 'universal-plugin'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'universal-plugin', 'f.txt'), 'x')
  fs.writeFileSync(path.join(dir, 'stray-wip.txt'), 'not mine')
  commitAll(dir, 'test commit')
  assert.match(headSha(dir), /^[0-9a-f]{40}$/)
  const tracked = cp.execFileSync('git', ['-C', dir, 'ls-files'], { encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean)
  assert.deepEqual(tracked, ['universal-plugin/f.txt'])
})

test('lsRemote returns null for unreachable url', () => {
  assert.equal(lsRemote('https://invalid.invalid/nope.git'), null)
})

test('cloneArgs passes core.longpaths so deep upstream trees check out on Windows', () => {
  assert.deepEqual(cloneArgs('https://x/y', null),
    ['-c', 'core.longpaths=true', 'clone', '--depth', '1', 'https://x/y'])
  assert.deepEqual(cloneArgs('https://x/y', 'v1'),
    ['-c', 'core.longpaths=true', 'clone', '--depth', '1', '--branch', 'v1', 'https://x/y'])
})
