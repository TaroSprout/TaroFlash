import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, watch, h, useAttrs, onMounted, getCurrentInstance } from 'vue'
import Session from '@/components/modals/study-session/session-flashcard.vue'
import { card } from '../../../../fixtures/card'
import { deck } from '../../../../fixtures/deck'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRegister } = vi.hoisted(() => ({
  mockRegister: vi.fn().mockReturnValue(() => {})
}))

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

const { cardsDataRef, cardsRefetchImpl } = await vi.hoisted(async () => {
  const { shallowRef } = await import('vue')
  const cardsDataRef = shallowRef(undefined)
  return {
    cardsDataRef,
    cardsRefetchImpl: {
      current: async () => ({ status: 'success', data: cardsDataRef.value, error: null })
    }
  }
})

const { mockSaveReview } = vi.hoisted(() => ({
  mockSaveReview: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@/composables/ui/gestures', () => ({
  useGestures: vi.fn(() => ({ register: mockRegister }))
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: vi.fn(() => ({
    register: vi.fn(),
    dispose: vi.fn(),
    clearScope: vi.fn(),
    popScope: vi.fn(),
    trapFocus: vi.fn(),
    releaseFocus: vi.fn()
  }))
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/api/cards', () => {
  const passthrough = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(undefined) })
  return {
    useStudySessionCardsQuery: () => ({
      data: cardsDataRef,
      refetch: vi.fn((...args) => cardsRefetchImpl.current(...args)),
      refresh: vi.fn()
    }),
    useSaveCardMutation: passthrough,
    useUpsertCardMutation: passthrough,
    useInsertCardAtMutation: passthrough,
    useDeleteCardsMutation: passthrough,
    useSetCardImageMutation: passthrough,
    useDeleteCardImageMutation: passthrough,
    useUpsertCardsMutation: passthrough,
    useMoveCardsToDeckMutation: passthrough,
    useMemberCardCountQuery: () => ({ data: { value: 0 }, refetch: vi.fn(), refresh: vi.fn() })
  }
})

const { mockFlushDeckReviews } = vi.hoisted(() => ({ mockFlushDeckReviews: vi.fn() }))

vi.mock('@/api/reviews', () => ({
  useSaveReviewMutation: () => ({ mutate: mockSaveReview, mutateAsync: mockSaveReview }),
  useFlushDeckReviews: () => mockFlushDeckReviews
}))

// ── Card stub ─────────────────────────────────────────────────────────────────
// Emits `flip-complete` when `side` changes so that session.vue's onNextCardFlipped
// resolves the animation-wait promise used to sequence card transitions.

const CardStub = defineComponent({
  props: {
    side: { type: String },
    card_attributes: { default: null }
  },
  emits: ['flip-complete'],
  inheritAttrs: false,
  setup(props, { emit, slots }) {
    const attrs = useAttrs()
    watch(
      () => props.side,
      () => emit('flip-complete')
    )
    return () => h('div', attrs, slots.default?.())
  }
})

// ── FinishAnimation stub ──────────────────────────────────────────────────────
// Emits `done` immediately on mount so that the `finished` event flows through
// without relying on CSS animationend (which jsdom never fires).

const FinishAnimationStub = defineComponent({
  emits: ['done'],
  setup(_props, { emit }) {
    onMounted(() => emit('done'))
    return () => h('div')
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(cardCount = 2, deckOverrides = {}) {
  const cards_data = card.many(cardCount)
  cardsDataRef.value = cards_data
  const deck_data = deck.one({
    overrides: {
      id: 1,
      study_config: { study_all_cards: true, retry_failed_cards: false },
      ...deckOverrides
    }
  })
  return mount(Session, {
    props: { deck: deck_data },
    attachTo: document.body,
    global: { stubs: { Card: CardStub, FinishAnimation: FinishAnimationStub } }
  })
}

async function waitForLoad() {
  await flushPromises()
}

async function startSession(wrapper) {
  await wrapper.find('[data-testid="rating-buttons__start"]').trigger('click')
}

/**
 * Get the drag callbacks registered by study-card's onMounted.
 * useGestures().register(el, callbacks) — two arguments.
 */
function getDragCallbacks() {
  const call = mockRegister.mock.calls[0]
  if (!call) return null
  return { el: call[0], callbacks: call[1] }
}

/**
 * Dispatch a transitionend event on the study-card element to complete a fling
 * animation.
 */
function fireTransitionEnd(wrapper) {
  const cardEl = wrapper.find('[data-testid="study-card"]').element
  cardEl.dispatchEvent(new Event('transitionend'))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Session', () => {
  beforeEach(() => {
    mockRegister.mockClear()
    mockEmitSfx.mockClear()
    cardsDataRef.value = undefined
    cardsRefetchImpl.current = async () => ({
      status: 'success',
      data: cardsDataRef.value,
      error: null
    })
    mockSaveReview.mockClear()
    mockFlushDeckReviews.mockClear()
  })

  // ── Loading behavior ───────────────────────────────────────────────────────

  describe('loading behavior', () => {
    test('while loading, shows skeleton card without study-card', async () => {
      // Leave cards_query.data undefined to keep the session in loading mode.
      cardsDataRef.value = undefined
      const deck_data = deck.one({
        overrides: { id: 1, study_config: { study_all_cards: true, retry_failed_cards: false } }
      })
      const wrapper = mount(Session, {
        props: { deck: deck_data },
        attachTo: document.body,
        global: { stubs: { Card: CardStub } }
      })

      // study-card is not yet rendered; plain card skeleton should be shown
      expect(wrapper.find('[data-testid="study-card"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="study-card-skeleton"]').exists()).toBe(true)
    })

    test('after loading, study-card is shown', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      expect(wrapper.find('[data-testid="study-card"]').exists()).toBe(true)
    })

    // Regression: after the prior session's useFlushDeckReviews invalidation,
    // the cards cache often holds [] (everything was capped/done). If the
    // session seeds from that stale snapshot before refetch resolves, the
    // queue is empty and finish-animation fires immediately. The mount path
    // must await a fresh fetch and seed from its resolved state.
    test('forces a fresh fetch on mount and ignores stale cached data', async () => {
      // Simulate stale cache: empty array, as happens after the prior session's
      // post-flush refetch returned 0 (caps consumed).
      cardsDataRef.value = []

      const fresh_cards = card.many(5, { traits: 'with_due_review' })
      cardsRefetchImpl.current = async () => ({
        status: 'success',
        data: fresh_cards,
        error: null
      })

      const deck_data = deck.one({
        overrides: { id: 1, study_config: { study_all_cards: false, retry_failed_cards: false } }
      })
      const wrapper = mount(Session, {
        props: { deck: deck_data },
        attachTo: document.body,
        global: { stubs: { Card: CardStub, FinishAnimation: FinishAnimationStub } }
      })
      await flushPromises()

      expect(wrapper.emitted('finished')).toBeFalsy()
      expect(wrapper.find('[data-testid="study-card"]').exists()).toBe(true)
    })
  })

  // ── Counter display ────────────────────────────────────────────────────────

  describe('counter', () => {
    test('shows 1/N initially after loading', async () => {
      const wrapper = makeSession(3)
      await waitForLoad(wrapper)

      const counter = wrapper.find('[data-testid="study-session__counter"]')
      expect(counter.text()).toContain('1')
      expect(counter.text()).toContain('3')
    })

    test('counter advances to 2/N after reviewing first card via Good button click + transitionend', async () => {
      const wrapper = makeSession(3)
      await waitForLoad(wrapper)

      await startSession(wrapper)

      // Flip to back to show rating buttons
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')

      // Click Good
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      // Complete the fling animation
      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.find('[data-testid="study-session__counter"]').text()).toContain('2')
    })
  })

  // ── Rating button → fling → reviewed (cross-component communication) ────────

  describe('Good rating flow', () => {
    test('clicking Good triggers fling: transform is applied to study-card', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      const cardEl = wrapper.find('[data-testid="study-card"]').element
      expect(cardEl.style.transform).toContain('translateX')
    })

    test('after Good fling + transitionend, counter advances', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.find('[data-testid="study-session__counter"]').text()).toContain('2')
    })

    test('after Good fling, updateReviewByCardId was called', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(mockSaveReview).toHaveBeenCalledOnce()
    })

    test('Good fling plays a sfx', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      expect(mockEmitSfx).toHaveBeenCalled()
    })
  })

  describe('Again rating flow', () => {
    test('clicking Again triggers fling and card advances', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.find('[data-testid="study-session__counter"]').text()).toContain('2')
    })

    test('Again fling plays a sfx', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')
      await flushPromises()

      expect(mockEmitSfx).toHaveBeenCalled()
    })
  })

  // ── Reveal button → side flip ──────────────────────────────────────────────

  describe('flip button interaction', () => {
    test('clicking flip button shows Again and Good rating buttons', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      // Initially in cover mode — start button visible, flip button not
      expect(wrapper.find('[data-testid="rating-buttons__start"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(false)

      await startSession(wrapper)

      // After starting — flip button visible, rating buttons not
      expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(false)

      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')

      expect(wrapper.find('[data-testid="rating-buttons__show"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="rating-buttons__good"]').exists()).toBe(true)
    })

    test('flipping to back plays a sfx', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')

      expect(mockEmitSfx).toHaveBeenCalled()
    })
  })

  // ── Swipe gesture → reviewed ───────────────────────────────────────────────

  describe('swipe gesture cross-communication', () => {
    test('swipe-right gesture (onEnd dx > 50) → transitionend → counter advances', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)

      const drag = getDragCallbacks()
      expect(drag).not.toBeNull()

      drag.callbacks.onEnd({ dx: 80, dy: 0, x: 0, y: 0, velocity: 0.4, duration: 200 })
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.find('[data-testid="study-session__counter"]').text()).toContain('2')
    })

    test('swipe-left gesture (onEnd dx < -50) → transitionend → counter advances', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)

      const drag = getDragCallbacks()
      expect(drag).not.toBeNull()

      drag.callbacks.onEnd({ dx: -80, dy: 0, x: 0, y: 0, velocity: 0.4, duration: 200 })
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.find('[data-testid="study-session__counter"]').text()).toContain('2')
    })
  })

  // ── Session completion ─────────────────────────────────────────────────────

  describe('session completion', () => {
    test('with 1 card: finished event is emitted with (1, 1) after Good review', async () => {
      const wrapper = makeSession(1)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.emitted('finished')).toHaveLength(1)
      // [score, total, remaining_due, study_all_used]
      expect(wrapper.emitted('finished')[0]).toEqual([1, 1, 0, true])
    })

    test('Again rating counts as score 0 in finished event', async () => {
      const wrapper = makeSession(1)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.emitted('finished')).toHaveLength(1)
      const [score, total] = wrapper.emitted('finished')[0]
      expect(score).toBe(0)
      expect(total).toBe(1)
    })

    test('mixed ratings: score counts only Good-rated cards', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      // First card: Good
      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      // Second card starts at 'front' after first card review — no start needed
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.emitted('finished')).toHaveLength(1)
      const [score, total] = wrapper.emitted('finished')[0]
      expect(score).toBe(1)
      expect(total).toBe(2)
    })
  })

  // ── Preview card drag-driven animation ────────────────────────────────────

  describe('preview card drag animation', () => {
    test('preview wrapper starts hidden (opacity 0, scaled down) before drag', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)
      await startSession(wrapper)

      const preview = wrapper.find('[data-testid="study-card__preview"]')
      expect(preview.exists()).toBe(true)
      expect(preview.element.style.opacity).toBe('0')
      expect(preview.element.style.transform).toContain('scale(0.9)')
    })

    test('dragging the active card increases preview opacity and scale', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)
      await startSession(wrapper)

      const drag = getDragCallbacks()
      drag.callbacks.onMove({ dx: 75, dy: 0 })
      await flushPromises()

      const preview = wrapper.find('[data-testid="study-card__preview"]')
      const opacity = parseFloat(preview.element.style.opacity)
      expect(opacity).toBeGreaterThan(0)
      expect(opacity).toBeLessThanOrEqual(1)
      expect(preview.element.style.transform).toMatch(/scale\(/)
    })

    test('dragging fully (|dx| past reveal distance) reveals preview at full opacity and scale 1', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)
      await startSession(wrapper)

      const drag = getDragCallbacks()
      drag.callbacks.onMove({ dx: 400, dy: 0 })
      await flushPromises()

      const preview = wrapper.find('[data-testid="study-card__preview"]')
      expect(preview.element.style.opacity).toBe('1')
      expect(preview.element.style.transform).toContain('scale(1)')
    })

    test('cancelling a drag (snap back) resets preview to hidden with a transition', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)
      await startSession(wrapper)

      const drag = getDragCallbacks()
      drag.callbacks.onMove({ dx: 80, dy: 0 })
      await flushPromises()
      drag.callbacks.onCancel()
      await flushPromises()

      const preview = wrapper.find('[data-testid="study-card__preview"]')
      expect(preview.element.style.opacity).toBe('0')
      expect(preview.element.style.transition).toMatch(/opacity/)
    })

    test('active-drag updates apply no transition so preview follows the gesture 1:1', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)
      await startSession(wrapper)

      const drag = getDragCallbacks()
      drag.callbacks.onMove({ dx: 50, dy: 0 })
      await flushPromises()

      const preview = wrapper.find('[data-testid="study-card__preview"]')
      expect(preview.element.style.transition).toBe('none')
    })

    test('after a fling completes and the next card advances, preview resets to hidden', async () => {
      const wrapper = makeSession(3)
      await waitForLoad(wrapper)
      await startSession(wrapper)

      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      const preview = wrapper.find('[data-testid="study-card__preview"]')
      expect(preview.exists()).toBe(true)
      expect(preview.element.style.opacity).toBe('0')
      expect(preview.element.style.transform).toContain('scale(0.9)')
    })
  })

  // ── No deck id ─────────────────────────────────────────────────────────────

  test('emits closed immediately if deck has no id', async () => {
    const deck_data = deck.one({
      overrides: { id: null, study_config: { study_all_cards: true, retry_failed_cards: false } }
    })
    const wrapper = mount(Session, {
      props: { deck: deck_data },
      attachTo: document.body,
      global: { stubs: { Card: CardStub } }
    })

    await flushPromises()

    expect(wrapper.emitted('closed')).toHaveLength(1)
  })

  // ── requestClose (exposed to parent via template ref) ─────────────────────

  describe('requestClose behavior', () => {
    test('requestClose from cover state emits "closed"', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      wrapper.vm.requestClose()

      expect(wrapper.emitted('closed')).toHaveLength(1)
      expect(wrapper.emitted('finished')).toBeFalsy()
    })

    test('requestClose after starting (but before any review) emits "closed"', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      wrapper.vm.requestClose()

      expect(wrapper.emitted('closed')).toHaveLength(1)
      expect(wrapper.emitted('finished')).toBeFalsy()
    })

    test('requestClose after reviewing a card routes through finish-animation and emits "finished"', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      wrapper.vm.requestClose()
      await flushPromises()

      expect(wrapper.emitted('finished')).toHaveLength(1)
      expect(wrapper.emitted('closed')).toBeFalsy()
    })

    // requestClose during an active session no longer emits 'finished' directly —
    // it flips mode to 'completed' so the finish animation gets to play, and the
    // animation's @done handler is the single emitter of 'finished'.
    test('early close with 1 review of 2 cards: total reports cards.length, not reviewed_count', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      wrapper.vm.requestClose()
      await flushPromises()

      const [, total] = wrapper.emitted('finished')[0]
      expect(total).toBe(2)
    })
  })

  // ── Deck cache flush (post-migration to end-of-session invalidation) ───────

  describe('deck cache flush', () => {
    test('flushDeckReviews is not called during per-review saves', async () => {
      const wrapper = makeSession(3)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(mockSaveReview).toHaveBeenCalledTimes(1)
      expect(mockFlushDeckReviews).not.toHaveBeenCalled()
    })

    test('flushDeckReviews fires with deck.id on natural completion (last card reviewed)', async () => {
      const wrapper = makeSession(1)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(mockFlushDeckReviews).toHaveBeenCalledTimes(1)
      expect(mockFlushDeckReviews).toHaveBeenCalledWith(1)
    })

    test('flushDeckReviews fires when requestClose is invoked after ≥1 review', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__show"]').trigger('click')
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(mockFlushDeckReviews).not.toHaveBeenCalled()

      wrapper.vm.requestClose()
      await flushPromises()

      expect(mockFlushDeckReviews).toHaveBeenCalledTimes(1)
      expect(mockFlushDeckReviews).toHaveBeenCalledWith(1)
    })

    test('flushDeckReviews is NOT called when requestClose from cover state emits "closed"', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      wrapper.vm.requestClose()
      await flushPromises()

      expect(wrapper.emitted('closed')).toHaveLength(1)
      expect(mockFlushDeckReviews).not.toHaveBeenCalled()
    })

    test('flushDeckReviews is NOT called when requestClose after starting but before any review', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      wrapper.vm.requestClose()
      await flushPromises()

      expect(wrapper.emitted('closed')).toHaveLength(1)
      expect(mockFlushDeckReviews).not.toHaveBeenCalled()
    })
  })
})
