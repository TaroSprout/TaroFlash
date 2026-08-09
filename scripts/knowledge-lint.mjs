#!/usr/bin/env node
/**
 * Checks the knowledge addressing scheme: slug declarations, citations, the
 * retired-slug ledger, and the always-on line budget.
 *
 * Run with `pnpm knowledge:check`. Config lives in .claude/knowledge-lint.json —
 * the single declared place for the always-on file list and the caps.
 * See .claude/rules/knowledge-addressing.md.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const CONFIG_PATH = '.claude/knowledge-lint.json'
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.vitest-reports',
  '.claude/worktrees'
])

// `→[K:<slug>]` cites, bare `[K:<slug>]` declares. Angle-bracket placeholders in
// prose (`[K:<kebab-slug>]`) deliberately fall outside the character class.
const TOKEN = /(→\s*)?\[K:([A-Za-z0-9_-]+)\]/g
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LEDGER_ENTRY = /^\s*[-*]\s*\[K:([A-Za-z0-9_-]+)\]\s*—\s*(.*)$/
// A rule carrying `paths:` frontmatter is path-triggered, not always-on.
const SCOPED_FRONTMATTER = /^---\r?\n[\s\S]*?^paths:/m
// Opens or closes a markdown code fence; group 2 is the info string a close can't have.
const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*(.*)$/

function expandBraces(glob) {
  const match = /\{([^{}]*)\}/.exec(glob)
  if (!match) return [glob]

  return match[1]
    .split(',')
    .flatMap((option) =>
      expandBraces(glob.slice(0, match.index) + option + glob.slice(match.index + match[0].length))
    )
}

function globToRegExp(glob) {
  let out = ''

  for (let i = 0; i < glob.length; i++) {
    const char = glob[i]
    if (char === '*' && glob[i + 1] === '*' && glob[i + 2] === '/') {
      out += '(?:.*/)?'
      i += 2
      continue
    }
    if (char === '*' && glob[i + 1] === '*') {
      out += '.*'
      i += 1
      continue
    }
    if (char === '*') {
      out += '[^/]*'
      continue
    }
    if (char === '?') {
      out += '[^/]'
      continue
    }
    out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }

  return new RegExp(`^${out}$`)
}

function matchesAny(path, globs) {
  return globs.flatMap(expandBraces).some((glob) => globToRegExp(glob).test(path))
}

function listFiles(root, dir = root, found = []) {
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry)
    const path = relative(root, absolute)
    if (SKIP_DIRS.has(entry) || SKIP_DIRS.has(path)) continue

    if (statSync(absolute).isDirectory()) {
      listFiles(root, absolute, found)
      continue
    }
    found.push(path)
  }

  return found
}

function countLines(text) {
  const lines = text.split('\n')
  return lines.at(-1) === '' ? lines.length - 1 : lines.length
}

/** Every `[K:…]` token in a file, tagged as citation or declaration. Markdown fences are skipped — a token inside one is an example, not a live pointer. */
function collectTokens(path, text) {
  const tokens = []
  const markdown = path.endsWith('.md')
  let fence = null

  for (const [index, line] of text.split('\n').entries()) {
    const marker = markdown && FENCE.exec(line)

    if (marker && !fence) {
      fence = marker[1]
      continue
    }
    if (
      marker &&
      marker[1][0] === fence[0] &&
      marker[1].length >= fence.length &&
      !marker[2].trim()
    ) {
      fence = null
      continue
    }
    if (fence) continue

    for (const match of line.matchAll(TOKEN)) {
      tokens.push({ path, line: index + 1, slug: match[2], cites: Boolean(match[1]), text: line })
    }
  }

  return tokens
}

/** Retired slugs and their epitaphs; a malformed entry is an error, not an epitaph. */
function readLedger(root, ledgerPath) {
  const errors = []
  const retired = new Map()
  const absolute = join(root, ledgerPath)
  if (!existsSync(absolute)) return { retired, errors }

  for (const [index, line] of readFileSync(absolute, 'utf8').split('\n').entries()) {
    if (!line.trimStart().startsWith('-') || !line.includes('[K:')) continue

    const entry = LEDGER_ENTRY.exec(line)
    if (!entry || !entry[2].trim()) {
      errors.push(`${ledgerPath}:${index + 1} — ledger entry needs \`- [K:<slug>] — <epitaph>\``)
      continue
    }
    retired.set(entry[1], { epitaph: entry[2].trim(), line: index + 1 })
  }

  return { retired, errors }
}

function checkDeclarations(tokens, retired, ledgerPath) {
  const errors = []
  const declared = new Map()

  for (const token of tokens.filter((candidate) => !candidate.cites)) {
    const at = `${token.path}:${token.line}`
    if (!KEBAB.test(token.slug)) {
      errors.push(`${at} — [K:${token.slug}] is not a kebab-case slug`)
      continue
    }
    if (retired.has(token.slug)) {
      errors.push(`${at} — [K:${token.slug}] is retired in ${ledgerPath}; slugs are never reused`)
      continue
    }

    const first = declared.get(token.slug)
    if (first) {
      errors.push(`${at} — [K:${token.slug}] already declared at ${first}`)
      continue
    }
    declared.set(token.slug, at)
  }

  return { declared, errors }
}

function checkCitations(tokens, declared, retired, ledgerPath) {
  return tokens
    .filter((token) => token.cites && !declared.has(token.slug))
    .map((token) => {
      const at = `${token.path}:${token.line}`
      const retirement = retired.get(token.slug)
      if (retirement)
        return `${at} — →[K:${token.slug}] is retired (${ledgerPath}:${retirement.line})`
      return `${at} — →[K:${token.slug}] resolves to no declaration`
    })
}

/** A comment line stripped of its markers and every citation — what a human is actually told. */
function prose(line) {
  return line
    .replace(TOKEN, '')
    .replace(/^\s*(\/\*\*|\/\/|\*\/|\*|#|--)+/, '')
    .replace(/\*\/\s*$/, '')
    .replace(/[\s.,;:—-]/g, '')
}

/**
 * A citation must ride a sentence a reader can act on without opening the topic.
 * Its own line is fine only when the line above already carries that sentence.
 */
function checkOrphanCitations(root, tokens) {
  const lines = new Map()

  return tokens
    .filter((token) => token.cites && !token.path.endsWith('.md') && !prose(token.text))
    .filter((token) => {
      if (!lines.has(token.path)) {
        lines.set(token.path, readFileSync(join(root, token.path), 'utf8').split('\n'))
      }
      const previous = lines.get(token.path)[token.line - 2] ?? ''
      return !/^\s*(\/\/|\*|\/\*)/.test(previous) || !prose(previous)
    })
    .map(
      (token) =>
        `${token.path}:${token.line} — →[K:${token.slug}] is the whole comment; say what a reader would get wrong`
    )
}

function checkLineCaps(root, files, alwaysOn) {
  const breaches = []
  const caps = alwaysOn.line_caps
  let total = 0

  for (const path of files.filter((file) => matchesAny(file, alwaysOn.include))) {
    const text = readFileSync(join(root, path), 'utf8')
    if (SCOPED_FRONTMATTER.test(text)) continue

    const lines = countLines(text)
    total += lines

    const cap = caps.per_file?.[path]
    if (cap && lines > cap) breaches.push(`${path} is ${lines} lines, over its ${cap}-line cap`)
  }

  if (total > caps.total) {
    breaches.push(`always-on payload is ${total} lines, over the ${caps.total}-line cap`)
  }

  // Caps stay advisory until the payload is restructured (TARO-331).
  return {
    errors: caps.enforced === false ? [] : breaches,
    warnings: caps.enforced === false ? breaches : [],
    total
  }
}

export function lintKnowledge(root) {
  const config = JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf8'))
  const { slugs, always_on } = config
  const files = listFiles(root)

  const ledger = readLedger(root, slugs.retired_ledger)
  const cited = files.filter(
    (path) => matchesAny(path, slugs.cite_in) && !matchesAny(path, slugs.exempt)
  )
  const tokens = cited
    .filter((path) => path !== slugs.retired_ledger)
    .flatMap((path) => collectTokens(path, readFileSync(join(root, path), 'utf8')))

  const declarable = new Set(files.filter((path) => matchesAny(path, slugs.declare_in)))
  const misplaced = tokens
    .filter((token) => !token.cites && !declarable.has(token.path))
    .map(
      (token) => `${token.path}:${token.line} — [K:${token.slug}] declared outside a knowledge file`
    )

  const declarations = checkDeclarations(
    tokens.filter((token) => declarable.has(token.path)),
    ledger.retired,
    slugs.retired_ledger
  )
  const citations = checkCitations(
    tokens,
    declarations.declared,
    ledger.retired,
    slugs.retired_ledger
  )
  const orphans = checkOrphanCitations(root, tokens)
  const caps = checkLineCaps(root, files, always_on)

  return {
    errors: [
      ...ledger.errors,
      ...declarations.errors,
      ...misplaced,
      ...citations,
      ...orphans,
      ...caps.errors
    ],
    warnings: caps.warnings,
    stats: {
      declared: declarations.declared.size,
      retired: ledger.retired.size,
      citations: tokens.filter((token) => token.cites).length,
      alwaysOnLines: caps.total
    }
  }
}

function main() {
  const root = process.argv[2] ?? process.cwd()
  const { errors, warnings, stats } = lintKnowledge(root)

  for (const warning of warnings) console.error(`::warning::${warning}`)
  for (const error of errors) console.error(`::error::${error}`)

  console.log(
    `knowledge-lint: ${stats.declared} slugs, ${stats.citations} citations, ` +
      `${stats.retired} retired, ${stats.alwaysOnLines} always-on lines`
  )
  if (errors.length) process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
