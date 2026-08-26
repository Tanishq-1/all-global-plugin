// scripts/lib/quarantine.mjs
import fs from 'node:fs'
import path from 'node:path'

export function quarantine(repoRoot, name, stagedDir, failures) {
  const qroot = path.join(repoRoot, 'universal-plugin', '_quarantine')
  fs.mkdirSync(qroot, { recursive: true })
  const dest = path.join(qroot, `${name}-${Date.now()}`)
  try { fs.renameSync(stagedDir, dest) } catch { fs.cpSync(stagedDir, dest, { recursive: true }); fs.rmSync(stagedDir, { recursive: true, force: true }) }
  const row = `| ${new Date().toISOString()} | ${name} | ${failures.map(f => `${f.gate}: ${f.reason}`).join('; ')} |\n`
  const log = path.join(repoRoot, 'QUARANTINE.md')
  if (!fs.existsSync(log)) fs.writeFileSync(log, '# Quarantine Log\n\n| time | plugin | failures |\n|---|---|---|\n')
  fs.appendFileSync(log, row)
}
