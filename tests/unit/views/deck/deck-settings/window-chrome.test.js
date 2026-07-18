import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockEmitSfx,
  mockTuckPreview,
  mockUntuckPreview,
  mockSnapPreview,
  mockRetract,
  mockRestore,
  mockSnapAside
} = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockTuckPreview: vi.fn((_el, onEdgeOn) => {
    onEdgeOn()
    return Promise.resolve()
  }),
  mockUntuckPreview: vi.fn((_el, onEdgeOn) => {
    onEdgeOn()
    return Promise.resolve()
  }),
  mockSnapPreview: vi.fn(),
  mockRetract: vi.fn(() => Promise.resolve()),
  mockRestore: vi.fn(() => Promise.resolve()),
  mockSnapAside: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/utils/animations/preview-tuck', () => ({
  tuckPinnedPreview: mockTuckPreview,
  untuckPinnedPreview: mockUntuckPreview,
  snapPinnedPreview: mockSnapPreview
}))

vi.mock('@/utils/animations/aside-retract', () => ({
  retractAside: mockRetract,
  restoreAside: mockRestore,
  snapAside: mockSnapAside
}))

import { useWindowChrome } from '@/views/deck/deck-settings/window-chrome'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChrome() {
  const preview = ref(document.createElement('div'))
  const aside = ref(document.createElement('div'))
  return { preview, aside, chrome: useWindowChrome(preview, aside) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTuckPreview.mockImplementation((_el, onEdgeOn) => {
    onEdgeOn()
    return Promise.resolve()
  })
  mockUntuckPreview.mockImplementation((_el, onEdgeOn) => {
    onEdgeOn()
    return Promise.resolve()
  })
})

// ── is_tucked flips at the onEdgeOn midpoint [obligation] ─────────────────────

describe('useWindowChrome — is_tucked flips at the animation midpoint, not on promise resolution', () => {
  test('tuck(): is_tucked flips true exactly when onEdgeOn fires, before the tween promise resolves', async () => {
    let edgeCb
    let resolveAnim
    mockTuckPreview.mockImplementation((_el, onEdgeOn) => {
      edgeCb = onEdgeOn
      return new Promise((resolve) => {
        resolveAnim = resolve
      })
    })
    const { chrome } = makeChrome()

    const tuckPromise = chrome.tuck()
    expect(chrome.is_tucked.value).toBe(false)

    edgeCb()
    expect(chrome.is_tucked.value).toBe(true)

    resolveAnim()
    await tuckPromise
    expect(chrome.is_tucked.value).toBe(true)
  })

  test('restore(): is_tucked flips false exactly when onEdgeOn fires, before the tween promise resolves', async () => {
    const { chrome } = makeChrome()
    await chrome.tuck()
    expect(chrome.is_tucked.value).toBe(true)

    let edgeCb
    let resolveAnim
    mockUntuckPreview.mockImplementation((_el, onEdgeOn) => {
      edgeCb = onEdgeOn
      return new Promise((resolve) => {
        resolveAnim = resolve
      })
    })

    const restorePromise = chrome.restore()
    expect(chrome.is_tucked.value).toBe(true)

    edgeCb()
    expect(chrome.is_tucked.value).toBe(false)

    resolveAnim()
    await restorePromise
    expect(chrome.is_tucked.value).toBe(false)
  })
})

// ── no-op guards + single sfx emission [obligation] ────────────────────────────

describe('useWindowChrome — tuck/restore are no-ops when already in that state [obligation]', () => {
  test('tuck() called twice only animates and emits sfx once', async () => {
    const { chrome } = makeChrome()

    await chrome.tuck()
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
    expect(mockEmitSfx).toHaveBeenCalledWith('slide_up')
    expect(mockTuckPreview).toHaveBeenCalledTimes(1)

    await chrome.tuck()
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
    expect(mockTuckPreview).toHaveBeenCalledTimes(1)
    expect(chrome.is_tucked.value).toBe(true)
  })

  test('restore() called before any tuck() is a silent no-op', async () => {
    const { chrome } = makeChrome()

    await chrome.restore()

    expect(mockEmitSfx).not.toHaveBeenCalled()
    expect(mockUntuckPreview).not.toHaveBeenCalled()
    expect(chrome.is_tucked.value).toBe(false)
  })

  test('restore() called twice only animates and emits sfx once', async () => {
    const { chrome } = makeChrome()
    await chrome.tuck()
    mockEmitSfx.mockClear()

    await chrome.restore()
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
    expect(mockEmitSfx).toHaveBeenCalledWith('slide_up')
    expect(mockUntuckPreview).toHaveBeenCalledTimes(1)

    await chrome.restore()
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
    expect(mockUntuckPreview).toHaveBeenCalledTimes(1)
    expect(chrome.is_tucked.value).toBe(false)
  })
})

// ── aside is animated alongside the preview ────────────────────────────────────

describe('useWindowChrome — drives the aside alongside the preview', () => {
  test('tuck() retracts the aside and restore() restores it', async () => {
    const { chrome } = makeChrome()

    await chrome.tuck()
    expect(mockRetract).toHaveBeenCalledTimes(1)
    expect(mockRestore).not.toHaveBeenCalled()

    await chrome.restore()
    expect(mockRestore).toHaveBeenCalledTimes(1)
  })

  test('tuck() skips animating the preview/aside when their refs are null, but still flips is_tucked', async () => {
    const preview = ref(null)
    const aside = ref(null)
    const chrome = useWindowChrome(preview, aside)

    await chrome.tuck()

    expect(mockTuckPreview).not.toHaveBeenCalled()
    expect(mockRetract).not.toHaveBeenCalled()
    expect(chrome.is_tucked.value).toBe(true)
  })
})

// ── snap ────────────────────────────────────────────────────────────────────────

describe('useWindowChrome — snap jumps straight to a pose with no animation', () => {
  test('snap(true) sets is_tucked, snaps the preview and aside, and never emits sfx', () => {
    const { preview, aside, chrome } = makeChrome()

    chrome.snap(true)

    expect(chrome.is_tucked.value).toBe(true)
    expect(mockSnapPreview).toHaveBeenCalledWith(preview.value, true)
    expect(mockSnapAside).toHaveBeenCalledWith(aside.value, true)
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('snap(false) sets is_tucked back and snaps both elements to the resting pose', () => {
    const { preview, aside, chrome } = makeChrome()
    chrome.snap(true)

    chrome.snap(false)

    expect(chrome.is_tucked.value).toBe(false)
    expect(mockSnapPreview).toHaveBeenCalledWith(preview.value, false)
    expect(mockSnapAside).toHaveBeenCalledWith(aside.value, false)
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('snap() is unguarded — it re-applies even when already in that state [obligation]', () => {
    const { chrome } = makeChrome()

    chrome.snap(true)
    chrome.snap(true)

    expect(mockSnapPreview).toHaveBeenCalledTimes(2)
  })

  test('snap() still flips is_tucked when the preview/aside refs are null', () => {
    const preview = ref(null)
    const aside = ref(null)
    const chrome = useWindowChrome(preview, aside)

    chrome.snap(true)

    expect(chrome.is_tucked.value).toBe(true)
    expect(mockSnapPreview).not.toHaveBeenCalled()
    expect(mockSnapAside).not.toHaveBeenCalled()
  })
})
