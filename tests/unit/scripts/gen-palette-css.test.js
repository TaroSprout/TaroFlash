import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// gen-palette-css.ts writes its output at import time (top-level side effect) —
// mock the write so the test never touches the real committed .gen.css file,
// and capture the emitted content to assert against instead.
const { writeFileSyncMock } = vi.hoisted(() => ({ writeFileSyncMock: vi.fn() }))
vi.mock('node:fs', () => ({
  writeFileSync: writeFileSyncMock,
  default: { writeFileSync: writeFileSyncMock }
}))

// The script resolves its output path via `new URL(..., import.meta.url)` —
// under the test module runner import.meta.url isn't a real file:// URL, so
// stub fileURLToPath to a throwaway path rather than fighting the runner.
vi.mock('node:url', () => ({
  fileURLToPath: vi.fn(() => '/tmp/palettes.gen.css'),
  default: { fileURLToPath: vi.fn(() => '/tmp/palettes.gen.css') }
}))

const PALETTE_NAMES = ['blue', 'red', 'green', 'yellow', 'purple', 'pink', 'orange']

describe('gen-palette-css', () => {
  beforeEach(() => {
    writeFileSyncMock.mockClear()
    vi.resetModules()
  })

  // ── accentText role emitted for every palette, both renditions [obligation]
  // The acceptance criterion is that accent-coloured text is legible for all
  // seven member colours in both light and dark.

  test('emits --color-accent-text for all seven palettes in both renditions [obligation]', async () => {
    await import('../../../scripts/gen-palette-css.ts')

    expect(writeFileSyncMock).toHaveBeenCalledOnce()
    const [, content] = writeFileSyncMock.mock.calls[0]

    const matches = content.match(/--color-accent-text: var\(--color-[\w-]+\);/g) ?? []
    expect(matches).toHaveLength(PALETTE_NAMES.length * 2)
  })

  test('every palette block pairs its accent-text declaration with the accent declaration', async () => {
    await import('../../../scripts/gen-palette-css.ts')

    const [, content] = writeFileSyncMock.mock.calls[0]
    const blocks = content.split('\n\n').filter((b) => b.includes('--color-accent:'))

    for (const block of blocks) {
      expect(block).toContain('--color-accent-text: var(--color-')
    }
  })
})
