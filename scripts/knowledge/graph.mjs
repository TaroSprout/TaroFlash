/**
 * Who points at what across the knowledge layer: inbound citations per slug,
 * and which knowledge files nothing can route a reader to.
 *
 * State only — the diff between two checkouts of it is what gets reported, in
 * scripts/knowledge-report.mjs.
 */
import { readFileSync } from 'node:fs'
import { join, dirname, normalize } from 'node:path'
import { SCOPED_FRONTMATTER, matchesAny, readConfig, scanTokens } from './scan.mjs'

const MD_PATH = /(?:\.{1,2}\/|[\w.-]+\/)[\w./-]*\.md/g
const WIKI_LINK = /\[\[([\w-]+)\]\]/g
const FRONTMATTER_ID = /^---\r?\n[\s\S]*?^id:\s*([\w-]+)\s*$/m

/** Knowledge-file targets a file's prose can send a reader to: `.md` paths and `[[id]]` links. */
function outboundLinks(path, text, byPath, byId) {
  const targets = new Set()

  for (const [mention] of text.matchAll(MD_PATH)) {
    const relative = normalize(join(dirname(path), mention))
    if (byPath.has(relative)) targets.add(relative)
    if (byPath.has(normalize(mention))) targets.add(normalize(mention))
  }
  for (const [, id] of text.matchAll(WIKI_LINK)) {
    if (byId.has(id)) targets.add(byId.get(id))
  }

  return targets
}

/**
 * Every knowledge file a reader can still arrive at.
 *
 * Seeds are the files that load on their own — always-on, path-triggered, or
 * named as an entry point in the config — plus anything code cites directly.
 * From there reachability follows the links between knowledge files.
 */
function reachableFrom(seeds, links) {
  const reached = new Set()
  const queue = [...seeds]

  while (queue.length) {
    const path = queue.pop()
    if (reached.has(path)) continue

    reached.add(path)
    for (const target of links.get(path) ?? []) queue.push(target)
  }

  return reached
}

export function knowledgeGraph(root) {
  const config = readConfig(root)
  const { tokens, declarable } = scanTokens(root, config)
  const knowledgeFiles = [...declarable]

  const texts = new Map(
    knowledgeFiles.map((path) => [path, readFileSync(join(root, path), 'utf8')])
  )
  const byPath = new Set(knowledgeFiles)
  const byId = new Map()
  for (const [path, text] of texts) {
    const id = FRONTMATTER_ID.exec(text)
    if (id && !byId.has(id[1])) byId.set(id[1], path)
  }

  const declarations = new Map()
  for (const token of tokens.filter((one) => !one.cites && declarable.has(one.path))) {
    if (!declarations.has(token.slug)) declarations.set(token.slug, token.path)
  }

  const references = new Map(
    [...declarations].map(([slug, path]) => [slug, { declaredIn: path, citedBy: [] }])
  )
  for (const token of tokens.filter((one) => one.cites)) {
    references.get(token.slug)?.citedBy.push(`${token.path}:${token.line}`)
  }

  const links = new Map(
    knowledgeFiles.map((path) => [path, outboundLinks(path, texts.get(path), byPath, byId)])
  )
  for (const token of tokens.filter((one) => one.cites && declarable.has(one.path))) {
    if (declarations.has(token.slug)) links.get(token.path)?.add(declarations.get(token.slug))
  }

  const roots = config.reachability?.roots ?? []
  const seeds = knowledgeFiles.filter(
    (path) => matchesAny(path, roots) || SCOPED_FRONTMATTER.test(texts.get(path))
  )
  for (const token of tokens.filter((one) => one.cites && !declarable.has(one.path))) {
    if (declarations.has(token.slug)) seeds.push(declarations.get(token.slug))
  }

  const reached = reachableFrom(seeds, links)

  return {
    references,
    unreachable: knowledgeFiles
      .filter((path) => !reached.has(path))
      .sort((a, b) => a.localeCompare(b))
  }
}
