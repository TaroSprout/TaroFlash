import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { buildReport, MARKER } from '../../../scripts/knowledge-report.mjs'

// Every test builds its own throwaway head/base roots under os.tmpdir() —
// never assert against the real repo's knowledge files.

const CONFIG = {
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

/** Builds a temp fixture root with the given files, returns its path. */
function makeRoot(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-report-'))
  createdRoots.push(root)

  mkdirSync(join(root, '.claude'), { recursive: true })
  writeFileSync(join(root, '.claude/knowledge-lint.json'), JSON.stringify(CONFIG, null, 2))

  for (const [relPath, content] of Object.entries(files)) {
    const absolute = join(root, relPath)
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, content)
  }

  return root
}

describe('buildReport — silence on no change', () => {
  test('returns the empty string when nothing changed between base and head', () => {
    const files = {
      'CLAUDE.md': '[K:steady-slug] declared once.\n',
      '.claude/rules/foo.md': 'Cites →[K:steady-slug] steadily.\n'
    }
    const head = makeRoot(files)
    const base = makeRoot(files)

    const report = buildReport({ head, base, changed: [] })

    expect(report).toBe('')
  })
})

describe('buildReport — newly-dropped-to-zero citations', () => {
  test('a slug with >=1 citation at base and 0 at head is reported as newly dropped', () => {
    const base = makeRoot({
      'CLAUDE.md': '[K:was-cited] declared here.\n',
      '.claude/rules/foo.md': 'Cites →[K:was-cited] here.\n'
    })
    const head = makeRoot({
      'CLAUDE.md': '[K:was-cited] declared here.\n',
      '.claude/rules/foo.md': 'No longer cites it.\n'
    })

    const report = buildReport({ head, base, changed: [] })

    expect(report).toContain(MARKER)
    expect(report).toContain('Nothing cites these any more')
    expect(report).toContain('[K:was-cited]')
  })

  test('a slug already uncited at base stays silent even though it is still uncited at head', () => {
    const base = makeRoot({
      'CLAUDE.md': '[K:already-zero] declared, never cited.\n'
    })
    const head = makeRoot({
      'CLAUDE.md': '[K:already-zero] declared, never cited.\n'
    })

    const report = buildReport({ head, base, changed: [] })

    expect(report).toBe('')
  })
})

describe('buildReport — newly-unreachable knowledge files', () => {
  test('a knowledge file reachable at base but unreachable at head is reported as newly stranded', () => {
    const base = makeRoot({
      'CLAUDE.md': 'Links to [details](corpus/details.md).\n',
      'corpus/details.md': 'reachable at base\n'
    })
    const head = makeRoot({
      'CLAUDE.md': 'No longer links anywhere.\n',
      'corpus/details.md': 'now unreachable at head\n'
    })

    const report = buildReport({ head, base, changed: [] })

    expect(report).toContain(MARKER)
    expect(report).toContain('Nothing routes a reader to these files any more')
    expect(report).toContain('corpus/details.md')
  })

  test('a knowledge file already unreachable at base stays silent even though still unreachable at head', () => {
    const base = makeRoot({
      'CLAUDE.md': 'never links to the orphan\n',
      'corpus/orphan.md': 'unreachable at base already\n'
    })
    const head = makeRoot({
      'CLAUDE.md': 'still never links to the orphan\n',
      'corpus/orphan.md': 'still unreachable at head\n'
    })

    const report = buildReport({ head, base, changed: [] })

    expect(report).toBe('')
  })
})

describe('buildReport — knowledge cited by changed code', () => {
  test('slugs cited from a changed non-markdown file are listed, sorted, in the cited-code section', () => {
    const head = makeRoot({
      'CLAUDE.md': '[K:z-slug] declared here.\n[K:a-slug] declared here too.\n',
      'src/foo.ts': '// →[K:z-slug] cited from here\n// →[K:a-slug] and here\nconst VALUE = 1\n'
    })

    const report = buildReport({ head, base: undefined, changed: ['src/foo.ts'] })

    expect(report).toContain(MARKER)
    expect(report).toContain('Knowledge this change stands on')
    expect(report.indexOf('a-slug')).toBeLessThan(report.indexOf('z-slug'))
    expect(report).toContain('src/foo.ts:1')
  })

  test('a markdown file in the changed set is not scanned for code citations', () => {
    const head = makeRoot({
      'CLAUDE.md': '[K:doc-slug] declared here.\n→[K:doc-slug] cited in the same file.\n'
    })

    const report = buildReport({ head, base: undefined, changed: ['CLAUDE.md'] })

    expect(report).toBe('')
  })
})
