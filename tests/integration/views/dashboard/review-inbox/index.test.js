import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// Only functions go in vi.hoisted — Vue ref() is not available there.

const { studyStartMock, prevMock, nextMock } = vi.hoisted(() => ({
  studyStartMock: vi.fn(),
  prevMock: vi.fn(),
  nextMock: vi.fn()
}))

// Reactive state shared between the mock factory and tests. Created at module
// level (not inside vi.hoisted) so Vue's ref() is available.
const hasOverflowRef = ref(false)
const canScrollPrevRef = ref(false)
const canScrollNextRef = ref(false)

vi.mock('@/views/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: studyStartMock })
}))

vi.mock('@/views/dashboard/use-review-inbox-scroll', () => ({
  useReviewInboxScroll: () => ({
    items_el: ref(null),
    has_overflow: hasOverflowRef,
    can_scroll_prev: canScrollPrevRef,
    can_scroll_next: canScrollNextRef,
    prev: prevMock,
    next: nextMock
  })
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

const ReviewInboxNavButtonStub = defineComponent({
  name: 'ReviewInboxNavButton',
  props: ['direction', 'disabled'],
  emits: ['press'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        'data-testid': `review-inbox__${props.direction}-btn`,
        'data-disabled': String(!!props.disabled),
        onClick: () => emit('press')
      })
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountInbox(due_decks) {
  return shallowMount(ReviewInbox, {
    props: { due_decks },
    global: {
      stubs: {
        ReviewInboxItem: ReviewInboxItemStub,
        ReviewInboxNavButton: ReviewInboxNavButtonStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  hasOverflowRef.value = false
  canScrollPrevRef.value = false
  canScrollNextRef.value = false
})

describe('ReviewInbox — renders every due deck', () => {
  test('renders one item per due deck, with no VISIBLE_COUNT cap', () => {
    const wrapper = mountInbox(makeDecks(5))
    expect(wrapper.findAll('[data-testid="review-inbox-item"]')).toHaveLength(5)
  })

  test('renders zero items when due_decks is empty', () => {
    const wrapper = mountInbox([])
    expect(wrapper.findAll('[data-testid="review-inbox-item"]')).toHaveLength(0)
  })
})

describe('ReviewInbox — nav buttons gated on has_overflow', () => {
  test('does not render nav buttons when has_overflow is false', () => {
    hasOverflowRef.value = false
    const wrapper = mountInbox(makeDecks(2))
    expect(wrapper.find('[data-testid="review-inbox__prev-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="review-inbox__next-btn"]').exists()).toBe(false)
  })

  test('renders both nav buttons when has_overflow is true', () => {
    hasOverflowRef.value = true
    const wrapper = mountInbox(makeDecks(6))
    expect(wrapper.find('[data-testid="review-inbox__prev-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="review-inbox__next-btn"]').exists()).toBe(true)
  })

  test('forwards can_scroll_prev / can_scroll_next as the disabled prop', () => {
    hasOverflowRef.value = true
    canScrollPrevRef.value = false
    canScrollNextRef.value = true
    const wrapper = mountInbox(makeDecks(6))

    expect(wrapper.find('[data-testid="review-inbox__prev-btn"]').attributes('data-disabled')).toBe(
      'true'
    )
    expect(wrapper.find('[data-testid="review-inbox__next-btn"]').attributes('data-disabled')).toBe(
      'false'
    )
  })
})

describe('ReviewInbox — nav button press calls composable prev/next', () => {
  test('pressing the prev button calls prev()', async () => {
    hasOverflowRef.value = true
    const wrapper = mountInbox(makeDecks(6))
    await wrapper.find('[data-testid="review-inbox__prev-btn"]').trigger('click')
    expect(prevMock).toHaveBeenCalledTimes(1)
  })

  test('pressing the next button calls next()', async () => {
    hasOverflowRef.value = true
    const wrapper = mountInbox(makeDecks(6))
    await wrapper.find('[data-testid="review-inbox__next-btn"]').trigger('click')
    expect(nextMock).toHaveBeenCalledTimes(1)
  })
})

describe('ReviewInbox — clicking an item starts a study session for just that deck', () => {
  test('clicking a deck item calls study_session.start with only that deck', async () => {
    const decks = makeDecks(3)
    const wrapper = mountInbox(decks)
    await wrapper.findAll('[data-testid="review-inbox-item"]')[1].trigger('click')
    expect(studyStartMock).toHaveBeenCalledWith([decks[1]])
  })
})
