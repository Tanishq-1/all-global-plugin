export function parseFrontmatter(md) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md)
  if (!m) return null
  const fm = {}
  let key = null
  for (const ln of m[1].split(/\r?\n/)) {
    const top = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(ln)
    if (top && !/^\s/.test(ln)) { key = top[1]; fm[key] = top[2].trim() }
    else if (key && /^\s+\S/.test(ln) && fm[key]) { fm[key] += ' ' + ln.trim() }
  }
  return fm
}
