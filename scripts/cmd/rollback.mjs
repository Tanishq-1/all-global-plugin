// scripts/cmd/rollback.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'
import { pluginDest } from '../lib/layout.mjs'
import { listCommits, showFile, checkoutPaths, commitAll, pathTree } from '../lib/gitsrc.mjs'
import { readState, recordUpdate, appendHistory, findBatch } from '../lib/state.mjs'

function err(error) { return { ok: false, error } }

function relDest(repoRoot, entry) {
  return path.relative(repoRoot, pluginDest(repoRoot, entry)).replace(/\\/g, '/')
}

function stateAt(repoRoot, sha, name) {
  const raw = showFile(repoRoot, sha, 'state.json')
  if (!raw) return null
  try { return JSON.parse(raw).plugins?.[name] ?? null } catch { return null }
}

export function runRollback({ repoRoot, name = null, to = null, batch = null, dryRun = false }) {
  if ((name ? 1 : 0) + (batch ? 1 : 0) !== 1) {
    return err('exactly one of --plugin or --batch is required')
  }
  if (to && !name) return err('--to is only valid with --plugin')
  if (name) return rollbackPlugin({ repoRoot, name, to, dryRun })
  return rollbackBatch({ repoRoot, batch, dryRun })
}

function rollbackPlugin({ repoRoot, name, to, dryRun }) {
  const manifest = loadManifest(repoRoot)
  const entry = manifest.plugins.find(p => p.name === name)
  if (!entry) return err(`unknown plugin: ${name}`)
  const destAbs = pluginDest(repoRoot, entry)
  const destRel = relDest(repoRoot, entry)
  const commits = listCommits(repoRoot, destRel)
  if (commits.length < 2) {
    return err(`no previous version to roll back to for ${name} (single commit in history)`)
  }
  // distinct content states of the plugin folder, oldest→newest by first
  // introduction: a rollback commit re-creates an older tree, so raw git log
  // interleaves duplicates and version order must come from first appearance
  const chrono = []
  const seen = new Set()
  for (let i = commits.length - 1; i >= 0; i--) {
    const tree = pathTree(repoRoot, commits[i], destRel)
    if (!tree || seen.has(tree)) continue
    seen.add(tree)
    chrono.push({ sha: commits[i], tree })
  }
  if (chrono.length < 2) {
    return err(`no previous version to roll back to for ${name} (single content state in history)`)
  }
  const headTree = pathTree(repoRoot, 'HEAD', destRel)
  let idx = chrono.findIndex(s => s.tree === headTree)
  if (idx < 0) idx = chrono.length - 1
  if (idx === 0) {
    return err(`no previous version to roll back to for ${name} (already at oldest state)`)
  }
  let target = chrono[idx - 1].sha
  if (to) {
    if (!commits.includes(to)) {
      return err(`--to ${to} is not in commit history for ${name}. Candidates:\n${commits.join('\n')}`)
    }
    target = to
  }
  const from = commits[0]
  const pre = stateAt(repoRoot, target, name)
  const version = pre?.version ?? null
  const upstreamSha = pre?.upstream_commit_sha ?? null
  if (dryRun) {
    return { ok: true, dryRun: true, name, from, to: target, version, upstream_commit_sha: upstreamSha }
  }
  checkoutPaths(repoRoot, target, [destRel])
  const ts = new Date().toISOString()
  recordUpdate(repoRoot, name, {
    version, upstream_commit_sha: upstreamSha,
    snapshot_commit: 'pending', last_updated: ts,
  })
  const sha = commitAll(repoRoot, `Rollback ${name} → ${version ?? 'n/a'} (${target.slice(0, 7)})`)
  recordUpdate(repoRoot, name, { snapshot_commit: sha })
  appendHistory(repoRoot, name, { repo_commit: sha, version, upstream_commit_sha: upstreamSha, ts })
  return { ok: true, name, from, to: target, version, upstream_commit_sha: upstreamSha, repo_commit: sha }
}

function rollbackBatch({ repoRoot, batch, dryRun }) {
  const state = readState(repoRoot)
  const b = findBatch(state, batch)
  if (!b) return err(`batch not found: ${batch}`)
  const manifest = loadManifest(repoRoot)
  const restored = [], skipped = [], plan = []
  for (const [pname, fields] of Object.entries(b.plugins ?? {})) {
    const entry = manifest.plugins.find(p => p.name === pname)
    if (!entry) {
      skipped.push({ name: pname, reason: 'no longer in manifest' })
      continue
    }
    const destRel = relDest(repoRoot, entry)
    const destAbs = pluginDest(repoRoot, entry)
    if (showFile(repoRoot, b.pre, destRel) === null) {
      skipped.push({ name: pname, reason: 'plugin folder did not exist at batch pre state (added during batch window)' })
      continue
    }
    const preState = stateAt(repoRoot, b.pre, pname)
    restored.push(pname)
    plan.push({ name: pname, destRel, destAbs,
                version: preState?.version ?? fields.pre_version ?? null,
                upstreamSha: preState?.upstream_commit_sha ?? fields.pre_upstream_sha ?? null })
  }
  if (dryRun) {
    return { ok: true, dryRun: true, batch: b.id, restored, skipped }
  }
  if (!restored.length) {
    return err(`batch ${b.id} has no plugins to restore (all skipped)`)
  }
  checkoutPaths(repoRoot, b.pre, plan.map(p => p.destRel))
  const ts = new Date().toISOString()
  for (const p of plan) {
    recordUpdate(repoRoot, p.name, {
      version: p.version, upstream_commit_sha: p.upstreamSha,
      snapshot_commit: 'pending', last_updated: ts,
    })
  }
  const sha = commitAll(repoRoot, `Rollback batch ${b.id}: ${restored.join(', ')}`)
  for (const p of plan) {
    recordUpdate(repoRoot, p.name, { snapshot_commit: sha })
    appendHistory(repoRoot, p.name, { repo_commit: sha, version: p.version, upstream_commit_sha: p.upstreamSha, ts })
  }
  return { ok: true, batch: b.id, restored, skipped, repo_commit: sha }
}
