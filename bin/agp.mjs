#!/usr/bin/env node
import path from 'node:path'
import { runUpdate } from '../scripts/cmd/update.mjs'

export function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--all' || a === '--dry-run') args[a.slice(2)] = true
    else if (a === '--plugin' || a === '--category') args[a.slice(2)] = argv[++i]
    else args._.push(a)
  }
  return args
}

async function main() {
  const repoRoot = process.cwd()
  const [cmd, ...rest] = process.argv.slice(2)
  const args = parseArgs(rest)
  if (cmd === 'update') {
    const res = await runUpdate({ repoRoot, name: args.plugin ?? null,
                                  category: args.category ?? null, dryRun: !!args['dry-run'] })
    console.log(JSON.stringify(res, null, 2))
    process.exitCode = res.failed.length ? 1 : 0
    return
  }
  console.error(`unknown command: ${cmd ?? '(none)'}\nusage: agp update [--all|--plugin N|--category C] [--dry-run]`)
  process.exitCode = 2
}

main()
