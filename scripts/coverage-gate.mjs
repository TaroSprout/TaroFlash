#!/usr/bin/env node
/**
 * Fails a pull request whose changed source files have no test exercising them.
 *
 * Reads the merged coverage summary the test jobs produce. Run from CI with the
 * branch's changed-file list; see .github/workflows/ci.yml.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const COVERED = /^src\/.*\.(ts|vue)$/

const RULE =
  'A source file changed on this branch has no test touching a single line of it. Cover it, or ' +
  "exclude it in vite.config.ts's coverage block if it genuinely can't be tested."

function readArgs(argv) {
  const args = { changed: null, summary: 'coverage/coverage-summary.json', root: process.cwd() }

  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '')
    if (key in args) args[key] = argv[i + 1]
  }

  return args
}

/** Paths the branch touched that coverage has an opinion about, still present on disk. */
function changedSources(root, changedPath) {
  return readFileSync(changedPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((path) => COVERED.test(path) && existsSync(join(root, path)))
}

/**
 * The summary keys are absolute paths from whichever machine ran the tests, so a
 * changed path matches by suffix rather than by equality.
 */
function findEntry(summary, root, path) {
  const absolute = resolve(root, path)
  const key = Object.keys(summary).find((one) => one === absolute || one.endsWith(`/${path}`))
  return key ? summary[key] : null
}

export function findUncovered(root, changedPath, summaryPath) {
  const summary = JSON.parse(readFileSync(join(root, summaryPath), 'utf8'))

  return (
    changedSources(root, changedPath)
      .map((path) => ({ path, entry: findEntry(summary, root, path) }))
      // No entry means the coverage config excludes the file — a decision already made.
      .filter(({ entry }) => entry && entry.lines.total > 0 && entry.lines.covered === 0)
      .map(({ path }) => `${path} — changed on this branch and covered by no test`)
  )
}

function main() {
  const { changed, summary, root } = readArgs(process.argv.slice(2))
  if (!changed) {
    console.error("::error::coverage-gate needs --changed <file listing the branch's paths>")
    process.exit(1)
  }

  const uncovered = findUncovered(root, changed, summary)

  for (const failure of uncovered) console.error(`::error::${failure}`)
  if (uncovered.length) console.error(`::error::${RULE}`)

  console.log(`coverage-gate: ${uncovered.length} changed source files with no coverage`)
  if (uncovered.length) process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
