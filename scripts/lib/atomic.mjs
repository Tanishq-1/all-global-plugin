// scripts/lib/atomic.mjs
import fs from 'node:fs'
import path from 'node:path'

export function stageDir(dest) {
  const parent = fs.existsSync(dest) ? path.dirname(dest) : dest
  fs.mkdirSync(parent, { recursive: true })
  return fs.mkdtempSync(path.join(parent, '.stage-'))
}

export function stripGit(dir) {
  const g = path.join(dir, '.git')
  if (fs.existsSync(g)) fs.rmSync(g, { recursive: true, force: true })
}

export function swapIn(staged, dest, validateFn) {
  const retired = `${dest}.old-${Date.now()}`
  const hadOld = fs.existsSync(dest)
  if (hadOld) fs.renameSync(dest, retired)
  try {
    fs.renameSync(staged, dest)
  } catch (moveErr) {
    if (hadOld) fs.renameSync(retired, dest)
    throw moveErr
  }
  try {
    validateFn(dest)
  } catch (valErr) {
    fs.rmSync(dest, { recursive: true, force: true })
    if (hadOld) fs.renameSync(retired, dest)
    throw valErr
  }
  if (hadOld) fs.rmSync(retired, { recursive: true, force: true })
}
