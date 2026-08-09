#!/usr/bin/env node
/**
 * The pull request's knowledge digest: slugs the changed code cites, and what
 * this change just stranded.
 *
 * Reports the difference between two checkouts, never the standing state, so it
 * speaks on the commit that caused a problem and stays silent after.
 * Prints markdown for one sticky comment, or nothing at all.
 *
 *   node scripts/knowledge-report.mjs --head . --base ../base --changed changed.txt
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectTokens } from './knowledge/scan.mjs'
import { knowledgeGraph } from './knowledge/graph.mjs'

export const MARKER = '<!-- knowledge-report -->'

function parseArgs(argv) {
  const args = { head: process.cwd() }

  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--head') args.head = argv[i + 1]
    if (argv[i] === '--base') args.base = argv[i + 1]
    if (argv[i] === '--changed') args.changed = argv[i + 1]
  }

  return args
}

function readChangedFiles(path) {
  if (!path || !existsSync(path)) return []

  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Citations sitting in the code this change touched, grouped by the slug they point at. */
function citedByChangedCode(root, changed, references) {
  const cited = new Map()

  for (const path of changed.filter((file) => !file.endsWith('.md'))) {
    const absolute = join(root, path)
    if (!existsSync(absolute)) continue

    for (const token of collectTokens(path, readFileSync(absolute, 'utf8'))) {
      if (!token.cites) continue

      const entry = cited.get(token.slug) ?? { sites: [], declaredIn: null }
      entry.declaredIn = references.get(token.slug)?.declaredIn ?? null
      entry.sites.push(`${token.path}:${token.line}`)
      cited.set(token.slug, entry)
    }
  }

  return cited
}

function countsOf(graph) {
  return new Map([...graph.references].map(([slug, entry]) => [slug, entry.citedBy.length]))
}

export function buildReport({ head, base, changed }) {
  const headGraph = knowledgeGraph(head)
  const baseGraph = base ? knowledgeGraph(base) : { references: new Map(), unreachable: [] }
  const baseCounts = countsOf(baseGraph)
  const baseUnreachable = new Set(baseGraph.unreachable)

  const cited = citedByChangedCode(head, changed, headGraph.references)
  const dropped = [...headGraph.references]
    .filter(([slug, entry]) => entry.citedBy.length === 0 && (baseCounts.get(slug) ?? 0) > 0)
    .map(([slug, entry]) => `\`[K:${slug}]\` — declared in \`${entry.declaredIn}\``)
  const stranded = headGraph.unreachable
    .filter((path) => !baseUnreachable.has(path))
    .map((path) => `\`${path}\``)

  const sections = []

  if (cited.size) {
    const rows = [...cited]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([slug, entry]) =>
          `- \`→[K:${slug}]\` — ${entry.declaredIn ?? 'no declaration'} — cited at ${entry.sites.join(', ')}`
      )
    sections.push(
      `**Knowledge this change stands on.** Confirm each is still true, or amend it:\n${rows.join('\n')}`
    )
  }
  if (dropped.length) {
    sections.push(
      `**Nothing cites these any more.** Retire the slug, or restore the pointer:\n- ${dropped.join('\n- ')}`
    )
  }
  if (stranded.length) {
    sections.push(
      `**Nothing routes a reader to these files any more.** Link them, or delete them:\n- ${stranded.join('\n- ')}`
    )
  }

  if (!sections.length) return ''

  return `${MARKER}\n### Knowledge\n\n${sections.join('\n\n')}`
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const report = buildReport({
    head: args.head,
    base: args.base,
    changed: readChangedFiles(args.changed)
  })

  if (report) console.log(report)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
