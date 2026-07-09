import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'
import { useCardPreview } from '@/views/study-session/composables/card-preview'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitStudySfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function withSetup(composable, { provide } = {}) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => null
    }
  })
  if (provide) Object.entries(provide).forEach(([k, v]) => app.provide(k, v))
  const el = document.createElement('div')
  app.mount(el)
  return { result, app, unmount: () => app.unmount() }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCardPreview', () => {
  let unmount

  beforeEach(() => {
    mockEmitSfx.mockClear()
    unmount = null
  })

  afterEach(() => {
    unmount?.()
  })

  // ── Initial state ──────────────────────────────────────────────────────────

  test('preview_style starts with opacity 0 and scale(0.9)', () => {
    const next_card = ref(undefined)
    const { result } = withSetup(() => useCardPreview(next_card))
    unmount = () => {}

    expect(result.preview_style.value.opacity).toBe(0)
    expect(result.preview_style.value.transform).toContain('scale(0.9)')
  })

  test('preview_style transition is none initially', () => {
    const next_card = ref(undefined)
    const { result } = withSetup(() => useCardPreview(next_card))
    unmount = () => {}

    expect(result.preview_style.value.transition).toBe('none')
  })

  // ── onDragProgress ────────────────────────────────────────────────────────

  test('onDragProgress updates preview_progress and transition duration', async () => {
    const next_card = ref(undefined)
    const { result } = withSetup(() => useCardPreview(next_card))
    unmount = () => {}

    result.onDragProgress(0.5, 0.3)
    await nextTick()

    expect(result.preview_style.value.opacity).toBeCloseTo(0.5)
    expect(result.preview_style.value.transition).toMatch(/0\.3s/)
  })

  test('onDragProgress with progress=1 sets opacity 1 and scale(1)', async () => {
    const next_card = ref(undefined)
    const { result } = withSetup(() => useCardPreview(next_card))
    unmount = () => {}

    result.onDragProgress(1, 0)
    await nextTick()

    expect(result.preview_style.value.opacity).toBe(1)
    expect(result.preview_style.value.transform).toContain('scale(1)')
  })

  test('onDragProgress with duration=0 gives transition:none', async () => {
    const next_card = ref(undefined)
    const { result } = withSetup(() => useCardPreview(next_card))
    unmount = () => {}

    result.onDragProgress(0.5, 0)
    await nextTick()

    expect(result.preview_style.value.transition).toBe('none')
  })

  // ── awaitFlip [obligation] ─────────────────────────────────────────────────
  // awaitFlip emits slide_up sfx, sets next_card_side, and resolves when
  // onNextCardFlipped is called.

  test('awaitFlip emits slide_up sfx [obligation]', async () => {
    const next_card = ref(undefined)
    const { result } = withSetup(() => useCardPreview(next_card))
    unmount = () => {}

    result.awaitFlip('front')
    await nextTick()

    expect(mockEmitSfx).toHaveBeenCalledWith('slide_up')
  })

  test('awaitFlip sets next_card_side to the requested side', async () => {
    const next_card = ref(undefined)
    const { result } = withSetup(() => useCardPreview(next_card))
    unmount = () => {}

    result.awaitFlip('back')
    await nextTick()

    expect(result.next_card_side.value).toBe('back')
  })

  test('awaitFlip resolves when onNextCardFlipped is called', async () => {
    const next_card = ref(undefined)
    const { result } = withSetup(() => useCardPreview(next_card))
    unmount = () => {}

    let resolved = false
    result.awaitFlip('front').then(() => {
      resolved = true
    })
    await nextTick()

    expect(resolved).toBe(false)

    result.onNextCardFlipped()
    await new Promise((r) => setTimeout(r, 0))

    expect(resolved).toBe(true)
  })

  test('awaitFlip resets next_card_side to cover after resolving', async () => {
    const next_card = ref(undefined)
    const { result } = withSetup(() => useCardPreview(next_card))
    unmount = () => {}

    result.awaitFlip('front')
    await nextTick()

    result.onNextCardFlipped()
    await new Promise((r) => setTimeout(r, 0))

    expect(result.next_card_side.value).toBe('cover')
  })

  // ── watch resets on card change ────────────────────────────────────────────

  test('preview resets to 0 when next_card id changes', async () => {
    const next_card = ref({ id: 1 })
    const { result } = withSetup(() => useCardPreview(next_card))
    unmount = () => {}

    result.onDragProgress(0.8, 0.2)
    await nextTick()
    expect(result.preview_style.value.opacity).toBeCloseTo(0.8)

    next_card.value = { id: 2 }
    await nextTick()

    expect(result.preview_style.value.opacity).toBe(0)
    expect(result.preview_style.value.transition).toBe('none')
  })

  // ── onUnmounted resolves pending flip ─────────────────────────────────────

  test('unmounting resolves a pending awaitFlip promise', async () => {
    const next_card = ref(undefined)
    const { result, app } = withSetup(() => useCardPreview(next_card))

    let resolved = false
    result.awaitFlip('front').then(() => {
      resolved = true
    })
    await nextTick()

    app.unmount()
    await new Promise((r) => setTimeout(r, 0))

    expect(resolved).toBe(true)
  })
})
