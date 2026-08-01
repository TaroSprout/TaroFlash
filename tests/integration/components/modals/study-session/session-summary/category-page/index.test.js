import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import CategoryPage from '@/views/study-session/session-summary/category-page/index.vue'
import { dialogCardViewportKey } from '@/components/layout-kit/dialog-card/dialog-card-viewport'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockThresholdFor,
  mockCards,
  mockEditingCard,
  mockOnSummaryEditUpdate,
  mockStopSummaryEdit
} = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    mockThresholdFor: vi.fn(() => 24),
    mockCards: ref([]),
    mockEditingCard: ref(undefined),
    mockOnSummaryEditUpdate: vi.fn(),
    mockStopSummaryEdit: vi.fn()
  }
})

vi.mock('@/views/study-session/deck-resolution', () => ({
  useDeckResolution: () => ({ thresholdFor: mockThresholdFor })
}))

vi.mock('@/views/study-session/composables/session-controller', () => ({
  useInjectedStudySessionController: () => ({
    cards: mockCards,
    summary_editing_card: mockEditingCard,
    onSummaryEditUpdate: mockOnSummaryEditUpdate,
    stopSummaryEdit: mockStopSummaryEdit
  })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const CategorySectionStub = defineComponent({
  name: 'CategorySection',
  props: ['name', 'heading', 'cards'],
  setup(props) {
    return () =>
      h(
        'div',
        {
          'data-testid': `category-section-stub-${props.name}`,
          'data-heading': props.heading ?? '',
          'data-card-ids': props.cards.map((c) => c.id).join(',')
        },
        []
      )
  }
})

const SummaryCardEditorStub = defineComponent({
  name: 'SummaryCardEditor',
  props: ['card'],
  emits: ['update', 'done'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'summary-card-editor-stub',
        'data-card-id': props.card?.id
      })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return { id: 1, deck_id: 1, front_text: 'Q', back_text: 'A', state: 'passed', ...overrides }
}

function makeResult(overrides = {}) {
  return {
    card_id: 1,
    is_new: false,
    before_interval: 10,
    after_interval: 20,
    lapses: 0,
    passed: true,
    ...overrides
  }
}

function mountPage({ results = [], category = 'correct', cards = [] } = {}) {
  mockCards.value = cards
  return mount(CategoryPage, {
    props: { results, category },
    global: {
      stubs: { CategorySection: CategorySectionStub, SummaryCardEditor: SummaryCardEditorStub },
      provide: { [dialogCardViewportKey]: { value: 'desktop' } }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CategoryPage (category-page/index.vue)', () => {
  beforeEach(() => {
    mockThresholdFor.mockReset().mockReturnValue(24)
    mockEditingCard.value = undefined
    mockOnSummaryEditUpdate.mockClear()
    mockStopSummaryEdit.mockClear()
  })

  describe('card editor sub-state [obligation]', () => {
    test('renders the grid, not the editor, when nothing is being edited [obligation]', () => {
      const cards = [makeCard({ id: 1 })]
      const results = [makeResult({ card_id: 1, is_new: true })]
      const wrapper = mountPage({ results, category: 'new', cards })

      expect(wrapper.find('[data-testid="session-summary-category__content"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="summary-card-editor-stub"]').exists()).toBe(false)
    })

    test('renders the editor instead of the grid when summary_editing_card is set [obligation]', () => {
      const cards = [makeCard({ id: 1 })]
      const results = [makeResult({ card_id: 1, is_new: true })]
      mockEditingCard.value = makeCard({ id: 1 })
      const wrapper = mountPage({ results, category: 'new', cards })

      expect(
        wrapper.find('[data-testid="summary-card-editor-stub"]').attributes('data-card-id')
      ).toBe('1')
      expect(wrapper.find('[data-testid="session-summary-category__content"]').exists()).toBe(false)
    })

    test('forwards the editor update event to onSummaryEditUpdate [obligation]', async () => {
      mockEditingCard.value = makeCard({ id: 1 })
      const wrapper = mountPage({ results: [], category: 'new', cards: [] })

      await wrapper
        .findComponent(SummaryCardEditorStub)
        .vm.$emit('update', 'front', 'New front text')

      expect(mockOnSummaryEditUpdate).toHaveBeenCalledWith('front', 'New front text')
    })

    test('forwards the editor done event to stopSummaryEdit [obligation]', async () => {
      mockEditingCard.value = makeCard({ id: 1 })
      const wrapper = mountPage({ results: [], category: 'new', cards: [] })

      await wrapper.findComponent(SummaryCardEditorStub).vm.$emit('done')

      expect(mockStopSummaryEdit).toHaveBeenCalledOnce()
    })
  })

  describe('correct category [obligation]', () => {
    test('renders two sections: correct and incorrect', () => {
      const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
      const results = [
        makeResult({ card_id: 1, passed: true }),
        makeResult({ card_id: 2, passed: false })
      ]
      const wrapper = mountPage({ results, category: 'correct', cards })

      expect(wrapper.find('[data-testid="category-section-stub-correct"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="category-section-stub-incorrect"]').exists()).toBe(true)
    })

    test('filters out the empty section when everything passed', () => {
      const cards = [makeCard({ id: 1 })]
      const results = [makeResult({ card_id: 1, passed: true })]
      const wrapper = mountPage({ results, category: 'correct', cards })

      expect(wrapper.find('[data-testid="category-section-stub-correct"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="category-section-stub-incorrect"]').exists()).toBe(false)
    })

    test('filters out the empty section when everything failed', () => {
      const cards = [makeCard({ id: 1 })]
      const results = [makeResult({ card_id: 1, passed: false })]
      const wrapper = mountPage({ results, category: 'correct', cards })

      expect(wrapper.find('[data-testid="category-section-stub-correct"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="category-section-stub-incorrect"]').exists()).toBe(true)
    })
  })

  describe('non-correct categories [obligation]', () => {
    test('renders a single unlabelled section for a non-correct category', () => {
      const cards = [makeCard({ id: 1 })]
      const results = [makeResult({ card_id: 1, is_new: true })]
      const wrapper = mountPage({ results, category: 'new', cards })

      const section = wrapper.find('[data-testid="category-section-stub-new"]')
      expect(section.exists()).toBe(true)
      expect(section.attributes('data-heading')).toBe('')
      expect(wrapper.find('[data-testid="category-section-stub-correct"]').exists()).toBe(false)
    })
  })

  describe('result → card resolution [obligation]', () => {
    test('resolves results to real cards from the injected controller by id', () => {
      const cards = [makeCard({ id: 5 }), makeCard({ id: 6 })]
      const results = [
        makeResult({ card_id: 5, is_new: true }),
        makeResult({ card_id: 6, is_new: true })
      ]
      const wrapper = mountPage({ results, category: 'new', cards })

      expect(
        wrapper.find('[data-testid="category-section-stub-new"]').attributes('data-card-ids')
      ).toBe('5,6')
    })

    test('silently drops a result whose card is absent from the injected cards [obligation]', () => {
      const cards = [makeCard({ id: 5 })]
      const results = [
        makeResult({ card_id: 5, is_new: true }),
        makeResult({ card_id: 999, is_new: true })
      ]
      const wrapper = mountPage({ results, category: 'new', cards })

      expect(
        wrapper.find('[data-testid="category-section-stub-new"]').attributes('data-card-ids')
      ).toBe('5')
    })
  })

  describe('empty state', () => {
    test('shows the empty fallback for the correct category when both its sections filter out empty', () => {
      // Only `correct` filters empty sections out of the list entirely — every
      // other category always renders its one (possibly empty) section.
      const wrapper = mountPage({ results: [], category: 'correct', cards: [] })
      expect(wrapper.find('[data-testid="session-summary-category__empty"]').exists()).toBe(true)
    })

    test('hides the empty fallback when at least one section has cards', () => {
      const cards = [makeCard({ id: 1 })]
      const results = [makeResult({ card_id: 1, is_new: true })]
      const wrapper = mountPage({ results, category: 'new', cards })

      expect(wrapper.find('[data-testid="session-summary-category__empty"]').exists()).toBe(false)
    })
  })
})
