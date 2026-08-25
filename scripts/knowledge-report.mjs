#!/usr/bin/env node
/**
 * The pull request's knowledge digest: the recorded facts this change is
 * standing on, the ones it just rewrote out from under live code, and the
 * pointers it left dangling. →[K:knowledge-pr-digest]
 *
 * Quotes the corpus rather than describing it — every line is the declaration's
 * own sentence, so the digest can be read without opening a topic. Reports the
 * difference between two checkouts, never the standing state, so it speaks on
 * the commit that caused a problem and stays silent after. Silence is the
 * expected output.
 *
 *   node scripts/knowledge-report.mjs --head . --base ../base --diff diff.patch
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectTokens, corpusDeclarations, isCitable, readConfig } from './knowledge/scan.mjs'
import { knowledgeGraph } from './knowledge/graph.mjs'

export const MARKER = '<!-- knowledge-report -->'

// Opens a file's hunks in a unified diff, then each hunk's head-side range.
// A deletion writes `+++ /dev/null` with no `b/`, and must close the previous
// file rather than lend it the deleted file's hunks.
const DIFF_FILE = /^\+\+\+ (?:b\/)?(.*)$/
const DIFF_HUNK = /^@@ -\S+ \+(\d+)(?:,(\d+))?/
// A declaration's block runs to the next declaration or the next heading —
// whichever lands first. Frontmatter and neighbouring facts stay out of it.
const HEADING = /^#{1,6}\s/
const DECLARATION = /\[K:[A-Za-z0-9_-]+\]/

function parseArgs(argv) {
  const args = { head: process.cwd() }

  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--head') args.head = argv[i + 1]
    if (argv[i] === '--base') args.base = argv[i + 1]
    if (argv[i] === '--diff') args.diff = argv[i + 1]
    if (argv[i] === '--repo') args.repo = argv[i + 1]
    if (argv[i] === '--sha') args.sha = argv[i + 1]
  }

  return args
}

/** Head-side line numbers the diff touched, per file. */
export function parseDiff(text) {
  const touched = new Map()
  let path = null

  function recordLine(line) {
    const file = DIFF_FILE.exec(line)
    if (file) {
      path = file[1] === '/dev/null' ? null : file[1]
      if (path) touched.set(path, new Set())
      return
    }

    const hunk = path && DIFF_HUNK.exec(line)
    if (!hunk) return

    const start = Number(hunk[1])
    const count = hunk[2] === undefined ? 1 : Number(hunk[2])
    for (let offset = 0; offset < count; offset++) touched.get(path).add(start + offset)
  }

  for (const line of text.split('\n')) recordLine(line)

  return touched
}

/** Where a declaration's prose ends, so an edit elsewhere in the topic doesn't read as an edit to it. */
function blockEnd(rows, line) {
  for (let index = line; index < rows.length; index++) {
    if (HEADING.test(rows[index]) || DECLARATION.test(rows[index])) return index
  }

  return rows.length
}

function edited(touched, path, from, to) {
  const lines = touched.get(path)
  if (!lines) return false

  for (let line = from; line <= to; line++) if (lines.has(line)) return true
  return false
}

/** `dir/file.ext:12` — the basename alone collides across `index.vue`s. */
function siteLabel({ path, line }) {
  return `${path.split('/').slice(-2).join('/')}:${line}`
}

function linker(repo, sha) {
  return (label, path, line) => {
    const anchor = line ? `#L${line}` : ''
    const href =
      repo && sha ? `https://github.com/${repo}/blob/${sha}/${path}${anchor}` : `${path}${anchor}`
    return `[${label}](${href})`
  }
}

/** Records `token`'s site under its slug, when it cites a declared fact this diff actually touched. */
function recordStandingToken(bySlug, touched, declarations, path, token) {
  if (!token.cites || !declarations.has(token.slug)) return
  if (!touched.get(path).has(token.line)) return

  const sites = bySlug.get(token.slug) ?? []
  if (!sites.some((site) => site.path === path)) sites.push({ path, line: token.line })
  bySlug.set(token.slug, sites)
}

/** Facts recorded about the very lines this change rewrote. */
function standingOn(head, touched, declarations, config) {
  const bySlug = new Map()

  for (const path of touched.keys()) {
    if (path.endsWith('.md') || !isCitable(path, config)) continue

    const absolute = join(head, path)
    if (!existsSync(absolute)) continue

    for (const token of collectTokens(path, readFileSync(absolute, 'utf8'))) {
      recordStandingToken(bySlug, touched, declarations, path, token)
    }
  }

  return [...bySlug]
    .map(([slug, sites]) => ({ declaration: declarations.get(slug), sites }))
    .sort(byDeclaration)
}

/** Facts this change rewrote, still carrying code it never revisited. */
function rewrote(head, touched, declarations, references) {
  const entries = []

  for (const declaration of declarations.values()) {
    if (!touched.has(declaration.path)) continue

    const rows = readFileSync(join(head, declaration.path), 'utf8').split('\n')
    const end = blockEnd(rows, declaration.line)
    if (!edited(touched, declaration.path, declaration.line, end)) continue

    const sites = (references.get(declaration.slug)?.citedBy ?? [])
      .map((site) => {
        const [path, line] = [
          site.slice(0, site.lastIndexOf(':')),
          site.slice(site.lastIndexOf(':') + 1)
        ]
        return { path, line: Number(line) }
      })
      .filter((site) => !site.path.endsWith('.md') && !touched.has(site.path))

    if (sites.length) entries.push({ declaration, sites })
  }

  return entries.sort(byDeclaration)
}

/** Same topic, same order as the topic tells it — so related facts sit together. */
function byDeclaration(one, two) {
  return (
    one.declaration.path.localeCompare(two.declaration.path) ||
    one.declaration.line - two.declaration.line
  )
}

function section(title, lines) {
  return lines.length ? `#### ${title}\n\n${lines.join('\n')}` : null
}

export function buildReport({ head, base, touched = new Map(), repo, sha }) {
  const config = readConfig(head)
  const headGraph = knowledgeGraph(head)
  const baseGraph = base ? knowledgeGraph(base) : { references: new Map(), unreachable: [] }
  const declarations = corpusDeclarations(head, config)
  const link = linker(repo, sha)

  const footnotes = []
  const note = (links) => {
    footnotes.push(`[^${footnotes.length + 1}]: ${links.join(' — ')}`)
    return `[^${footnotes.length}]`
  }
  const topic = ({ path, line, slug }) =>
    link(path.split('/').pop().replace(/\.md$/, ''), path, line) || slug
  const said = ({ statement, slug }) =>
    statement ?? `\`${slug}\` — no statement on its declaration.`

  const sits = standingOn(head, touched, declarations, config).map(
    ({ declaration, sites }) =>
      `- ${said(declaration)}${note([topic(declaration), sites.map((site) => link(siteLabel(site), site.path, site.line)).join(', ')])}`
  )
  const changed = rewrote(head, touched, declarations, headGraph.references).map(
    ({ declaration, sites }) =>
      `- ${said(declaration)}${note([topic(declaration), sites.map((site) => link(siteLabel(site), site.path, site.line)).join(', ')])}`
  )

  const baseCounts = new Map(
    [...baseGraph.references].map(([slug, entry]) => [slug, entry.citedBy.length])
  )
  const baseUnreachable = new Set(baseGraph.unreachable)
  const housekeeping = [
    ...[...headGraph.references]
      .filter(([slug, entry]) => entry.citedBy.length === 0 && (baseCounts.get(slug) ?? 0) > 0)
      .map(
        ([slug, entry]) =>
          `- Nothing cites \`${slug}\` any more.${note([link(entry.declaredIn.split('/').pop().replace(/\.md$/, ''), entry.declaredIn)])}`
      ),
    ...headGraph.unreachable
      .filter((path) => !baseUnreachable.has(path))
      .map(
        (path) =>
          `- Nothing routes a reader to \`${path}\`.${note([link(path.split('/').pop().replace(/\.md$/, ''), path)])}`
      )
  ]

  const sections = [
    section('Facts your changes sit on', sits),
    section('Knowledge you changed', changed),
    section('Housekeeping', housekeeping)
  ].filter(Boolean)

  if (!sections.length) return ''

  return `${MARKER}\n### Knowledge\n\n${sections.join('\n\n')}\n\n${footnotes.join('\n')}`
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const report = buildReport({
    head: args.head,
    base: args.base,
    touched:
      args.diff && existsSync(args.diff) ? parseDiff(readFileSync(args.diff, 'utf8')) : new Map(),
    repo: args.repo,
    sha: args.sha
  })

  if (report) console.log(report)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
