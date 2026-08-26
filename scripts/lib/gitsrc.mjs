import { spawnSync } from 'node:child_process'

function run(args, opts = {}) { return spawnSync('git', args, { encoding: 'utf8', ...opts }) }

export function lsRemote(url) {
  const r = run(['ls-remote', url, 'HEAD'])
  return r.status === 0 ? (r.stdout.split('\t')[0] ?? '').trim() || null : null
}

export function clone(url, pin, dest) {
  const args = ['clone', '--depth', '1', ...(pin ? ['--branch', pin] : []), url, dest]
  const r = run(args)
  if (r.status !== 0) throw new Error(`git clone failed for ${url}: ${r.stderr}`)
}

export function headSha(dir) {
  const r = run(['-C', dir, 'rev-parse', 'HEAD'])
  return r.status === 0 ? r.stdout.trim() : null
}

export function commitAll(dir, message) {
  run(['-C', dir, 'add', '-A'])
  const r = run(['-C', dir, 'commit', '-q', '-m', message])
  if (r.status !== 0 && !/nothing to commit/.test(r.stdout + r.stderr)) {
    throw new Error(`git commit failed: ${r.stderr}`)
  }
}
