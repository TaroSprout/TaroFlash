import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { findUncovered } from '../../../scripts/coverage-gate.mjs'

// Every test builds its own throwaway root under os.tmpdir(), with its own
// changed-file listing and coverage summary — never assert against the real
// repo's coverage output, which churns independently of this gate.

const createdRoots = []

afterEach(() => {
  while (createdRoots.length) {
    const root = createdRoots.pop()
    rmSync(root, { recursive: true, force: true })
  }
})

/**
 * Builds a temp fixture root with a changed-file listing + coverage summary, returns its path.
 * `summary` may be a function of the root path, since summary keys are often built from it.
 */
function makeRoot({ changed = [], summary = {}, files = {} }) {
  const root = mkdtempSync(join(tmpdir(), 'coverage-gate-'))
  createdRoots.push(root)

  writeFileSync(join(root, 'changed.txt'), changed.join('\n'))
  writeFileSync(
    join(root, 'coverage-summary.json'),
    JSON.stringify(typeof summary === 'function' ? summary(root) : summary)
  )

  for (const [relPath, content] of Object.entries(files)) {
    const absolute = join(root, relPath)
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, content)
  }

  return root
}

describe('findUncovered', () => {
  test('a changed src file with lines.covered === 0 fails the gate', () => {
    const root = makeRoot({
      changed: ['src/api/decks/db/update.ts'],
      files: { 'src/api/decks/db/update.ts': 'export const x = 1\n' },
      summary: (fixture_root) => ({
        [resolve(fixture_root, 'src/api/decks/db/update.ts')]: { lines: { total: 10, covered: 0 } }
      })
    })

    const uncovered = findUncovered(root, join(root, 'changed.txt'), 'coverage-summary.json')

    expect(uncovered).toEqual([
      expect.stringContaining('src/api/decks/db/update.ts — changed on this branch')
    ])
  })

  test('partial coverage passes — the gate is zero-coverage-only, not a threshold', () => {
    const root = makeRoot({
      changed: ['src/api/decks/db/update.ts'],
      files: { 'src/api/decks/db/update.ts': 'export const x = 1\n' },
      summary: (fixture_root) => ({
        [resolve(fixture_root, 'src/api/decks/db/update.ts')]: { lines: { total: 10, covered: 1 } }
      })
    })

    const uncovered = findUncovered(root, join(root, 'changed.txt'), 'coverage-summary.json')

    expect(uncovered).toEqual([])
  })

  test('a changed file absent from the coverage summary passes', () => {
    const root = makeRoot({
      changed: ['src/utils/card/payload.ts'],
      files: { 'src/utils/card/payload.ts': 'export const x = 1\n' },
      summary: {}
    })

    const uncovered = findUncovered(root, join(root, 'changed.txt'), 'coverage-summary.json')

    expect(uncovered).toEqual([])
  })

  test('a changed file that was deleted is skipped rather than crashing', () => {
    const root = makeRoot({
      changed: ['src/api/decks/db/deleted.ts'],
      files: {},
      summary: (fixture_root) => ({
        [resolve(fixture_root, 'src/api/decks/db/deleted.ts')]: {
          lines: { total: 10, covered: 0 }
        }
      })
    })

    expect(() =>
      findUncovered(root, join(root, 'changed.txt'), 'coverage-summary.json')
    ).not.toThrow()
    expect(findUncovered(root, join(root, 'changed.txt'), 'coverage-summary.json')).toEqual([])
  })

  test('a changed file outside src/**/*.{ts,vue} is ignored', () => {
    const root = makeRoot({
      changed: ['supabase/functions/foo/index.ts', 'src/foo.md'],
      files: {
        'supabase/functions/foo/index.ts': 'export const x = 1\n',
        'src/foo.md': '# notes\n'
      },
      summary: (fixture_root) => ({
        [resolve(fixture_root, 'supabase/functions/foo/index.ts')]: {
          lines: { total: 10, covered: 0 }
        },
        [resolve(fixture_root, 'src/foo.md')]: { lines: { total: 10, covered: 0 } }
      })
    })

    const uncovered = findUncovered(root, join(root, 'changed.txt'), 'coverage-summary.json')

    expect(uncovered).toEqual([])
  })

  test('suffix matching resolves the summary absolute keys against repo-relative diff paths', () => {
    const root = makeRoot({
      changed: ['src/api/decks/db/update.ts'],
      files: { 'src/api/decks/db/update.ts': 'export const x = 1\n' },
      // Summary key is absolute from a different machine (a CI runner's own
      // checkout path), never equal to `root`'s own resolve() — only the
      // suffix match can bridge it.
      summary: {
        '/home/runner/work/taroflash/taroflash/src/api/decks/db/update.ts': {
          lines: { total: 10, covered: 0 }
        }
      }
    })

    const uncovered = findUncovered(root, join(root, 'changed.txt'), 'coverage-summary.json')

    expect(uncovered).toEqual([
      expect.stringContaining('src/api/decks/db/update.ts — changed on this branch')
    ])
  })
})
