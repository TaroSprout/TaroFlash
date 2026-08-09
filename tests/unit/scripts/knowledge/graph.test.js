import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { knowledgeGraph } from '../../../../scripts/knowledge/graph.mjs'

// Every test builds its own throwaway root under os.tmpdir() with its own
// .claude/knowledge-lint.json — never assert against the real repo's
// knowledge files, which churn independently of this graph.

const DEFAULT_CONFIG = {
  always_on: {
    include: ['CLAUDE.md', '.claude/rules/*.md'],
    line_caps: { enforced: false, total: 250, per_file: { 'CLAUDE.md': 80 } }
  },
  reachability: {
    roots: ['CLAUDE.md', '.claude/rules/*.md', 'corpus/map.md']
  },
  slugs: {
    retired_ledger: '.claude/knowledge/retired-slugs.md',
    declare_in: ['CLAUDE.md', 'AGENTS.md', '.claude/**/*.md', 'corpus/**/*.md'],
    cite_in: [
      'CLAUDE.md',
      'AGENTS.md',
      '.claude/**/*.md',
      'corpus/**/*.md',
      'src/**/*.{ts,js,vue}',
      'tests/**/*.{ts,js,vue}',
      'scripts/**/*.{ts,js,mjs}',
      'supabase/**/*.{sql,ts}',
      '.github/**/*.yml'
    ],
    exempt: ['supabase/migrations/**']
  }
}

const createdRoots = []

afterEach(() => {
  while (createdRoots.length) {
    const root = createdRoots.pop()
    rmSync(root, { recursive: true, force: true })
  }
})

/** Builds a temp fixture root with the given config + files, returns its path. */
function makeRoot(files = {}, configOverrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-graph-'))
  createdRoots.push(root)

  const config = { ...DEFAULT_CONFIG, ...configOverrides }
  mkdirSync(join(root, '.claude'), { recursive: true })
  writeFileSync(join(root, '.claude/knowledge-lint.json'), JSON.stringify(config, null, 2))

  for (const [relPath, content] of Object.entries(files)) {
    const absolute = join(root, relPath)
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, content)
  }

  return root
}

describe('knowledgeGraph — inbound citations', () => {
  test('a declared slug with no citation has an empty citedBy list', () => {
    const root = makeRoot({
      'CLAUDE.md': '[K:lonely-slug] declared but never cited.\n'
    })

    const { references } = knowledgeGraph(root)

    expect(references.get('lonely-slug')).toEqual({ declaredIn: 'CLAUDE.md', citedBy: [] })
  })

  test('every citation of a slug is recorded, from knowledge files and from code', () => {
    const root = makeRoot({
      'CLAUDE.md': '[K:shared-slug] declared here.\n',
      '.claude/rules/foo.md': 'Cites it: →[K:shared-slug].\n',
      'src/foo.ts': '// →[K:shared-slug] respected here too\n'
    })

    const { references } = knowledgeGraph(root)

    expect(references.get('shared-slug').citedBy).toEqual([
      '.claude/rules/foo.md:1',
      'src/foo.ts:1'
    ])
  })
})

describe('knowledgeGraph — reachability', () => {
  test('a root file (matching reachability.roots) is reachable on its own', () => {
    const root = makeRoot({
      'CLAUDE.md': 'plain always-on file\n'
    })

    const { unreachable } = knowledgeGraph(root)

    expect(unreachable).not.toContain('CLAUDE.md')
  })

  test('a file carrying `paths:` frontmatter is reachable even outside the roots list', () => {
    const root = makeRoot({
      '.claude/rules/scoped-only.md': '---\npaths:\n  - src/**\n---\nscoped content\n'
    })

    const { unreachable } = knowledgeGraph(root)

    expect(unreachable).not.toContain('.claude/rules/scoped-only.md')
  })

  test('a file linked by a relative .md path from a reachable file is reachable', () => {
    const root = makeRoot({
      'CLAUDE.md': 'See [details](corpus/details.md) for more.\n',
      'corpus/details.md': 'the linked-to content\n'
    })

    const { unreachable } = knowledgeGraph(root)

    expect(unreachable).not.toContain('corpus/details.md')
  })

  test('a file linked by a [[id]] wiki-link from a reachable file is reachable', () => {
    const root = makeRoot({
      'CLAUDE.md': 'See [[member-streaks]] for the domain rule.\n',
      'corpus/streaks.md': '---\nid: member-streaks\n---\n# Streaks\n'
    })

    const { unreachable } = knowledgeGraph(root)

    expect(unreachable).not.toContain('corpus/streaks.md')
  })

  test('a knowledge file whose only inbound pointer is a slug cited from code is reachable', () => {
    const root = makeRoot({
      'corpus/orphan.md': '[K:code-only-slug] declared here, never linked from another topic.\n',
      'src/foo.ts': '// →[K:code-only-slug] cited from real code\n'
    })

    const { unreachable } = knowledgeGraph(root)

    expect(unreachable).not.toContain('corpus/orphan.md')
  })

  test('a knowledge file with no root match, no inbound link, and no code citation is unreachable', () => {
    const root = makeRoot({
      'CLAUDE.md': 'plain root file, does not mention the orphan\n',
      'corpus/truly-orphaned.md': 'nothing points here\n'
    })

    const { unreachable } = knowledgeGraph(root)

    expect(unreachable).toContain('corpus/truly-orphaned.md')
  })

  test('a slug cited only from another knowledge file (not code) does not grant reachability by itself', () => {
    const root = makeRoot({
      'corpus/isolated.md': '[K:isolated-slug] declared on an unreachable topic.\n',
      'corpus/also-isolated.md': 'Cites →[K:isolated-slug] from another unreachable topic.\n'
    })

    const { unreachable } = knowledgeGraph(root)

    expect(unreachable).toContain('corpus/isolated.md')
  })
})
