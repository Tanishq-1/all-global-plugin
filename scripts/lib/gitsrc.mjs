import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const COMMIT_PATHS = ['universal-plugin', 'plugins.json', 'state.json', 'QUARANTINE.md']

function run(args, opts = {}) { return spawnSync('git', args, { encoding: 'utf8', ...opts }) }

export function lsRemote(url) {
  const r = run(['ls-remote', url, 'HEAD'])
  return r.status === 0 ? (r.stdout.split('\t')[0] ?? '').trim() || null : null
}

export function cloneArgs(url, pin) {
  return ['-c', 'core.longpaths=true',
          'clone', '--depth', '1', ...(pin ? ['--branch', pin] : []), url]
}

export function clone(url, pin, dest) {
  const r = run([...cloneArgs(url, pin), dest])
  if (r.status !== 0) throw new Error(`git clone failed for ${url}: ${r.stderr}`)
}

export function headSha(dir) {
  const r = run(['-C', dir, 'rev-parse', 'HEAD'])
  return r.status === 0 ? r.stdout.trim() : null
}

export function commitAll(dir, message) {
  const present = COMMIT_PATHS.filter(p => fs.existsSync(path.join(dir, p)))
  if (present.length) run(['-C', dir, 'add', '--', ...present])
  const r = run(['-C', dir, 'commit', '-q', '-m', message])
  if (r.status !== 0 && !/nothing( added)? to commit/.test(r.stdout + r.stderr)) {
    throw new Error(`git commit failed: ${r.stderr}`)
  }
}
