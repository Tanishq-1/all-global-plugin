import fs from 'node:fs'
import path from 'node:path'
import { parseFrontmatter } from './frontmatter.mjs'

const SKIP = new Set(['.git', 'node_modules'])

export function discoverSkills(root) {
  const found = []
  if (!fs.existsSync(root)) return found
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || SKIP.has(e.name)) continue
      const full = path.join(dir, e.name)
      const sm = path.join(full, 'SKILL.md')
      if (fs.existsSync(sm)) {
        const fm = parseFrontmatter(fs.readFileSync(sm, 'utf8')) ?? {}
        found.push({ dir: full, file: sm, name: fm.name, description: fm.description })
      }
      walk(full)
    }
  }
  walk(root)
  return found
}
