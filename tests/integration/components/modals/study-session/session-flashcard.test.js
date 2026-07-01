import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, watch, h, useAttrs } from 'vue'
import Session from '@/components/study-session/session-flashcard/index.vue'
import SessionHeader from '@/components/study-session/session-flashcard/session-header.vue'
import { card } from '../../../../fixtures/card'
import { deck } from '../../../../fixtures/deck'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRegister } = vi.hoisted(() => ({
  mockRegister: vi.fn().mockReturnValue(() => {})
}))

const { mockEmitSfx, mockEmitStudySfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitStudySfx: vi.fn()
}))

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

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitStudySfx: mockEmitStudySfx,
  emitHoverSfx: vi.fn()
}))

const { cardsByIdsRefetchImpl } = vi.hoisted(() => ({
  cardsByIdsRefetchImpl: { current: async () => ({ status: 'success', data: [], error: null }) }
}))

vi.mock('@/api/cards', () => {
  const passthrough = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(undefined) })
  return {
    useMultiDeckStudyCardsQuery: () => ({
      data: cardsDataRef,
      refetch: vi.fn((...args) => cardsRefetchImpl.current(...args)),
      refresh: vi.fn()
    }),
    useCardsByIdsQuery: () => ({
      data: { value: undefined },
      refetch: vi.fn((...args) => cardsByIdsRefetchImpl.current(...args))
    }),
    useSaveCardMutation: passthrough,
    useUpsertCardMutation: passthrough,
    useInsertCardAtMutation: passthrough,
    useDeleteCardsMutation: passthrough,
    useDeleteCardsInDeckMutation: passthrough,
    useSetCardImageMutation: passthrough,
    useDeleteCardImageMutation: passthrough,
    useUpsertCardsMutation: passthrough,
    useMoveCardsToDeckMutation: passthrough,
    useMoveCardMutation: passthrough,
    useMemberCardCountQuery: () => ({ data: { value: 0 }, refetch: vi.fn(), refresh: vi.fn() })
  }
})

const { mockFlushDeckReviews } = vi.hoisted(() => ({ mockFlushDeckReviews: vi.fn() }))
const { mockUpsertMember } = vi.hoisted(() => ({ mockUpsertMember: vi.fn() }))
const { mockMemberStore } = vi.hoisted(() => ({
  mockMemberStore: {
    id: 'member-1',
    preferences: {
      study: { show_all_ratings: false, desired_retention: 90 },
      audio: { study_sounds: 5, interface_sounds: 5, hover_sounds: 5 },
      accessibility: { left_hand: false }
    }
  }
}))

vi.mock('@/api/reviews', () => ({
  useSaveReviewMutation: () => ({ mutate: mockSaveReview, mutateAsync: mockSaveReview }),
  useFlushDeckReviews: () => mockFlushDeckReviews
}))

vi.mock('@/api/members', () => ({
  useUpsertMemberMutation: () => ({ mutate: mockUpsertMember, mutateAsync: mockUpsertMember }),
  useCurrentMemberQuery: () => ({
    data: { value: null },
    refetch: () => Promise.resolve({ data: null })
  })
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMemberStore
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(cardCount = 2, deckOverrides = {}) {
  const cards_data = card.many(cardCount)
  cardsDataRef.value = cards_data
  const deck_data = deck.one({
    overrides: {
      id: 1,
      study_config: { study_all_cards: true, retry_failed_cards: false, show_all_ratings: false },
      ...deckOverrides
    }
  })
  return mount(Session, {
    props: { decks: [deck_data], title: deck_data.title },
    attachTo: document.body,
    global: { stubs: { Card: CardStub } }
  })
}

/** Creates a session with multiple decks for multi-deck obligation tests. */
function makeMultiDeckSession(cardCount = 2, deckIds = [1, 2]) {
  const cards_data = card.many(cardCount)
  cardsDataRef.value = cards_data
  const decks = deckIds.map((id) =>
    deck.one({
      overrides: {
        id,
        study_config: { study_all_cards: true, retry_failed_cards: false, show_all_ratings: false }
      }
    })
  )
  return mount(Session, {
    props: { decks, title: 'Multiple Decks' },
    attachTo: document.body,
    global: { stubs: { Card: CardStub } }
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
    // A prior test's reviewCard()/dropCard() writes a persisted-session snapshot
    // to sessionStorage; without clearing it, the next mount's useSessionCards
    // sees a stale snapshot and takes the restore path instead of a fresh seed.
    sessionStorage.clear()
    mockRegister.mockClear()
    mockEmitSfx.mockClear()
    mockEmitStudySfx.mockClear()
    cardsDataRef.value = undefined
    cardsRefetchImpl.current = async () => ({
      status: 'success',
      data: cardsDataRef.value,
      error: null
    })
    mockSaveReview.mockClear()
    mockFlushDeckReviews.mockClear()
    mockUpsertMember.mockClear()
    mockMemberStore.preferences.study.show_all_ratings = false
  })

  // ── Loading behavior ───────────────────────────────────────────────────────

  describe('loading behavior', () => {
    test('while loading, the study-card is not yet rendered', async () => {
      // Leave cards_query.data undefined to keep the session in loading mode.
      cardsDataRef.value = undefined
      const deck_data = deck.one({
        overrides: { id: 1, study_config: { study_all_cards: true, retry_failed_cards: false } }
      })
      const wrapper = mount(Session, {
        props: { decks: [deck_data], title: deck_data.title },
        attachTo: document.body,
        global: { stubs: { Card: CardStub } }
      })

      // The stage is empty while loading; the cover card rises in once data lands.
      expect(wrapper.find('[data-testid="study-card"]').exists()).toBe(false)
    })

    test('after loading, study-card is shown', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      expect(wrapper.find('[data-testid="study-card"]').exists()).toBe(true)
    })

    test('while loading, the start button is disabled so the cards fetch cannot be skipped [obligation]', () => {
      cardsDataRef.value = undefined
      const deck_data = deck.one({
        overrides: { id: 1, study_config: { study_all_cards: true, retry_failed_cards: false } }
      })
      const wrapper = mount(Session, {
        props: { decks: [deck_data], title: deck_data.title },
        attachTo: document.body,
        global: { stubs: { Card: CardStub } }
      })

      expect(
        wrapper.find('[data-testid="rating-buttons__start"]').attributes('aria-disabled')
      ).toBe('true')
    })

    test('after loading, the start button is no longer disabled [obligation]', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      expect(
        wrapper.find('[data-testid="rating-buttons__start"]').attributes('aria-disabled')
      ).toBeUndefined()
    })

    // Regression: after the prior session's useFlushDeckReviews invalidation,
    // the cards cache often holds [] (everything was capped/done). If the
    // session seeds from that stale snapshot before refetch resolves, the
    // queue is empty and the watcher fires finishSession() immediately. The
    // mount path must await a fresh fetch and seed from its resolved state.
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
        props: { decks: [deck_data], title: deck_data.title },
        attachTo: document.body,
        global: { stubs: { Card: CardStub } }
      })
      await flushPromises()

      expect(wrapper.emitted('finished')).toBeFalsy()
      expect(wrapper.find('[data-testid="study-card"]').exists()).toBe(true)
    })
  })

  // ── Counter display ────────────────────────────────────────────────────────

  describe('counter', () => {
    test('shows 0/N initially after loading (no card reviewed yet)', async () => {
      const wrapper = makeSession(3)
      await waitForLoad(wrapper)

      const counter = wrapper.find('[data-testid="ui-kit-progress-bar__label"]')
      expect(counter.text()).toContain('0')
      expect(counter.text()).toContain('3')
    })

    test('counter advances to 1/N after reviewing first card via Good button click + transitionend', async () => {
      const wrapper = makeSession(3)
      await waitForLoad(wrapper)

      await startSession(wrapper)

      // Flip to back to show rating buttons

      // Click Good
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      // Complete the fling animation
      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.find('[data-testid="ui-kit-progress-bar__label"]').text()).toContain('1')
    })
  })

  // ── Rating button → fling → reviewed (cross-component communication) ────────

  describe('Good rating flow', () => {
    test('clicking Good triggers fling: transform is applied to study-card', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      const cardEl = wrapper.find('[data-testid="study-card"]').element
      expect(cardEl.style.transform).toContain('translateX')
    })

    test('after Good fling + transitionend, counter advances', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.find('[data-testid="ui-kit-progress-bar__label"]').text()).toContain('1')
    })

    test('after Good fling, updateReviewByCardId was called', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
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
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      expect(mockEmitStudySfx).toHaveBeenCalled()
    })
  })

  describe('Again rating flow', () => {
    test('clicking Again triggers fling and card advances', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.find('[data-testid="ui-kit-progress-bar__label"]').text()).toContain('1')
    })

    test('Again fling plays a sfx', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')
      await flushPromises()

      expect(mockEmitStudySfx).toHaveBeenCalled()
    })
  })

  // ── Rating buttons visible immediately after start ────────────────────────

  describe('rating button availability', () => {
    test('cover side shows start button, not rating buttons', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      expect(wrapper.find('[data-testid="rating-buttons__start"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(false)
    })

    test('after startSession, again and good buttons are immediately visible', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)

      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="rating-buttons__good"]').exists()).toBe(true)
    })
  })

  // ── is_cover wiring into session-progress [obligation] ─────────────────────

  describe('is_cover wiring into session-progress', () => {
    test('cover side: studying-count label is visible, progress bar is faded but still mounted [obligation]', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      const label = wrapper.find('[data-testid="study-session__studying-count"]')
      const bar = wrapper.find('[data-testid="ui-kit-progress-bar"]')

      expect(label.classes()).toContain('opacity-100')
      expect(bar.exists()).toBe(true)
      expect(bar.classes()).toContain('opacity-0')
    })

    test('after startSession: progress bar is visible, studying-count label is faded but still mounted [obligation]', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)
      await startSession(wrapper)

      const label = wrapper.find('[data-testid="study-session__studying-count"]')
      const bar = wrapper.find('[data-testid="ui-kit-progress-bar"]')

      expect(bar.classes()).toContain('opacity-100')
      expect(label.exists()).toBe(true)
      expect(label.classes()).toContain('opacity-0')
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

      expect(wrapper.find('[data-testid="ui-kit-progress-bar__label"]').text()).toContain('1')
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

      expect(wrapper.find('[data-testid="ui-kit-progress-bar__label"]').text()).toContain('1')
    })
  })

  // ── Session completion ─────────────────────────────────────────────────────

  describe('session completion', () => {
    test('with 1 card: finished emits one passed result after Good review', async () => {
      const wrapper = makeSession(1)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.emitted('finished')).toHaveLength(1)
      // [results, remaining_due, study_all_used]
      const [results, remaining_due, study_all_used] = wrapper.emitted('finished')[0]
      expect(results).toHaveLength(1)
      expect(results[0].passed).toBe(true)
      expect(remaining_due).toBe(0)
      expect(study_all_used).toBe(true)
    })

    test('Again rating yields a failed result', async () => {
      const wrapper = makeSession(1)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')
      await flushPromises()

      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.emitted('finished')).toHaveLength(1)
      const [results] = wrapper.emitted('finished')[0]
      expect(results).toHaveLength(1)
      expect(results[0].passed).toBe(false)
    })

    test('mixed ratings: only Good-rated cards are marked passed', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      // First card: Good
      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      // Second card starts at 'front' after first card review — no start needed
      await wrapper.find('[data-testid="rating-buttons__again"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(wrapper.emitted('finished')).toHaveLength(1)
      const [results] = wrapper.emitted('finished')[0]
      expect(results).toHaveLength(2)
      expect(results.filter((result) => result.passed)).toHaveLength(1)
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

  // ── Refresh-resume wiring [obligation] ─────────────────────────────────────

  describe('refresh-resume wiring', () => {
    test('setSessionMeta records the session deck ids into the persisted snapshot [obligation]', async () => {
      const wrapper = makeSession(2, { id: 7 })
      await waitForLoad(wrapper)
      await startSession(wrapper)

      const persisted = JSON.parse(sessionStorage.getItem('study-session'))
      expect(persisted.deck_ids).toEqual([7])
    })

    test('restoring a persisted in-progress session skips the cover screen and does not play the start sfx [obligation]', async () => {
      const deck_data = deck.one({
        overrides: {
          id: 1,
          study_config: {
            study_all_cards: true,
            retry_failed_cards: false,
            show_all_ratings: false
          }
        }
      })
      const remainder_card = card.one({ overrides: { id: 101 } })
      sessionStorage.setItem(
        'study-session',
        JSON.stringify({
          deck_ids: [1],
          card_ids: [101],
          results: [],
          mode: 'studying'
        })
      )
      cardsByIdsRefetchImpl.current = async () => ({
        status: 'success',
        data: [remainder_card],
        error: null
      })

      const wrapper = mount(Session, {
        props: { decks: [deck_data], title: deck_data.title },
        attachTo: document.body,
        global: { stubs: { Card: CardStub } }
      })
      await flushPromises()

      expect(wrapper.find('[data-testid="rating-buttons__start"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="rating-buttons__again"]').exists()).toBe(true)
      expect(mockEmitStudySfx).not.toHaveBeenCalledWith('music_plink_chordyes')
    })
  })

  // ── No decks / empty deck list ─────────────────────────────────────────────

  test('emits closed immediately if decks array is empty [obligation]', async () => {
    const wrapper = mount(Session, {
      props: { decks: [], title: '' },
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

    test('requestClose after reviewing a card routes through the watcher and emits "finished"', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      wrapper.vm.requestClose()
      await flushPromises()

      expect(wrapper.emitted('finished')).toHaveLength(1)
      expect(wrapper.emitted('closed')).toBeFalsy()
    })

    // requestClose flips mode to 'completed'; the watch(mode) watcher fires
    // finishSession() which emits 'finished' — no animation callback involved.
    test('early close after 1 review of 2 cards: results holds only the reviewed card', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      wrapper.vm.requestClose()
      await flushPromises()

      const [results] = wrapper.emitted('finished')[0]
      expect(results).toHaveLength(1)
      expect(results[0].passed).toBe(true)
    })
  })

  // ── toggleRatings: header toggle-ratings → member-wide upsert [obligation] ─

  describe('toggleRatings', () => {
    test('toggling ratings flips the header show_all_ratings prop', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      expect(wrapper.findComponent(SessionHeader).props('show_all_ratings')).toBe(false)

      wrapper.findComponent(SessionHeader).vm.$emit('toggle-ratings')
      await flushPromises()

      expect(wrapper.findComponent(SessionHeader).props('show_all_ratings')).toBe(true)
    })

    test('toggling ratings calls useUpsertMemberMutation with exactly { id, preferences } [obligation]', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      wrapper.findComponent(SessionHeader).vm.$emit('toggle-ratings')
      await flushPromises()

      expect(mockUpsertMember).toHaveBeenCalledOnce()
      expect(mockUpsertMember).toHaveBeenCalledWith({
        id: 'member-1',
        preferences: expect.objectContaining({
          study: expect.objectContaining({ show_all_ratings: true })
        })
      })
      expect(Object.keys(mockUpsertMember.mock.calls[0][0])).toEqual(['id', 'preferences'])
    })

    test('toggling ratings twice restores original value', async () => {
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      const header = wrapper.findComponent(SessionHeader)
      header.vm.$emit('toggle-ratings')
      await flushPromises()
      header.vm.$emit('toggle-ratings')
      await flushPromises()

      const calls = mockUpsertMember.mock.calls
      expect(calls[1][0]).toMatchObject({
        preferences: { study: expect.objectContaining({ show_all_ratings: false }) }
      })
    })

    test('toggleRatings is a no-op when the member store has no id', async () => {
      mockMemberStore.id = undefined
      const wrapper = makeSession(2)
      await waitForLoad(wrapper)

      wrapper.findComponent(SessionHeader).vm.$emit('toggle-ratings')
      await flushPromises()

      expect(mockUpsertMember).not.toHaveBeenCalled()
      mockMemberStore.id = 'member-1'
    })
  })

  // ── Deck cache flush (post-migration to end-of-session invalidation) ───────

  describe('deck cache flush', () => {
    test('flushDeckReviews is not called during per-review saves', async () => {
      const wrapper = makeSession(3)
      await waitForLoad(wrapper)

      await startSession(wrapper)
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

  // ── Multi-deck obligations ─────────────────────────────────────────────────

  describe('multi-deck: finishSession flushes all decks [obligation]', () => {
    test('flushDeckReviews is called for every deck in the session on natural completion', async () => {
      const wrapper = makeMultiDeckSession(1, [10, 20])
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      expect(mockFlushDeckReviews).toHaveBeenCalledTimes(2)
      expect(mockFlushDeckReviews).toHaveBeenCalledWith(10)
      expect(mockFlushDeckReviews).toHaveBeenCalledWith(20)
    })

    test('flushDeckReviews is called for every deck when requestClose after ≥1 review', async () => {
      const wrapper = makeMultiDeckSession(2, [10, 20])
      await waitForLoad(wrapper)

      await startSession(wrapper)
      await wrapper.find('[data-testid="rating-buttons__good"]').trigger('click')
      await flushPromises()
      fireTransitionEnd(wrapper)
      await flushPromises()

      wrapper.vm.requestClose()
      await flushPromises()

      expect(mockFlushDeckReviews).toHaveBeenCalledTimes(2)
      expect(mockFlushDeckReviews).toHaveBeenCalledWith(10)
      expect(mockFlushDeckReviews).toHaveBeenCalledWith(20)
    })
  })

  describe('multi-deck: toggleRatings upserts the member once, not per deck [obligation]', () => {
    test('toggling ratings on a multi-deck session calls useUpsertMemberMutation exactly once', async () => {
      const wrapper = makeMultiDeckSession(2, [10, 20])
      await waitForLoad(wrapper)

      wrapper.findComponent(SessionHeader).vm.$emit('toggle-ratings')
      await flushPromises()

      expect(mockUpsertMember).toHaveBeenCalledOnce()
    })
  })
})
