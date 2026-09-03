import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const COMMIT_PATHS = ['universal-plugin', 'plugins.json', 'state.json', 'QUARANTINE.md',
                      'release-notes', 'CHANGELOG.md', 'INDEX.md']

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
  // CI runners have no ambient git identity; carry one per invocation (matches
  // the -c pattern the test fixtures use). Explicit repo config wins over -c.
  const r = run(['-C', dir, '-c', 'user.email=agp@local', '-c', 'user.name=agp',
                 'commit', '-q', '-m', message])
  if (r.status !== 0 && !/nothing( added)? to commit/.test(r.stdout + r.stderr)) {
    throw new Error(`git commit failed: ${r.stderr}`)
  }
  return r.status === 0 ? headSha(dir) : null
}

export function createTag(repoRoot, name, message) {
  const r = run(['-C', repoRoot, '-c', 'user.email=agp@local', '-c', 'user.name=agp',
                 'tag', '-a', name, '-m', message])
  if (r.status !== 0) throw new Error(`git tag failed for ${name}: ${r.stderr}`)
}

export function listCommits(repoRoot, p) {
  const r = run(['-C', repoRoot, 'log', '--format=%H', '--', p])
  if (r.status !== 0) throw new Error(`git log failed for ${p}: ${r.stderr}`)
  return r.stdout.trim().split('\n').filter(Boolean)
}

export function showFile(repoRoot, sha, file) {
  const r = run(['-C', repoRoot, 'show', `${sha}:${file}`])
  return r.status === 0 ? r.stdout : null
}

export function pathTree(repoRoot, sha, p) {
  const r = run(['-C', repoRoot, 'rev-parse', `${sha}:${p}`])
  return r.status === 0 ? r.stdout.trim() : null
}

export function checkoutPaths(repoRoot, sha, paths) {
  const r = run(['-C', repoRoot, 'checkout', sha, '--', ...paths])
  if (r.status !== 0) throw new Error(`git checkout failed: ${r.stderr}`)
}
