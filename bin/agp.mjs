#!/usr/bin/env node
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runUpdate } from '../scripts/cmd/update.mjs'

const USAGE = 'usage: agp update [--all|--plugin N|--category C] [--dry-run]'
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
  if (cmd !== 'update') {
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
  const res = await runUpdate({ repoRoot, name: args.plugin ?? null,
                                category: args.category ?? null, dryRun: !!args['dry-run'] })
  console.log(JSON.stringify(res, null, 2))
  process.exitCode = res.failed.length ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
