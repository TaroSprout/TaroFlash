import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, test, expect, vi, beforeAll } from 'vite-plus/test'

// gen-motion-css.ts writes its output at import time (top-level side effect) —
// stub only writeFileSync so the real generator still runs (and gets coverage
// credit) without touching the committed .gen.css file, and capture the
// emitted content to compare against what's actually committed. Re-implementing
// the emitter here instead would pass even when the committed file has drifted
// from src/utils/motion/vocabulary.ts, which is the exact regression this
// suite exists to catch.
const { writeFileSyncMock } = vi.hoisted(() => ({ writeFileSyncMock: vi.fn() }))
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    writeFileSync: writeFileSyncMock,
    default: { ...actual.default, writeFileSync: writeFileSyncMock }
  }
})

// The script resolves its output path via `new URL(..., import.meta.url)` —
// under the test module runner import.meta.url isn't a real file:// URL, so
// stub fileURLToPath to a throwaway path rather than fighting the runner.
vi.mock('node:url', async (importOriginal) => {
  const actual = await importOriginal()
  const fileURLToPathMock = vi.fn(() => '/tmp/motion.gen.css')
  return {
    ...actual,
    fileURLToPath: fileURLToPathMock,
    default: { ...actual.default, fileURLToPath: fileURLToPathMock }
  }
})

const COMMITTED_PATH = resolve(process.cwd(), 'src/styles/motion.gen.css')

let regenerated

describe('gen-motion-css', () => {
  beforeAll(async () => {
    await import('../../../scripts/gen-motion-css.ts')

    expect(writeFileSyncMock).toHaveBeenCalledOnce()
    regenerated = writeFileSyncMock.mock.calls[0][1]
  })

  test('committed motion.gen.css matches what the generator produces from the vocabulary', () => {
    const committed = readFileSync(COMMITTED_PATH, 'utf-8')

    expect(regenerated).toBe(committed)
  })

  test('emits a --ease-* custom property for every named easing', () => {
    const easings = ['out', 'out-strong', 'in', 'in-out', 'spring', 'spring-strong']

    for (const name of easings) {
      expect(regenerated).toMatch(new RegExp(`--ease-${name}: cubic-bezier\\([^)]+\\);`))
    }
  })

  test('emits a --duration-* custom property in ms for every named duration', () => {
    const durations = [0, 100, 150, 200, 300, 500]

    for (const ms of durations) {
      expect(regenerated).toContain(`--duration-${ms}: ${ms}ms;`)
    }
  })

  test('emits a :root --travel-*px custom property for every travel step', () => {
    const steps = [8, 16, 24, 48, 96]
    const rootBlock = regenerated.slice(regenerated.indexOf(':root'))

    for (const px of steps) {
      expect(rootBlock).toContain(`--travel-${px}: ${px}px;`)
    }
  })
})
