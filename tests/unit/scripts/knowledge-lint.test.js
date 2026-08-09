import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { lintKnowledge } from '../../../scripts/knowledge-lint.mjs'

// Every test builds its own throwaway root under os.tmpdir() with its own
// .claude/knowledge-lint.json — never assert against the real repo's
// knowledge files, which churn independently of this lint spine.

const DEFAULT_CONFIG = {
  always_on: {
    include: ['CLAUDE.md', '.claude/rules/*.md'],
    line_caps: {
      enforced: false,
      total: 250,
      per_file: { 'CLAUDE.md': 80 }
    }
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
  const root = mkdtempSync(join(tmpdir(), 'knowledge-lint-'))
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

describe('lintKnowledge — citations', () => {
  test('a citation naming a slug with no bare declaration is an error', () => {
    const root = makeRoot({
      '.claude/rules/foo.md': 'See →[K:missing-slug] for details.\n'
    })

    const { errors } = lintKnowledge(root)

    expect(errors).toEqual([expect.stringContaining('.claude/rules/foo.md:1')])
    expect(errors[0]).toMatch(/missing-slug/)
    expect(errors[0]).toMatch(/resolves to no declaration/)
  })

  test('a citation whose slug is declared is not an error', () => {
    const root = makeRoot({
      '.claude/rules/foo.md': '[K:my-slug] declares the concept.\n',
      '.claude/rules/bar.md': 'Cite it: →[K:my-slug].\n'
    })

    const { errors, stats } = lintKnowledge(root)

    expect(errors).toEqual([])
    expect(stats.declared).toBe(1)
    expect(stats.citations).toBe(1)
  })

  test('a citation inside supabase/migrations/** is exempt even when unresolvable', () => {
    const root = makeRoot({
      'supabase/migrations/00001_init.sql': '-- →[K:never-declared] append-only note\n'
    })

    const { errors } = lintKnowledge(root)

    expect(errors).toEqual([])
  })
})

describe('lintKnowledge — declarations', () => {
  test('the same slug declared in two knowledge files errors naming both sites', () => {
    const root = makeRoot({
      '.claude/rules/a.md': '[K:dup-slug] first declaration.\n',
      '.claude/rules/b.md': '[K:dup-slug] second declaration.\n'
    })

    const { errors } = lintKnowledge(root)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('a.md:1')
    expect(errors[0]).toContain('b.md:1')
  })

  test('a bare declaration outside slugs.declare_in globs errors as declared outside a knowledge file', () => {
    const root = makeRoot({
      'src/foo.ts': 'const x = 1 // [K:stray-slug]\n'
    })

    const { errors } = lintKnowledge(root)

    expect(errors).toEqual([expect.stringContaining('declared outside a knowledge file')])
    expect(errors[0]).toContain('src/foo.ts:1')
  })

  test('a non-kebab-case slug errors', () => {
    const root = makeRoot({
      '.claude/rules/foo.md': '[K:Not_Kebab] declared here.\n'
    })

    const { errors } = lintKnowledge(root)

    expect(errors).toEqual([expect.stringContaining('is not a kebab-case slug')])
  })

  test('brace-alternation and ** globs both resolve nested extensions', () => {
    const root = makeRoot({
      'src/deep/nested/path/thing.js': '// [K:nested-stray]\n',
      'src/top.ts': '// [K:top-stray]\n'
    })

    const { errors } = lintKnowledge(root)

    expect(errors).toHaveLength(2)
    expect(errors.some((error) => error.includes('src/deep/nested/path/thing.js:1'))).toBe(true)
    expect(errors.some((error) => error.includes('src/top.ts:1'))).toBe(true)
  })
})

describe('lintKnowledge — retired-slug ledger', () => {
  test('a slug in the retired ledger may never be re-declared', () => {
    const root = makeRoot({
      '.claude/knowledge/retired-slugs.md': '- [K:old-slug] — replaced by new-thing\n',
      '.claude/rules/foo.md': '[K:old-slug] redeclared after retirement.\n'
    })

    const { errors } = lintKnowledge(root)

    expect(errors).toEqual([expect.stringContaining('is retired')])
    expect(errors[0]).toContain('old-slug')
  })

  test('citing a retired slug errors as retired rather than as unresolved', () => {
    const root = makeRoot({
      '.claude/knowledge/retired-slugs.md': '- [K:old-slug] — replaced by new-thing\n',
      '.claude/rules/foo.md': 'Still points at →[K:old-slug] somehow.\n'
    })

    const { errors } = lintKnowledge(root)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/retired/)
    expect(errors[0]).not.toMatch(/resolves to no declaration/)
  })

  test('a malformed ledger entry with no epitaph is an error', () => {
    const root = makeRoot({
      '.claude/knowledge/retired-slugs.md': '- [K:bad-entry]\n'
    })

    const { errors } = lintKnowledge(root)

    expect(errors).toEqual([expect.stringContaining('.claude/knowledge/retired-slugs.md:1')])
    expect(errors[0]).toMatch(/epitaph/)
  })

  test('the ledger file itself is excluded from token scanning', () => {
    const root = makeRoot({
      '.claude/knowledge/retired-slugs.md': '- [K:excluded-slug] — reason it retired\n',
      '.claude/rules/foo.md': 'Cite →[K:excluded-slug] once more.\n'
    })

    const { errors, stats } = lintKnowledge(root)

    // Ledger entries never count as declarations, so the citation resolves
    // via the retired-slug path, not the "already declared" or clean-resolve path.
    expect(stats.declared).toBe(0)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/retired/)
  })

  test('a root with no retired-ledger file lints cleanly', () => {
    const root = makeRoot({
      '.claude/rules/foo.md': '[K:some-slug] declared normally.\n'
    })

    const { errors, stats } = lintKnowledge(root)

    expect(errors).toEqual([])
    expect(stats.retired).toBe(0)
  })
})

describe('lintKnowledge — always-on line accounting', () => {
  test('a scoped rule file (paths: frontmatter) is excluded from the always-on total', () => {
    const root = makeRoot({
      'CLAUDE.md': 'line one\nline two\nline three\n',
      '.claude/rules/scoped.md': [
        '---',
        'paths: src/**',
        '---',
        'this content should not count',
        'toward the always-on total',
        'because it is path-triggered'
      ].join('\n')
    })

    const { stats } = lintKnowledge(root)

    expect(stats.alwaysOnLines).toBe(3)
  })

  test('an unscoped always-on file is included in the total', () => {
    const root = makeRoot({
      'CLAUDE.md': 'line one\nline two\n',
      '.claude/rules/plain.md': 'rule line one\nrule line two\nrule line three\n'
    })

    const { stats } = lintKnowledge(root)

    expect(stats.alwaysOnLines).toBe(5)
  })
})

describe('lintKnowledge — line caps', () => {
  test('line-cap breaches land in warnings, not errors, when enforced is false', () => {
    const root = makeRoot(
      { 'CLAUDE.md': 'one\ntwo\nthree\nfour\nfive\n' },
      {
        always_on: {
          include: ['CLAUDE.md'],
          line_caps: { enforced: false, total: 2, per_file: { 'CLAUDE.md': 2 } }
        }
      }
    )

    const { errors, warnings } = lintKnowledge(root)

    expect(errors).toEqual([])
    expect(warnings).toHaveLength(2)
    expect(warnings.some((warning) => warning.includes('CLAUDE.md is 5 lines'))).toBe(true)
    expect(warnings.some((warning) => warning.includes('always-on payload is 5 lines'))).toBe(true)
  })

  test('the same line-cap breaches land in errors, not warnings, when enforced is true', () => {
    const root = makeRoot(
      { 'CLAUDE.md': 'one\ntwo\nthree\nfour\nfive\n' },
      {
        always_on: {
          include: ['CLAUDE.md'],
          line_caps: { enforced: true, total: 2, per_file: { 'CLAUDE.md': 2 } }
        }
      }
    )

    const { errors, warnings } = lintKnowledge(root)

    expect(warnings).toEqual([])
    expect(errors).toHaveLength(2)
    expect(errors.some((error) => error.includes('CLAUDE.md is 5 lines'))).toBe(true)
    expect(errors.some((error) => error.includes('always-on payload is 5 lines'))).toBe(true)
  })

  test('a root with no docs/ directory still lints cleanly', () => {
    const root = makeRoot({
      'CLAUDE.md': 'a fine, unremarkable file\n'
    })

    const { errors, warnings, stats } = lintKnowledge(root)

    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(stats.declared).toBe(0)
    expect(stats.citations).toBe(0)
  })
})
