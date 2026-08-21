import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import {
  statementAt,
  corpusDeclarations,
  isCorpusTopic
} from '../../../../scripts/knowledge/scan.mjs'

// Every test builds its own throwaway root under os.tmpdir() with its own
// .claude/knowledge-lint.json — never assert against the real repo's
// knowledge files.

const DEFAULT_CONFIG = {
  slugs: {
    declare_in: ['CLAUDE.md', 'AGENTS.md', '.claude/**/*.md', 'corpus/**/*.md'],
    cite_in: [
      'CLAUDE.md',
      'AGENTS.md',
      '.claude/**/*.md',
      'corpus/**/*.md',
      'src/**/*.{ts,js,vue}',
      'scripts/**/*.{ts,js,mjs}'
    ],
    exempt: []
  }
}

const createdRoots = []

afterEach(() => {
  while (createdRoots.length) {
    const root = createdRoots.pop()
    rmSync(root, { recursive: true, force: true })
  }
})

function makeRoot(files = {}, configOverrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'knowledge-scan-'))
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

describe('statementAt — heading shape', () => {
  test('takes the heading text as the statement', () => {
    const rows = ['## The sync stays optimistic [K:deck-sync]']

    expect(statementAt(rows, 0)).toBe('The sync stays optimistic.')
  })

  test('adds a terminal period when the heading has none', () => {
    const rows = ['### The queue drains in order [K:queue-order]']

    expect(statementAt(rows, 0)).toBe('The queue drains in order.')
  })
})

describe('statementAt — callout shape', () => {
  test('takes the lead sentence of a single-line callout, with bold stripped', () => {
    const rows = ['> [!HAZARD] [K:hazard-slug] **Never mutate the shared cache.**']

    expect(statementAt(rows, 0)).toBe('Never mutate the shared cache.')
  })

  test('reads a multi-line callout to the end of its contiguous quote block', () => {
    const rows = [
      '> [!HAZARD] [K:hazard-slug] **Never mutate the shared cache.**',
      '> Doing so corrupts state for every reader.',
      '> This is the third line of context.',
      ''
    ]

    expect(statementAt(rows, 0)).toBe(
      'Never mutate the shared cache. Doing so corrupts state for every reader. This is the third line of context.'
    )
  })

  test('stops the block at the first non-quoted line', () => {
    const rows = [
      '> [!HAZARD] [K:hazard-slug] **Never mutate the shared cache.**',
      '> Doing so corrupts state for every reader.',
      '',
      '> Not part of the same callout block.'
    ]

    expect(statementAt(rows, 0)).toBe(
      'Never mutate the shared cache. Doing so corrupts state for every reader.'
    )
  })

  test('splits correctly when every sentence in the block is individually bold-wrapped', () => {
    const rows = [
      '> [!HAZARD] [K:hazard-slug] **Do not skip validation.** **Cache the result for two minutes.**'
    ]

    expect(statementAt(rows, 0)).toBe('Do not skip validation. Cache the result for two minutes.')
  })

  test('takes whole sentences up to the 30-word budget, cutting at a sentence boundary', () => {
    const sentence = (n) =>
      `Word${n}a word${n}b word${n}c word${n}d word${n}e word${n}f word${n}g word${n}h word${n}i word${n}j.`
    const rows = [
      `> [!HAZARD] [K:hazard-slug] ${sentence(1)}`,
      `> ${sentence(2)}`,
      `> ${sentence(3)}`,
      `> ${sentence(4)}`
    ]

    const statement = statementAt(rows, 0)

    expect(statement).toContain(sentence(1))
    expect(statement).toContain(sentence(2))
    expect(statement).toContain(sentence(3))
    expect(statement).not.toContain(sentence(4))
    expect(statement.split(/\s+/).length).toBeLessThanOrEqual(30)
  })

  test('keeps at least one sentence even when it alone outgrows the budget', () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ')
    const rows = [`> [!HAZARD] [K:hazard-slug] ${words}.`]

    const statement = statementAt(rows, 0)

    expect(statement).toBe(`${words}.`)
    expect(statement.split(/\s+/).length).toBeGreaterThan(30)
  })
})

describe('statementAt — no statement', () => {
  test('returns null when the slug is declared mid-paragraph', () => {
    const rows = ['This paragraph mentions [K:mid-slug] mid-sentence, not as a heading or callout.']

    expect(statementAt(rows, 0)).toBeNull()
  })
})

describe('isCorpusTopic', () => {
  test('a corpus file matching declare_in is a topic', () => {
    expect(isCorpusTopic('corpus/decks.md', DEFAULT_CONFIG)).toBe(true)
  })

  test('corpus/hazards.md is never a topic', () => {
    expect(isCorpusTopic('corpus/hazards.md', DEFAULT_CONFIG)).toBe(false)
  })

  test('a file outside corpus/ is never a topic, even when it declares slugs', () => {
    expect(isCorpusTopic('CLAUDE.md', DEFAULT_CONFIG)).toBe(false)
  })
})

describe('corpusDeclarations', () => {
  test('collects every declared slug under corpus/, with its statement, excluding hazards.md', () => {
    const root = makeRoot({
      'corpus/decks.md':
        '## The sync stays optimistic [K:deck-sync]\n\n> [!HAZARD] [K:deck-hazard] **Never mutate the shared cache.**\n',
      'corpus/hazards.md': '## Roll call [K:should-not-appear]\n',
      'CLAUDE.md': '## Not a corpus topic [K:not-corpus]\n'
    })

    const declarations = corpusDeclarations(root, DEFAULT_CONFIG)

    expect([...declarations.keys()]).toEqual(['deck-sync', 'deck-hazard'])
    expect(declarations.get('deck-sync')).toMatchObject({
      slug: 'deck-sync',
      path: 'corpus/decks.md',
      line: 1,
      statement: 'The sync stays optimistic.'
    })
    expect(declarations.get('deck-hazard').statement).toBe('Never mutate the shared cache.')
    expect(declarations.has('should-not-appear')).toBe(false)
    expect(declarations.has('not-corpus')).toBe(false)
  })

  test('a mid-paragraph declaration is included with a null statement', () => {
    const root = makeRoot({
      'corpus/decks.md': 'A fact mentions [K:mid-slug] mid-sentence.\n'
    })

    const declarations = corpusDeclarations(root, DEFAULT_CONFIG)

    expect(declarations.get('mid-slug').statement).toBeNull()
  })
})
