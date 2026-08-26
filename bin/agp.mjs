#!/usr/bin/env node
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runUpdate } from '../scripts/cmd/update.mjs'

const COMMANDS = new Set(['update', 'add', 'remove', 'status', 'doctor'])
const USAGE = [
  'usage: agp update [--all|--plugin N|--category C] [--dry-run]',
  '       agp add --plugin N --url U --category C [--tier oss] [--marketplace-key K] [--skill-entry P] [--dry-run]',
  '       agp remove --plugin N [--dry-run]',
  '       agp status',
  '       agp doctor',
].join('\n')
const VALUE_FLAGS = new Set(['plugin', 'category', 'url', 'tier', 'marketplace-key', 'skill-entry'])
const BOOL_FLAGS = new Set(['all', 'dry-run'])

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
