import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import { FSRS, generatorParameters, createEmptyCard, Rating } from 'ts-fsrs'
import StudyCard from '@/components/study-session/session-flashcard/study-card.vue'
import { useProvideDeckContext } from '@/components/study-session/deck-context'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRegister } = vi.hoisted(() => ({
  mockRegister: vi.fn().mockReturnValue(() => {})
}))

const { mockEmitSfx, mockEmitStudySfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitStudySfx: vi.fn()
}))

// Captures shortcut handlers by combo so tests can invoke them directly.
const { capturedShortcuts, mockShortcutRegister } = vi.hoisted(() => {
  const capturedShortcuts = {}
  const mockShortcutRegister = vi.fn(({ combo, handler }) => {
    capturedShortcuts[combo] = handler
  })
  return { capturedShortcuts, mockShortcutRegister }
})

vi.mock('@/composables/ui/gestures', () => ({
  useGestures: vi.fn(() => ({ register: mockRegister }))
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: vi.fn(() => ({
    register: mockShortcutRegister,
    dispose: vi.fn(),
    clearScope: vi.fn()
  }))
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitStudySfx: mockEmitStudySfx,
  emitHoverSfx: vi.fn()
}))

// ── Card stub ─────────────────────────────────────────────────────────────────
// Passes through $attrs so data-testid="study-card" lands on the root element.
// Uses a render function (not template) because the Vue runtime compiler is
// not available in browser mode.

const CardStub = defineComponent({
  name: 'Card',
  inheritAttrs: false,
  // Declare Card's relevant props so findComponent().props('cover_config') resolves.
  props: {
    cover_config: { default: undefined },
    card_attributes: { default: undefined },
    side: { type: String }
  },
  emits: ['flip-out-complete'],
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () => h('div', attrs, slots.default?.())
  }
})

// ── FSRS options fixture ───────────────────────────────────────────────────────

function makeOptions() {
  const fsrs = new FSRS(generatorParameters({ enable_fuzz: false }))
  return fsrs.repeat(createEmptyCard(new Date()), new Date())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountStudyCard(props = {}) {
  return mount(StudyCard, {
    props: { side: 'front', ...props },
    attachTo: document.body,
    global: { stubs: { Card: CardStub } }
  })
}

/**
 * Mounts StudyCard inside a parent that provides a DeckContext so tests can
 * verify the cover/attributes resolution without importing the private injection
 * key. The `decks` array is passed to `useProvideDeckContext`.
 */
function mountStudyCardWithDeckContext(decks, card_data, extra_props = {}) {
  const Wrapper = defineComponent({
    setup() {
      useProvideDeckContext(() => decks)
    },
    render() {
      return h(StudyCard, { card: card_data, side: 'front', ...extra_props })
    }
  })
  return mount(Wrapper, {
    attachTo: document.body,
    global: { stubs: { Card: CardStub } }
  })
}

/**
 * Get the element and callbacks from the single drag registration.
 * Returns { el, callbacks } or null if not yet registered.
 */
function getCallbacks() {
  const call = mockRegister.mock.calls[0]
  if (!call) return null
  return { el: call[0], callbacks: call[1] }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StudyCard', () => {
  let options

  beforeEach(() => {
    mockRegister.mockClear()
    mockShortcutRegister.mockClear()
    mockEmitSfx.mockClear()
    mockEmitStudySfx.mockClear()
    // Clear captured shortcut handlers between tests
    for (const key of Object.keys(capturedShortcuts)) delete capturedShortcuts[key]
    options = makeOptions()
  })

  // ── Fling direction per grade [obligation] ────────────────────────────────

  test('rate(Again) flings card left (direction -1) [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Again)
    await flushPromises()

    const { el } = getCallbacks()
    // A left fling applies a negative translateX
    expect(el.style.transform).toMatch(/translateX\(-/)
  })

  test('rate(Hard) flings card right (direction +1) [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Hard)
    await flushPromises()

    const { el } = getCallbacks()
    // A right fling applies a positive translateX
    expect(el.style.transform).toMatch(/translateX\(\d/)
  })

  test('rate(Easy) flings card right (direction +1) [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Easy)
    await flushPromises()

    const { el } = getCallbacks()
    expect(el.style.transform).toMatch(/translateX\(\d/)
  })

  // ── Grade passthrough: Hard/Easy [obligation] ─────────────────────────────

  test('rate(Hard) emits reviewed with Rating.Hard — not Rating.Good [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Hard)
    await flushPromises()

    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(wrapper.emitted('reviewed')[0][0]).toBe(Rating.Hard)
  })

  test('rate(Easy) emits reviewed with Rating.Easy — not Rating.Good [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Easy)
    await flushPromises()

    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(wrapper.emitted('reviewed')[0][0]).toBe(Rating.Easy)
  })

  test('rate(Hard) plays ok sfx (not locancel) [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Hard)
    await flushPromises()

    expect(mockEmitStudySfx).toHaveBeenCalledWith('music_plink_ok')
    expect(mockEmitStudySfx).not.toHaveBeenCalledWith('music_plink_locancel')
  })

  // ── Swipe fallback grade (drag path, no explicit grade) [obligation] ────────

  test('swipe right (onEnd dx > 50) derives Rating.Good and emits it [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 80, dy: 0 })
    await flushPromises()

    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(wrapper.emitted('reviewed')[0][0]).toBe(Rating.Good)
  })

  test('swipe left (onEnd dx < -50) derives Rating.Again and emits it [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: -80, dy: 0 })
    await flushPromises()

    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(wrapper.emitted('reviewed')[0][0]).toBe(Rating.Again)
  })

  // ── Review labels ──────────────────────────────────────────────────────────

  test('pass label gets review-label--visible class when dragged right past threshold', async () => {
    const wrapper = mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: 60, dy: 0 })
    await flushPromises()

    const passLabel = wrapper.find('[data-testid="review-label--pass"]')
    expect(passLabel.classes()).toContain('review-label--visible')
  })

  test('fail label gets review-label--visible class when dragged left past threshold', async () => {
    const wrapper = mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: -60, dy: 0 })
    await flushPromises()

    const failLabel = wrapper.find('[data-testid="review-label--fail"]')
    expect(failLabel.classes()).toContain('review-label--visible')
  })

  test('pass label is not visible below threshold', async () => {
    const wrapper = mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: 30, dy: 0 })
    await flushPromises()

    const passLabel = wrapper.find('[data-testid="review-label--pass"]')
    expect(passLabel.classes()).not.toContain('review-label--visible')
  })

  test('fail label is not visible below threshold', async () => {
    const wrapper = mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: -30, dy: 0 })
    await flushPromises()

    const failLabel = wrapper.find('[data-testid="review-label--fail"]')
    expect(failLabel.classes()).not.toContain('review-label--visible')
  })

  // ── Tap gesture → flip (regression: flip now driven by onEnd, not mouseup) ──
  // The @mouseup DOM handler was removed. Flip is triggered by the gesture
  // pipeline's onEnd when |dx| < FLIP_THRESHOLD and |dy| < FLIP_THRESHOLD.

  test('tap gesture (onEnd ~0 dx/dy) on front side emits side-changed [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()

    expect(wrapper.emitted('side-changed')).toHaveLength(1)
  })

  test('tap gesture (onEnd ~0 dx/dy) on back side emits side-changed [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()

    expect(wrapper.emitted('side-changed')).toHaveLength(1)
  })

  test('tap gesture on cover side emits "started" not side-changed [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'cover', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()

    expect(wrapper.emitted('started')).toHaveLength(1)
    expect(wrapper.emitted('side-changed')).toBeFalsy()
  })

  // ── Tap release of a text selection must not flip [obligation] ─────────────
  // Mirrors the same guard in grid-item.vue's onCardClick.

  test('tap that releases a non-collapsed selection does NOT flip [obligation]', async () => {
    const origGetSelection = window.getSelection
    window.getSelection = () => ({ isCollapsed: false })

    const wrapper = mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()

    expect(wrapper.emitted('side-changed')).toBeFalsy()
    expect(wrapper.emitted('started')).toBeFalsy()

    window.getSelection = origGetSelection
  })

  test('plain tap with a collapsed selection still flips [obligation]', async () => {
    const origGetSelection = window.getSelection
    window.getSelection = () => ({ isCollapsed: true })

    const wrapper = mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()

    expect(wrapper.emitted('side-changed')).toHaveLength(1)

    window.getSelection = origGetSelection
  })

  test('plain tap with no selection (getSelection returns null) still flips [obligation]', async () => {
    const origGetSelection = window.getSelection
    window.getSelection = () => null

    const wrapper = mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()

    expect(wrapper.emitted('side-changed')).toHaveLength(1)

    window.getSelection = origGetSelection
  })

  // ── onCardMouseDown suppresses multi-click selection [obligation] ──────────

  test('onCardMouseDown calls preventDefault on a multi-click (detail > 1) [obligation]', async () => {
    mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { el } = getCallbacks()
    const event = new MouseEvent('mousedown', { detail: 2, bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    el.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  test('onCardMouseDown does NOT call preventDefault on a single click (detail === 1) [obligation]', async () => {
    mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { el } = getCallbacks()
    const event = new MouseEvent('mousedown', { detail: 1, bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    el.dispatchEvent(event)

    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })

  test('long horizontal swipe (|dx| > 50) on back side flings and does NOT flip [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 80, dy: 0 })
    await flushPromises()

    // fling emits reviewed (after transitionend), not side-changed
    expect(wrapper.emitted('side-changed')).toBeFalsy()
  })

  test('long horizontal swipe emits reviewed after transitionend [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 80, dy: 0 })
    await flushPromises()

    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
  })

  test('medium drag (|dx| between 10 and 50) snaps back and does NOT flip [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 30, dy: 0 })
    await flushPromises()

    expect(wrapper.emitted('side-changed')).toBeFalsy()
    expect(wrapper.emitted('reviewed')).toBeFalsy()
  })

  // ── rate() / fling animation ───────────────────────────────────────────────

  test('rate(Good) plays study.music_plink_ok sfx', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    expect(mockEmitStudySfx).toHaveBeenCalledWith('music_plink_ok')
  })

  test('rate(Again) plays study.music_plink_locancel sfx', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Again)
    await flushPromises()

    expect(mockEmitStudySfx).toHaveBeenCalledWith('music_plink_locancel')
  })

  test('rate(Good) emits reviewed with Rating.Good after transitionend', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(wrapper.emitted('reviewed')[0][0]).toBe(Rating.Good)
  })

  test('rate(Again) emits reviewed with Rating.Again after transitionend', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Again)
    await flushPromises()

    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(wrapper.emitted('reviewed')[0][0]).toBe(Rating.Again)
  })

  test('reviewed is emitted with Rating.Good when options prop is not passed', async () => {
    const wrapper = mountStudyCard({ side: 'back' })
    await flushPromises()

    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(wrapper.emitted('reviewed')[0][0]).toBe(Rating.Good)
  })

  // ── Zone sfx (card_offset crossing ±50) ───────────────────────────────────

  test('study.music_plink_mid plays when card_offset crosses the +50 threshold', async () => {
    mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()

    // Cross into the pass zone
    callbacks.onMove({ dx: 60, dy: 0 })
    await flushPromises()

    expect(mockEmitStudySfx).toHaveBeenCalledWith('music_plink_mid')
    const call_count = mockEmitStudySfx.mock.calls.filter((c) => c[0] === 'music_plink_mid').length
    expect(call_count).toBe(1)

    // Another move within the same zone should NOT trigger the sfx again
    callbacks.onMove({ dx: 80, dy: 0 })
    await flushPromises()

    const call_count_after = mockEmitStudySfx.mock.calls.filter(
      (c) => c[0] === 'music_plink_mid'
    ).length
    expect(call_count_after).toBe(1)
  })

  test('study.music_plink_mid plays when card_offset crosses the -50 threshold', async () => {
    mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()

    callbacks.onMove({ dx: -60, dy: 0 })
    await flushPromises()

    expect(mockEmitStudySfx).toHaveBeenCalledWith('music_plink_mid')
  })

  // ── cover side: gestures and rate() are no-ops ────────────────────────────

  test('rate() does not emit reviewed when side is cover', async () => {
    const wrapper = mountStudyCard({ side: 'cover', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toBeFalsy()
  })

  // ── cover_config forwarding ────────────────────────────────────────────────

  test('forwards cover_config from deck context for the card deck_id [obligation]', async () => {
    const cover_config = { bg_color: 'blue-500', pattern: 'stars' }
    const card_data = { id: 1, deck_id: 42 }
    const deck = { id: 42, cover_config, card_attributes: null }

    const wrapper = mountStudyCardWithDeckContext([deck], card_data)
    await flushPromises()

    expect(wrapper.findComponent({ name: 'Card' }).props('cover_config')).toEqual(cover_config)
  })

  test('cover_config is undefined when no deck context is provided', async () => {
    const wrapper = mountStudyCard({ side: 'front' })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'Card' }).props('cover_config')).toBeUndefined()
  })

  test('cover_override prop takes precedence over deck context cover_config [obligation]', async () => {
    const deck_cover = { bg_color: 'red-500', pattern: 'none' }
    const override_cover = { bg_color: 'blue-500', pattern: 'stars' }
    const card_data = { id: 1, deck_id: 42 }
    const deck = { id: 42, cover_config: deck_cover }

    const wrapper = mountStudyCardWithDeckContext([deck], card_data, {
      cover_override: override_cover
    })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'Card' }).props('cover_config')).toEqual(override_cover)
  })

  test('drag does not move card when side is cover', async () => {
    mountStudyCard({ side: 'cover', options })
    await flushPromises()

    const { el, callbacks } = getCallbacks()
    // The cover card carries its own rise-in entrance transform; capture it so
    // we assert the drag adds nothing, rather than expecting an empty transform.
    const before = el.style.transform
    callbacks.onMove({ dx: 80, dy: 0 })
    await flushPromises()

    // Drag is ignored on the cover — onMove leaves the transform unchanged.
    expect(el.style.transform).toBe(before)
  })

  // ── snapBack on cancel ─────────────────────────────────────────────────────

  // ── drag-progress event ────────────────────────────────────────────────────

  test('onMove emits drag-progress with normalized |dx|/150 and duration 0', async () => {
    const wrapper = mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: 75, dy: 0 })
    await flushPromises()

    const events = wrapper.emitted('drag-progress')
    expect(events).toBeTruthy()
    const last = events[events.length - 1]
    expect(last[0]).toBeCloseTo(0.5, 5)
    expect(last[1]).toBe(0)
  })

  test('onMove with |dx| beyond reveal distance caps progress at 1', async () => {
    const wrapper = mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: 400, dy: 0 })
    await flushPromises()

    const events = wrapper.emitted('drag-progress')
    const last = events[events.length - 1]
    expect(last[0]).toBe(1)
  })

  test('onMove left drag emits progress based on absolute value', async () => {
    const wrapper = mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: -75, dy: 0 })
    await flushPromises()

    const last = wrapper.emitted('drag-progress').at(-1)
    expect(last[0]).toBeCloseTo(0.5, 5)
  })

  test('onCancel emits drag-progress with 0 and snap-back duration', async () => {
    const wrapper = mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: 40, dy: 0 })
    callbacks.onCancel()
    await flushPromises()

    const last = wrapper.emitted('drag-progress').at(-1)
    expect(last[0]).toBe(0)
    expect(last[1]).toBeGreaterThan(0)
  })

  test('rate() fling emits drag-progress with progress 1 and fling duration', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    const last = wrapper.emitted('drag-progress').at(-1)
    expect(last[0]).toBe(1)
    expect(last[1]).toBeGreaterThan(0)
  })

  test('onEnd below threshold (snap back) emits drag-progress 0', async () => {
    const wrapper = mountStudyCard({ options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: 20, dy: 0 })
    callbacks.onEnd({ dx: 20, dy: 0 })
    await flushPromises()

    const last = wrapper.emitted('drag-progress').at(-1)
    expect(last[0]).toBe(0)
  })

  test('onEnd above threshold (fling) emits drag-progress 1', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 80, dy: 0 })
    await flushPromises()

    const last = wrapper.emitted('drag-progress').at(-1)
    expect(last[0]).toBe(1)
  })

  test('onCancel resets card transform to empty string', async () => {
    mountStudyCard({ options })
    await flushPromises()

    const { el, callbacks } = getCallbacks()

    // Move to set some transform
    callbacks.onMove({ dx: 40, dy: 0 })
    await flushPromises()

    // Cancel should snap back
    callbacks.onCancel()
    await flushPromises()

    // After the snap-back transition (which sets style.transform = ''), the element
    // should have its transform cleared
    expect(el.style.transform).toBe('')
  })

  // ── Animation lock [obligation] ────────────────────────────────────────────
  // triggerCardFlip guards only on is_animating (is_dragging guard was removed).
  // Flip is driven from the gesture onEnd tap pipeline.

  test('triggerCardFlip (via tap) sets is_animating and emits started on cover side [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'cover', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()

    expect(wrapper.emitted('started')).toHaveLength(1)
  })

  test('triggerCardFlip (via tap) emits side-changed on front side [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()

    expect(wrapper.emitted('side-changed')).toHaveLength(1)
  })

  test('second tap while is_animating is a no-op — side-changed emitted only once [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // First tap sets is_animating = true
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()
    expect(wrapper.emitted('side-changed')).toHaveLength(1)

    // Second tap while animating must be blocked
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()
    expect(wrapper.emitted('side-changed')).toHaveLength(1)
  })

  test('flip-out-complete event on Card releases is_animating so next tap flip works [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // First tap
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()
    expect(wrapper.emitted('side-changed')).toHaveLength(1)

    // Simulate the card emitting flip-out-complete (the outgoing face rotated out)
    wrapper.findComponent({ name: 'Card' }).vm.$emit('flip-out-complete')
    await wrapper.vm.$nextTick()

    // is_animating should be false now — next tap should go through
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()
    expect(wrapper.emitted('side-changed')).toHaveLength(2)
  })

  test('space shortcut is a no-op while is_animating is true [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'front', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // Trigger first flip via tap (sets is_animating = true)
    callbacks.onEnd({ dx: 0, dy: 0 })
    await flushPromises()
    expect(wrapper.emitted('side-changed')).toHaveLength(1)

    // Invoke space shortcut handler while animating — must be a no-op
    capturedShortcuts['space']?.()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('side-changed')).toHaveLength(1)
  })

  test('arrowright shortcut is a no-op while is_animating is true [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    // Start a fling to set is_animating = true
    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    const sfxCallsBefore = mockEmitSfx.mock.calls.length

    // Invoke arrowright shortcut while fling animation in flight
    capturedShortcuts['arrowright']?.()
    await flushPromises()

    // No additional sfx replay
    expect(mockEmitSfx.mock.calls.length).toBe(sfxCallsBefore)
  })

  test('arrowleft shortcut is a no-op while is_animating is true [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    // Start a fling to set is_animating = true
    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    const sfxCallsBefore = mockEmitSfx.mock.calls.length

    // Invoke arrowleft shortcut while fling animation in flight
    capturedShortcuts['arrowleft']?.()
    await flushPromises()

    expect(mockEmitSfx.mock.calls.length).toBe(sfxCallsBefore)
  })

  test('rate() is a no-op while is_animating is true — no reviewed emitted [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    // First rate() sets is_animating = true
    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    // Simulate transitionend to emit reviewed once
    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)

    // Calling rate() again while is_animating is still true (stays true after reviewed)
    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    // reviewed must still be length 1
    expect(wrapper.emitted('reviewed')).toHaveLength(1)
  })

  test('fling lock persists through reviewed emit — is_animating stays true [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    // Emit transitionend so reviewed fires
    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)

    // Even after reviewed, is_animating should still block rate()
    const sfxCallsBefore = mockEmitSfx.mock.calls.length
    wrapper.vm.rate(Rating.Good)
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(mockEmitSfx.mock.calls.length).toBe(sfxCallsBefore)
  })

  // ── swipe() via keyboard shortcuts (arrowright/arrowleft) ─────────────────

  test('arrowright shortcut calls swipe and flings card right when not animating [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    capturedShortcuts['arrowright']?.()
    await flushPromises()

    // fling applies transform and eventually emits reviewed after transitionend
    const { el } = getCallbacks()
    expect(el.style.transform).toContain('translateX')
  })

  test('arrowleft shortcut calls swipe and flings card left when not animating [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    capturedShortcuts['arrowleft']?.()
    await flushPromises()

    const { el } = getCallbacks()
    expect(el.style.transform).toContain('translateX')
  })

  test('arrowright shortcut is a no-op on cover side [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'cover', options })
    await flushPromises()

    capturedShortcuts['arrowright']?.()
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toBeFalsy()
  })

  // ── onStart clears transition ──────────────────────────────────────────────

  test('gesture onStart sets element transition to none', async () => {
    mountStudyCard({ options })
    await flushPromises()

    const { el, callbacks } = getCallbacks()
    el.style.transition = 'transform 0.25s ease-out'
    callbacks.onStart()

    expect(el.style.transition).toBe('none')
  })

  // ── toDragRating boundary values [obligation] ──────────────────────────────
  // toDragRating uses exclusive comparison (< / >), so dy === ±50 must stay Good.

  test('toDragRating: dy === -50 returns Good (exclusive boundary, not Easy) [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', show_all_ratings: true, options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // Enter the right zone with dy exactly at -VERTICAL_RATING_THRESHOLD (-50)
    callbacks.onMove({ dx: 100, dy: -50 })
    await flushPromises()

    // primed_grade transitions from null → Good (not Easy); drag-rating emits Good
    const events = wrapper.emitted('drag-rating')
    expect(events).toBeTruthy()
    expect(events[events.length - 1][0]).toBe(Rating.Good)
  })

  test('toDragRating: dy === +50 returns Good (exclusive boundary, not Hard) [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', show_all_ratings: true, options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: 100, dy: 50 })
    await flushPromises()

    const events = wrapper.emitted('drag-rating')
    expect(events).toBeTruthy()
    expect(events[events.length - 1][0]).toBe(Rating.Good)
  })

  test('toDragRating: dy < -50 returns Easy [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', show_all_ratings: true, options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // First move to enter right zone as Good
    callbacks.onMove({ dx: 100, dy: 0 })
    await flushPromises()
    // Then move dy past Easy threshold
    callbacks.onMove({ dx: 100, dy: -51 })
    await flushPromises()

    const events = wrapper.emitted('drag-rating')
    expect(events[events.length - 1][0]).toBe(Rating.Easy)
  })

  test('toDragRating: dy > +50 returns Hard [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', show_all_ratings: true, options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: 100, dy: 0 })
    await flushPromises()
    callbacks.onMove({ dx: 100, dy: 51 })
    await flushPromises()

    const events = wrapper.emitted('drag-rating')
    expect(events[events.length - 1][0]).toBe(Rating.Hard)
  })

  // ── drag_rating resets to Good when leaving the right zone [obligation] ────

  test('drag_rating resets to Good when dx drops back below SWIPE_DISTANCE_THRESHOLD [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', show_all_ratings: true, options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // Enter right zone with Hard rating
    callbacks.onMove({ dx: 100, dy: 51 })
    await flushPromises()

    // Verify Hard is primed
    let events = wrapper.emitted('drag-rating')
    expect(events[events.length - 1][0]).toBe(Rating.Hard)

    // Return dx below threshold (neutral zone) — drag_rating must reset to Good
    callbacks.onMove({ dx: 30, dy: 51 })
    await flushPromises()

    // primed_grade is now null (neutral zone), drag-rating emits null
    events = wrapper.emitted('drag-rating')
    expect(events[events.length - 1][0]).toBeNull()

    // Re-enter the right zone at dy=0 (Good range); drag_rating is Good (reset confirmed)
    callbacks.onMove({ dx: 100, dy: 0 })
    await flushPromises()

    events = wrapper.emitted('drag-rating')
    expect(events[events.length - 1][0]).toBe(Rating.Good)
  })

  // ── drag_rating resets to Good on snapBack [obligation] ───────────────────

  test('drag_rating resets to Good on snapBack (onCancel) [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', show_all_ratings: true, options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // Set drag_rating to Hard
    callbacks.onMove({ dx: 100, dy: 51 })
    await flushPromises()

    // snapBack via onCancel
    callbacks.onCancel()
    await flushPromises()

    // snap-back emits drag-rating(null) to signal primed reset
    let events = wrapper.emitted('drag-rating')
    expect(events[events.length - 1][0]).toBeNull()

    // Re-enter the right zone with neutral dy — should emit Good (drag_rating was reset)
    callbacks.onMove({ dx: 100, dy: 0 })
    await flushPromises()

    events = wrapper.emitted('drag-rating')
    expect(events[events.length - 1][0]).toBe(Rating.Good)
  })

  // ── primed_grade emits drag-rating on zone transitions [obligation] ────────

  test('primed_grade emits drag-rating with current rating when entering right zone [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: 100, dy: 0 })
    await flushPromises()

    const events = wrapper.emitted('drag-rating')
    expect(events).toBeTruthy()
    expect(events[0][0]).toBe(Rating.Good)
  })

  test('primed_grade emits Rating.Again when entering left zone [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    callbacks.onMove({ dx: -100, dy: 0 })
    await flushPromises()

    const events = wrapper.emitted('drag-rating')
    expect(events).toBeTruthy()
    expect(events[0][0]).toBe(Rating.Again)
  })

  test('primed_grade emits null when returning to neutral from right zone [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // Enter right zone
    callbacks.onMove({ dx: 100, dy: 0 })
    await flushPromises()
    // Return to neutral
    callbacks.onMove({ dx: 20, dy: 0 })
    await flushPromises()

    const events = wrapper.emitted('drag-rating')
    expect(events[events.length - 1][0]).toBeNull()
  })

  test('primed_grade emits new drag-rating when drag_rating changes within the right zone [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', show_all_ratings: true, options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // Enter right zone as Good
    callbacks.onMove({ dx: 100, dy: 0 })
    await flushPromises()
    const after_good = wrapper.emitted('drag-rating').length

    // Change dy to Easy range inside the right zone
    callbacks.onMove({ dx: 100, dy: -51 })
    await flushPromises()

    const events = wrapper.emitted('drag-rating')
    expect(events.length).toBeGreaterThan(after_good)
    expect(events[events.length - 1][0]).toBe(Rating.Easy)
  })

  // ── endDrag grade selection with show_all_ratings [obligation] ────────────

  test('endDrag passes drag_rating.value (not always Good) when show_all_ratings=true [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', show_all_ratings: true, options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // Enter right zone with Hard rating
    callbacks.onMove({ dx: 100, dy: 51 })
    await flushPromises()

    // Fling right — should pass drag_rating.value (Hard)
    callbacks.onEnd({ dx: 100, dy: 51 })
    await flushPromises()

    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(wrapper.emitted('reviewed')[0][0]).toBe(Rating.Hard)
  })

  test('endDrag always uses Rating.Good for right flings when show_all_ratings=false [obligation]', async () => {
    const wrapper = mountStudyCard({ side: 'back', show_all_ratings: false, options })
    await flushPromises()

    const { callbacks } = getCallbacks()
    // Even with dy in Hard range, drag_rating stays Good (show_all_ratings=false)
    callbacks.onMove({ dx: 100, dy: 51 })
    await flushPromises()

    callbacks.onEnd({ dx: 100, dy: 51 })
    await flushPromises()

    const cardEl = wrapper.find('[data-testid="study-card"]').element
    cardEl.dispatchEvent(new Event('transitionend'))
    await flushPromises()

    expect(wrapper.emitted('reviewed')).toHaveLength(1)
    expect(wrapper.emitted('reviewed')[0][0]).toBe(Rating.Good)
  })
})
