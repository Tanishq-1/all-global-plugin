#!/usr/bin/env node
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runUpdate } from '../scripts/cmd/update.mjs'

const COMMANDS = new Set(['update', 'add', 'remove', 'status', 'doctor', 'verify', 'index', 'enable', 'disable', 'sync', 'rollback'])
const USAGE = [
  'usage: agp update [--all|--plugin N|--category C] [--dry-run]',
  '       agp add --plugin N --url U --category C [--tier oss] [--marketplace-key K] [--skill-entry P] [--disabled] [--dry-run]',
  '       agp remove --plugin N [--dry-run]',
  '       agp status',
  '       agp doctor',
  '       agp verify',
  '       agp index',
  '       agp enable --plugin N | agp disable --plugin N [--dry-run]',
  '       agp sync [--all|--tool T|--plugin N|--category C] [--dry-run]',
  '       agp rollback --plugin N [--to SHA] | agp rollback --batch last|<id> [--dry-run]',
].join('\n')
const VALUE_FLAGS = new Set(['plugin', 'category', 'url', 'tier', 'marketplace-key', 'skill-entry', 'tool', 'to', 'batch'])
const BOOL_FLAGS = new Set(['all', 'dry-run', 'disabled'])

export function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { args._.push(a); continue }
    const key = a.slice(2)
    if (VALUE_FLAGS.has(key)) {
      const v = argv[++i]
      if (v === undefined || v === '' || v.startsWith('--')) throw new Error(`error: missing value for ${a}`)
      args[key] = v
    } else if (BOOL_FLAGS.has(key)) {
      args[key] = true
    } else {
      throw new Error(`error: unknown option ${a}`)
    }
  }
  return args
}

async function main() {
  const repoRoot = process.cwd()
  const [cmd, ...rest] = process.argv.slice(2)
  if (!COMMANDS.has(cmd)) {
    console.error(`unknown command: ${cmd ?? '(none)'}\n${USAGE}`)
    process.exitCode = 2
    return
  }
  let args
  try {
    args = parseArgs(rest)
  } catch (e) {
    console.error(e.message)
    process.exitCode = 2
    return
  }
  if (args._.length) {
    console.error(`error: unexpected argument '${args._[0]}'\n${USAGE}`)
    process.exitCode = 2
    return
  }
  if (cmd === 'add' || cmd === 'remove') {
    if (!args.plugin || (cmd === 'add' && (!args.url || !args.category))) {
      console.error(`error: ${cmd} requires ${cmd === 'add' ? '--plugin, --url and --category' : '--plugin'}\n${USAGE}`)
      process.exitCode = 2
      return
    }
    if (cmd === 'add') {
      const { runAdd } = await import('../scripts/cmd/manage.mjs')
      const res = await runAdd({ repoRoot, name: args.plugin, url: args.url,
                                 category: args.category, tier: args.tier ?? 'oss',
                                 marketplaceKey: args['marketplace-key'] ?? null,
                                 skillEntry: args['skill-entry'] ?? null,
                                 enabledByDefault: args.disabled ? false : true,
                                 dryRun: !!args['dry-run'] })
      console.log(JSON.stringify(res))
      process.exitCode = res.ok ? 0 : 1
    } else {
      const { runRemove } = await import('../scripts/cmd/manage.mjs')
      try {
        console.log(JSON.stringify(runRemove({ repoRoot, name: args.plugin,
                                               dryRun: !!args['dry-run'] })))
      } catch (e) {
        console.error(e.message)
        process.exitCode = 1
      }
    }
    return
  }
  if (cmd === 'enable' || cmd === 'disable') {
    if (!args.plugin) {
      console.error(`error: ${cmd} requires --plugin\n${USAGE}`)
      process.exitCode = 2
      return
    }
    const manifest = (await import('../scripts/lib/manifest.mjs')).loadManifest(repoRoot)
    if (!manifest.plugins.some(p => p.name === args.plugin)) {
      console.error(`error: plugin not in manifest: ${args.plugin}`)
      process.exitCode = 1
      return
    }
    if (args['dry-run']) {
      console.log(JSON.stringify({ dryRun: true, plugin: args.plugin, enabled: cmd === 'enable' }))
      return
    }
    const { setEnabled } = await import('../scripts/lib/local.mjs')
    setEnabled(repoRoot, args.plugin, cmd === 'enable')
    console.log(JSON.stringify({ plugin: args.plugin, enabled: cmd === 'enable' }))
    return
  }
  if (cmd === 'sync') {
    const { runSync, isToolKey } = await import('../scripts/cmd/sync.mjs')
    if (args.tool && !isToolKey(args.tool)) {
      console.error(`error: unknown tool '${args.tool}' (expected bridge|claude|opencode|gemini|qwen|mcp|codex|windsurf|q)\n${USAGE}`)
      process.exitCode = 2
      return
    }
    if (args._.length === 0 && !args.all && !args.tool && !args.plugin && !args.category) {
      console.error(`error: sync requires a selector: --all, --tool T, --plugin N, or --category C\n${USAGE}`)
      process.exitCode = 2
      return
    }
    const res = await runSync({ repoRoot, tool: args.tool ?? null,
                                plugin: args.plugin ?? null, category: args.category ?? null,
                                dryRun: !!args['dry-run'] })
    console.log(JSON.stringify(res, null, 2))
    return
  }
  if (cmd === 'rollback') {
    if (args.to && !args.plugin) {
      console.error(`error: --to is only valid with --plugin\n${USAGE}`)
      process.exitCode = 2
      return
    }
    if ((args.plugin ? 1 : 0) + (args.batch ? 1 : 0) !== 1) {
      console.error(`error: rollback requires exactly one of --plugin or --batch\n${USAGE}`)
      process.exitCode = 2
      return
    }
    const { runRollback } = await import('../scripts/cmd/rollback.mjs')
    const res = runRollback({ repoRoot, name: args.plugin ?? null, to: args.to ?? null,
                              batch: args.batch ?? null, dryRun: !!args['dry-run'] })
    console.log(JSON.stringify(res, null, 2))
    process.exitCode = res.ok ? 0 : 1
    return
  }
  if (cmd === 'verify') {
    const { runVerify } = await import('../scripts/cmd/verify.mjs')
    try {
      const res = runVerify({ repoRoot })
      for (const p of res.problems) console.log(p)
      console.log(JSON.stringify({ ok: res.ok, skillCount: res.skillCount }))
      process.exitCode = res.ok ? 0 : 1
    } catch (e) {
      console.error(e.message)
      process.exitCode = 1
    }
    return
  }
  if (cmd === 'index') {
    const { writeIndex } = await import('../scripts/cmd/index.mjs')
    writeIndex({ repoRoot }); return
  }
  if (cmd === 'doctor') {
    const { runDoctor } = await import('../scripts/cmd/inspect.mjs')
    const { problems } = runDoctor({ repoRoot })
    for (const p of problems) console.log(p)
    process.exitCode = problems.length ? 1 : 0
    return
  }
  if (cmd === 'status') {
    const { runStatus } = await import('../scripts/cmd/inspect.mjs')
    const rows = runStatus({ repoRoot })
    if (rows.length) console.table(rows)
    return
  }
  const res = await runUpdate({ repoRoot, name: args.plugin ?? null,
                                category: args.category ?? null, dryRun: !!args['dry-run'] })
  console.log(JSON.stringify(res, null, 2))
  process.exitCode = res.failed.length ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
