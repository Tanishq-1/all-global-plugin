// scripts/cmd/manage.mjs
import fs from 'node:fs'
import path from 'node:path'
import { loadManifest } from '../lib/manifest.mjs'
import { readState, writeState } from '../lib/state.mjs'
import { runUpdate } from './update.mjs'

export const _runUpdate = { call: runUpdate }

export function saveManifest(repoRoot, m) {
  fs.writeFileSync(path.join(repoRoot, 'plugins.json'), JSON.stringify(m, null, 2) + '\n')
}

export async function runAdd({ repoRoot, name, url, category, tier,
                               marketplaceKey = null, skillEntry = null, dryRun = false }) {
  const manifest = loadManifest(repoRoot)
  if (manifest.plugins.some(p => p.name === name)) {
    return { ok: false, error: `plugin already present: ${name}` }
  }
  const entry = { name, category, tier, url, pin: null, wrapper: false,
                  skill_entry: skillEntry,
                  plugin_keys: [], marketplace_key: marketplaceKey, platforms: ['*'] }
  if (!dryRun) {
    manifest.plugins.push(entry)
    saveManifest(repoRoot, manifest)
  }
  let res
  try {
    res = await _runUpdate.call({ repoRoot, name, category: null, dryRun })
  } catch (err) {
    if (!dryRun) {
      const m2 = loadManifest(repoRoot)
      m2.plugins = m2.plugins.filter(p => p.name !== name)
      saveManifest(repoRoot, m2)
    }
    return { ok: false, error: `install failed for ${name}; manifest rolled back (${err.message})` }
  }
  if (res.failed.length) {
    if (!dryRun) {
      const m2 = loadManifest(repoRoot)
      m2.plugins = m2.plugins.filter(p => p.name !== name)
      saveManifest(repoRoot, m2)
    }
    return { ok: false, error: `install failed for ${name}; manifest rolled back` }
  }
  return { ok: true }
}

export function runRemove({ repoRoot, name, dryRun = false }) {
  const manifest = loadManifest(repoRoot)
  if (!manifest.plugins.some(p => p.name === name)) {
    throw new Error(`plugin not in manifest: ${name}`)
  }
  if (!dryRun) {
    manifest.plugins = manifest.plugins.filter(p => p.name !== name)
    saveManifest(repoRoot, manifest)
    const st = readState(repoRoot)
    delete st.plugins?.[name]
    writeState(repoRoot, st)
  }
  return { removed: name, folderRetained: true }
}
