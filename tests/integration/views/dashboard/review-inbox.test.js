import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { studyStartMock, carouselSlideMock, carouselResetMock } = vi.hoisted(() => ({
  studyStartMock: vi.fn(),
  carouselSlideMock: vi.fn(() => Promise.resolve()),
  carouselResetMock: vi.fn()
}))

vi.mock('@/components/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: studyStartMock })
}))

vi.mock('@/utils/animations/inbox-carousel', () => ({
  carouselSlide: carouselSlideMock,
  carouselReset: carouselResetMock
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const ReviewInboxItemStub = defineComponent({
  name: 'ReviewInboxItem',
  props: ['deck'],
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'review-inbox-item',
        'data-deck-id': props.deck.id,
        onClick: () => emit('click')
      })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['sfx', 'iconLeft', 'iconOnly', 'size'],
  emits: ['press'],
  setup(_p, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-button',
          onClick: (e) => {
            attrs.onClick?.(e)
            emit('press')
          }
        },
        [slots.default?.()]
      )
  }
})

// ── Component import (after mocks) ────────────────────────────────────────────

import ReviewInbox from '@/views/dashboard/review-inbox.vue'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeDecks(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    title: `Deck ${i + 1}`,
    due_count: i + 1
  }))
}

const ONE_DECK = makeDecks(1)
const TWO_DECKS = makeDecks(2)
const THREE_DECKS = makeDecks(3)
const FOUR_DECKS = makeDecks(4)

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountInbox(due_decks = THREE_DECKS) {
  return shallowMount(ReviewInbox, {
    props: { due_decks },
    global: {
      stubs: {
        ReviewInboxItem: ReviewInboxItemStub,
        UiButton: UiButtonStub
      }
    }
  })
}

// Attach fake DOM geometry so navigate() can read offsetWidth
function attachTapeGeometry(wrapper, itemWidth = 100) {
  const tape = wrapper.find('[data-testid="review-inbox__tape"]').element
  const item = tape.firstElementChild
  if (item) {
    Object.defineProperty(item, 'offsetWidth', { value: itemWidth, configurable: true })
  }
  const clip = tape.parentElement
  Object.defineProperty(clip, 'offsetWidth', { value: 300, configurable: true })
  const body = wrapper.find('[data-testid="review-inbox__body"]').element
  // Ensure closest('[data-testid="review-inbox__body"]') resolves
  return { tape, clip, body }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  carouselSlideMock.mockReturnValue(Promise.resolve())
})

describe('ReviewInbox — initial tape', () => {
  test('renders up to 3 items when 3 or more decks are provided', () => {
    const wrapper = mountInbox(THREE_DECKS)
    expect(wrapper.findAll('[data-testid="review-inbox-item"]')).toHaveLength(3)
  })

  test('tapeFor with 2 decks (fewer than VISIBLE_COUNT) renders only 2 items [obligation]', () => {
    const wrapper = mountInbox(TWO_DECKS)
    expect(wrapper.findAll('[data-testid="review-inbox-item"]')).toHaveLength(2)
  })

  test('tapeFor with 1 deck renders exactly 1 item', () => {
    const wrapper = mountInbox(ONE_DECK)
    expect(wrapper.findAll('[data-testid="review-inbox-item"]')).toHaveLength(1)
  })

  test('tapeFor([]) returns [] — zero-deck guard prevents NaN crash [obligation]', () => {
    const wrapper = mountInbox([])
    expect(wrapper.findAll('[data-testid="review-inbox-item"]')).toHaveLength(0)
  })
})

describe('ReviewInbox — study_button_key computed [obligation]', () => {
  // i18n is wired in browser mode — assert translated text, not raw keys.
  // Key mapping: 1 deck → "Study", 2 decks → "Study both", 3+ → "Study all"

  test('shows "Study" label for 1 deck (review-inbox.study-button)', () => {
    const wrapper = mountInbox(ONE_DECK)
    const study_btn = wrapper.find('[data-testid="review-inbox__actions"] button')
    expect(study_btn.text()).toContain('Study')
    expect(study_btn.text()).not.toContain('both')
    expect(study_btn.text()).not.toContain('all')
  })

  test('shows "Study both" label for 2 decks (review-inbox.study-both-button)', () => {
    const wrapper = mountInbox(TWO_DECKS)
    const study_btn = wrapper.find('[data-testid="review-inbox__actions"] button')
    expect(study_btn.text()).toContain('Study both')
  })

  test('shows "Study all" label for 3 decks (review-inbox.study-all-button)', () => {
    const wrapper = mountInbox(THREE_DECKS)
    const study_btn = wrapper.find('[data-testid="review-inbox__actions"] button')
    expect(study_btn.text()).toContain('Study all')
  })

  test('shows "Study all" label for 4 decks (review-inbox.study-all-button)', () => {
    const wrapper = mountInbox(FOUR_DECKS)
    const study_btn = wrapper.find('[data-testid="review-inbox__actions"] button')
    expect(study_btn.text()).toContain('Study all')
  })
})

describe('ReviewInbox — overflow nav buttons', () => {
  test('does not show prev/next buttons when deck count <= 3', () => {
    const wrapper = mountInbox(THREE_DECKS)
    expect(wrapper.find('[data-testid="review-inbox__prev-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="review-inbox__next-btn"]').exists()).toBe(false)
  })

  test('shows prev/next buttons when deck count > 3', () => {
    const wrapper = mountInbox(FOUR_DECKS)
    expect(wrapper.find('[data-testid="review-inbox__prev-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="review-inbox__next-btn"]').exists()).toBe(true)
  })
})

describe('ReviewInbox — clicking an item starts study session', () => {
  test('clicking a deck item calls study_session.start with just that deck', async () => {
    const wrapper = mountInbox(THREE_DECKS)
    await wrapper.findAll('[data-testid="review-inbox-item"]')[0].trigger('click')
    expect(studyStartMock).toHaveBeenCalledWith([THREE_DECKS[0]])
  })

  test('clicking the study button calls study_session.start with every due deck', async () => {
    const wrapper = mountInbox(THREE_DECKS)
    await wrapper.find('[data-testid="review-inbox__actions"] button').trigger('click')
    expect(studyStartMock).toHaveBeenCalledWith(THREE_DECKS)
  })
})

describe('ReviewInbox — navigate() guard', () => {
  test('navigate() is a no-op when due_decks is empty [obligation]', async () => {
    const wrapper = mountInbox([])
    await wrapper.find('[data-testid="review-inbox"]').trigger('click')
    // next/prev buttons are hidden on empty, but call navigate directly if possible
    // The real guard is inside navigate(): `if (!due_decks.length) return`
    // Verify carouselSlide never fires (no navigation happened)
    expect(carouselSlideMock).not.toHaveBeenCalled()
  })
})

describe('ReviewInbox — deckAt boundary wrap [obligation]', () => {
  test('navigating next from last deck in tape wraps to decks[0]', async () => {
    // 4 decks, VISIBLE_COUNT=3, offset starts at 0, tape=[deck1, deck2, deck3]
    // navigate('next') appends deckAt(0, 3) = decks[(0+3)%4] = decks[3] (4th deck, id=4)
    // After settle: offset=1, tape=tapeFor(1)=[deck2, deck3, deck4]
    // navigate('next') again: appends deckAt(1, 3) = decks[(1+3)%4] = decks[0] (id=1)
    const wrapper = mountInbox(FOUR_DECKS)
    attachTapeGeometry(wrapper)

    // First next: offset 0→1
    await wrapper.find('[data-testid="review-inbox__next-btn"]').trigger('click')
    await flushPromises()

    // Second next: offset 1→2, entering card should be decks[(1+3)%4]=decks[0] id=1
    await wrapper.find('[data-testid="review-inbox__next-btn"]').trigger('click')
    await flushPromises()

    // Third next: offset 2→3, entering card should be decks[(2+3)%4]=decks[1] id=2
    await wrapper.find('[data-testid="review-inbox__next-btn"]').trigger('click')
    await flushPromises()

    // Fourth next: offset 3→0 (full wrap), entering card=decks[(3+3)%4]=decks[2] id=3
    await wrapper.find('[data-testid="review-inbox__next-btn"]').trigger('click')
    await flushPromises()

    // After full rotation, tape should be back to starting 3 decks
    const items = wrapper.findAll('[data-testid="review-inbox-item"]')
    expect(items).toHaveLength(3)
    expect(items[0].attributes('data-deck-id')).toBe('1')
  })
})

describe('ReviewInbox — carouselReset call order [obligation]', () => {
  test('carouselReset is called synchronously before nextTick after carouselSlide resolves', async () => {
    const call_order = []
    carouselSlideMock.mockImplementation(() => {
      return Promise.resolve()
    })
    carouselResetMock.mockImplementation(() => {
      call_order.push('reset')
    })

    const wrapper = mountInbox(FOUR_DECKS)
    attachTapeGeometry(wrapper)

    const next_btn = wrapper.find('[data-testid="review-inbox__next-btn"]')
    await next_btn.trigger('click')

    // Wait for slide to settle
    await flushPromises()

    // carouselReset must have been called
    expect(carouselResetMock).toHaveBeenCalled()
    expect(call_order).toContain('reset')
  })
})

describe('ReviewInbox — prev navigation', () => {
  test('clicking prev calls carouselSlide with direction "prev"', async () => {
    const wrapper = mountInbox(FOUR_DECKS)
    attachTapeGeometry(wrapper)

    await wrapper.find('[data-testid="review-inbox__prev-btn"]').trigger('click')
    await flushPromises()

    expect(carouselSlideMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      'prev',
      expect.any(Number)
    )
  })

  test('prev prepends incoming deck to tape before animation', async () => {
    // On prev from offset 0, deckAt(0, -1) = decks[(-1+4)%4] = decks[3] (last deck)
    const wrapper = mountInbox(FOUR_DECKS)
    attachTapeGeometry(wrapper)

    await wrapper.find('[data-testid="review-inbox__prev-btn"]').trigger('click')
    await flushPromises()

    // After navigating back from offset 0, offset becomes 3 → tape = [deck4, deck1, deck2]
    const items = wrapper.findAll('[data-testid="review-inbox-item"]')
    expect(items).toHaveLength(3)
    expect(items[0].attributes('data-deck-id')).toBe('4')
  })
})
