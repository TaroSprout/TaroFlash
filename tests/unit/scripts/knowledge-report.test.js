import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { buildReport, parseDiff, MARKER } from '../../../scripts/knowledge-report.mjs'

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
    exempt: ['supabase/migrations/**', 'tests/unit/scripts/**']
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

/** `path -> Set(lines)` shorthand so fixtures read as data, not Map-building boilerplate. */
function touching(spec) {
  return new Map(Object.entries(spec).map(([path, lines]) => [path, new Set(lines)]))
}

describe('buildReport — silence on no change', () => {
  test('returns the empty string when nothing is touched', () => {
    const files = {
      'corpus/topic.md': '## The sync stays optimistic [K:steady-slug]\n',
      'src/foo.ts': '// →[K:steady-slug] cited here\nconst VALUE = 1\n'
    }
    const head = makeRoot(files)
    const base = makeRoot(files)

    const report = buildReport({ head, base, touched: touching({}) })

    expect(report).toBe('')
  })
})

describe('buildReport — Facts your changes sit on', () => {
  test('a citation on a touched line appears; the same file on an untouched line does not', () => {
    const head = makeRoot({
      'corpus/topic.md':
        '## The sync stays optimistic [K:fact-one]\n\n## The cache expires in five minutes [K:fact-two]\n',
      'src/foo.ts':
        '// →[K:fact-one] cited on line 1\n// →[K:fact-two] cited on line 2, never touched\nconst VALUE = 1\n'
    })

    const report = buildReport({ head, base: undefined, touched: touching({ 'src/foo.ts': [1] }) })

    expect(report).toContain(MARKER)
    expect(report).toContain('#### Facts your changes sit on')
    expect(report).toContain('The sync stays optimistic.')
    expect(report).not.toContain('The cache expires in five minutes.')
    expect(report).toContain('foo.ts:1')
  })

  test('markdown files are never scanned for citations, even on a touched line', () => {
    const files = {
      'corpus/topic.md':
        '## The sync stays optimistic [K:doc-slug]\n\n→[K:doc-slug] cited in the same file.\n'
    }
    const head = makeRoot(files)
    const base = makeRoot(files)

    const report = buildReport({
      head,
      base,
      touched: touching({ 'corpus/topic.md': [3] })
    })

    expect(report).toBe('')
  })

  test('a file matching slugs.exempt is never scanned, even on a touched line', () => {
    const files = {
      'corpus/topic.md': '## The sync stays optimistic [K:fixture-slug]\n',
      'tests/unit/scripts/foo.test.js': '// →[K:fixture-slug] a fixture citation, not a real one\n'
    }
    const head = makeRoot(files)
    const base = makeRoot(files)

    const report = buildReport({
      head,
      base,
      touched: touching({ 'tests/unit/scripts/foo.test.js': [1] })
    })

    expect(report).toBe('')
  })

  test('collapses multiple touched sites for one slug onto a single entry', () => {
    const head = makeRoot({
      'corpus/topic.md': '## The sync stays optimistic [K:shared-slug]\n',
      'src/foo.ts': '// →[K:shared-slug] cited here\nconst VALUE = 1\n',
      'src/bar.ts': '// →[K:shared-slug] cited here too\nconst VALUE = 2\n'
    })

    const report = buildReport({
      head,
      base: undefined,
      touched: touching({ 'src/foo.ts': [1], 'src/bar.ts': [1] })
    })

    expect(report.match(/The sync stays optimistic\./g)).toHaveLength(1)
    expect(report).toContain('foo.ts:1')
    expect(report).toContain('bar.ts:1')
  })
})

describe('buildReport — Knowledge you changed', () => {
  test('fires when the declaration block was edited and the citing file was untouched', () => {
    const head = makeRoot({
      'corpus/topic.md': '## The sync stays optimistic [K:changed-fact]\n\nSome detail line.\n',
      'src/bar.ts': '// →[K:changed-fact] cited here\nconst VALUE = 1\n'
    })

    const report = buildReport({
      head,
      base: undefined,
      touched: touching({ 'corpus/topic.md': [1] })
    })

    expect(report).toContain(MARKER)
    expect(report).toContain('#### Knowledge you changed')
    expect(report).toContain('The sync stays optimistic.')
    expect(report).toContain('bar.ts:1')
  })

  test('stays silent when every citing site was also touched', () => {
    // Touch bar.ts's second line, not the citation line itself, so the
    // citation doesn't also qualify for "Facts your changes sit on".
    const files = {
      'corpus/topic.md': '## The sync stays optimistic [K:changed-fact]\n\nSome detail line.\n',
      'src/bar.ts': '// →[K:changed-fact] cited here\nconst VALUE = 1\n'
    }
    const head = makeRoot(files)
    const base = makeRoot(files)

    const report = buildReport({
      head,
      base,
      touched: touching({ 'corpus/topic.md': [1], 'src/bar.ts': [2] })
    })

    expect(report).toBe('')
  })

  test('stays silent when the edit landed under a different heading, outside the declaration block', () => {
    const head = makeRoot({
      'corpus/topic.md':
        '## The sync stays optimistic [K:changed-fact]\n\nSome detail line.\n\n## Unrelated heading\n\nEdited under here, not under the declaration.\n',
      'src/bar.ts': '// →[K:changed-fact] cited here\nconst VALUE = 1\n'
    })

    const report = buildReport({
      head,
      base: undefined,
      touched: touching({ 'corpus/topic.md': [7] })
    })

    expect(report).toBe('')
  })

  test('stays silent when the only citations are from markdown', () => {
    const head = makeRoot({
      'corpus/topic.md': '## The sync stays optimistic [K:changed-fact]\n\nSome detail line.\n',
      '.claude/rules/other.md': 'Cites →[K:changed-fact] here.\n'
    })

    const report = buildReport({
      head,
      base: undefined,
      touched: touching({ 'corpus/topic.md': [1] })
    })

    expect(report).toBe('')
  })
})

describe('buildReport — Housekeeping', () => {
  test('a slug with >=1 citation at base and 0 at head is reported as newly dropped', () => {
    const base = makeRoot({
      'corpus/topic.md': '## Was cited [K:was-cited]\n',
      '.claude/rules/foo.md': 'Cites →[K:was-cited] here.\n'
    })
    const head = makeRoot({
      'corpus/topic.md': '## Was cited [K:was-cited]\n',
      '.claude/rules/foo.md': 'No longer cites it.\n'
    })

    const report = buildReport({ head, base, touched: touching({}) })

    expect(report).toContain(MARKER)
    expect(report).toContain('#### Housekeeping')
    expect(report).toContain('Nothing cites `was-cited` any more.')
  })

  test('a slug already uncited at base stays silent even though it is still uncited at head', () => {
    const base = makeRoot({ 'corpus/topic.md': '## Never cited [K:already-zero]\n' })
    const head = makeRoot({ 'corpus/topic.md': '## Never cited [K:already-zero]\n' })

    const report = buildReport({ head, base, touched: touching({}) })

    expect(report).toBe('')
  })

  test('a knowledge file reachable at base but unreachable at head is reported as newly stranded', () => {
    const base = makeRoot({
      'CLAUDE.md': 'Links to [details](corpus/details.md).\n',
      'corpus/details.md': 'reachable at base\n'
    })
    const head = makeRoot({
      'CLAUDE.md': 'No longer links anywhere.\n',
      'corpus/details.md': 'now unreachable at head\n'
    })

    const report = buildReport({ head, base, touched: touching({}) })

    expect(report).toContain(MARKER)
    expect(report).toContain('Nothing routes a reader to `corpus/details.md`.')
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

    const report = buildReport({ head, base, touched: touching({}) })

    expect(report).toBe('')
  })
})

describe('buildReport — statement fallback and links', () => {
  test('falls back to the slug when the declaration has no statement', () => {
    const head = makeRoot({
      'corpus/topic.md':
        'A slug declared mid-paragraph [K:no-statement] with no heading or callout.\n',
      'src/foo.ts': '// →[K:no-statement] cited here\nconst VALUE = 1\n'
    })

    const report = buildReport({ head, base: undefined, touched: touching({ 'src/foo.ts': [1] }) })

    expect(report).toContain('`no-statement` — no statement on its declaration.')
  })

  test('links to github when repo and sha are given, falls back to relative hrefs otherwise', () => {
    const files = {
      'corpus/topic.md': '## The sync stays optimistic [K:linked-slug]\n',
      'src/foo.ts': '// →[K:linked-slug] cited here\nconst VALUE = 1\n'
    }
    const withRepo = makeRoot(files)
    const withoutRepo = makeRoot(files)

    const reportWithRepo = buildReport({
      head: withRepo,
      base: undefined,
      touched: touching({ 'src/foo.ts': [1] }),
      repo: 'org/project',
      sha: 'deadbeef'
    })
    const reportWithoutRepo = buildReport({
      head: withoutRepo,
      base: undefined,
      touched: touching({ 'src/foo.ts': [1] })
    })

    expect(reportWithRepo).toContain(
      'https://github.com/org/project/blob/deadbeef/corpus/topic.md#L1'
    )
    expect(reportWithoutRepo).toContain('corpus/topic.md#L1')
    expect(reportWithoutRepo).not.toContain('github.com')
  })
})

describe('parseDiff', () => {
  test('maps multi-hunk, single-line-hunk, and skipped /dev/null targets', () => {
    const diff = [
      'diff --git a/src/foo.ts b/src/foo.ts',
      'index abc..def 100644',
      '--- a/src/foo.ts',
      '+++ b/src/foo.ts',
      '@@ -10,0 +11,2 @@',
      '+new line 11',
      '+new line 12',
      '@@ -20 +23 @@',
      '-old',
      '+new',
      'diff --git a/src/bar.ts b/src/bar.ts',
      'new file mode 100644',
      'index 000..abc',
      '--- /dev/null',
      '+++ b/src/bar.ts',
      '@@ -0,0 +1 @@',
      '+content',
      'diff --git a/src/baz.ts b/src/baz.ts',
      'deleted file mode 100644',
      'index abc..000',
      '--- a/src/baz.ts',
      '+++ /dev/null',
      '@@ -1,3 +0,0 @@',
      '-x',
      '-y',
      '-z',
      ''
    ].join('\n')

    const touched = parseDiff(diff)

    expect(touched.get('src/foo.ts')).toEqual(new Set([11, 12, 23]))
    expect(touched.get('src/bar.ts')).toEqual(new Set([1]))
    expect(touched.has('src/baz.ts')).toBe(false)
  })
})
