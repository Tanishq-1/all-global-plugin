// scripts/lib/releasenotes.mjs
import fs from 'node:fs'
import path from 'node:path'
import { readState } from './state.mjs'
import { loadManifest } from './manifest.mjs'

function tsSlug(iso) { return iso.replaceAll(':', '-') }

function noteFor(name, { batch, post, entry }) {
  const pre = batch.plugins[name]
  const preSha = pre?.pre_upstream_sha ?? null
  const postSha = post.upstream_commit_sha ?? null
  const lines = [
    `# ${name}`,
    '',
    `Upstream: ${entry.url}`,
    `Date: ${batch.at}`,
    `Version: ${pre?.pre_version ?? 'unknown'} → ${post.version ?? 'unknown'}`,
    `Upstream SHA: ${(preSha ?? '').slice(0, 7) || 'unknown'} → ${(postSha ?? '').slice(0, 7) || 'unknown'}`,
  ]
  if (/^https:\/\/github\.com\//.test(entry.url ?? '')
      && /^[0-9a-f]{40}$/.test(preSha ?? '') && /^[0-9a-f]{40}$/.test(postSha ?? '')) {
    lines.push(`Compare: ${entry.url}/compare/${preSha}...${postSha}`)
  }
  lines.push(`Vendored in repo snapshot: ${(post.snapshot_commit ?? '').slice(0, 7) || 'unknown'}`, '')
  return lines.join('\n')
}

export function generateReleaseNotes({ repoRoot, batch }) {
  const manifest = loadManifest(repoRoot)
  const state = readState(repoRoot)
  const byName = new Map(manifest.plugins.map(p => [p.name, p]))
  const files = [], skipped = []
  for (const [name, pre] of Object.entries(batch.plugins ?? {})) {
    const entry = byName.get(name)
    const post = state.plugins?.[name]
    if (!entry || !post) { skipped.push(name); continue }
    if ((pre?.pre_upstream_sha ?? null) === (post.upstream_commit_sha ?? null)) { skipped.push(name); continue }
    files.push({ file: path.join('release-notes', `${name}-${tsSlug(batch.at)}.md`).replace(/\\/g, '/'),
                 content: noteFor(name, { batch, post, entry }) })
  }
  return { files, skipped }
}

export function writeReleaseNotes({ repoRoot, batch }) {
  const { files, skipped } = generateReleaseNotes({ repoRoot, batch })
  for (const f of files) {
    const abs = path.join(repoRoot, f.file)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, f.content)
  }
  return { written: files.map(f => f.file), skipped }
}
