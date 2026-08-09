/**
 * Reading side of the knowledge layer: config, file walk, and `[K:…]` tokens.
 *
 * Shared by the checker (scripts/knowledge-lint.mjs) and the pointer graph
 * (scripts/knowledge-graph.mjs) so both see one definition of what counts.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export const CONFIG_PATH = '.claude/knowledge-lint.json'

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
export const TOKEN = /(→\s*)?\[K:([A-Za-z0-9_-]+)\]/g
export const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// A rule carrying `paths:` frontmatter is path-triggered, not always-on.
export const SCOPED_FRONTMATTER = /^---\r?\n[\s\S]*?^paths:/m
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

export function matchesAny(path, globs) {
  return globs.flatMap(expandBraces).some((glob) => globToRegExp(glob).test(path))
}

export function listFiles(root, dir = root, found = []) {
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

export function countLines(text) {
  const lines = text.split('\n')
  return lines.at(-1) === '' ? lines.length - 1 : lines.length
}

export function readConfig(root) {
  return JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf8'))
}

/** Every `[K:…]` token in a file, tagged as citation or declaration. Markdown fences are skipped — a token inside one is an example, not a live pointer. */
export function collectTokens(path, text) {
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

/**
 * Every live token in the repo, with the file lists the callers work from.
 *
 * `cited` is the scanned set minus exemptions; `declarable` is where a bare
 * token is allowed to mean a declaration.
 */
export function scanTokens(root, config) {
  const { slugs } = config
  const files = listFiles(root)

  const cited = files.filter(
    (path) => matchesAny(path, slugs.cite_in) && !matchesAny(path, slugs.exempt)
  )
  const tokens = cited
    .filter((path) => path !== slugs.retired_ledger)
    .flatMap((path) => collectTokens(path, readFileSync(join(root, path), 'utf8')))

  return {
    files,
    tokens,
    declarable: new Set(files.filter((path) => matchesAny(path, slugs.declare_in)))
  }
}
