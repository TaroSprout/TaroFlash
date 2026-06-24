import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import SessionSummary from '@/components/study-session/session-summary/index.vue'

// ── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal CardReviewResult. Only the fields aggregateSession uses
 * are required; everything else defaults to a safe value.
 */
function makeResult(overrides = {}) {
  return {
    card_id: 1,
    front_text: 'What is Vue?',
    is_new: false,
    before_interval: 0,
    after_interval: 1,
    lapses: 0,
    passed: true,
    ...overrides
  }
}

/** Mount SessionSummary with full required props. */
function mountSummary({ results = [], secondary_action = 'study-more' } = {}) {
  return mount(SessionSummary, {
    props: { results, secondary_action }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionSummary (index.vue)', () => {
  // ── Score line ──────────────────────────────────────────────────────────────

  describe('score line', () => {
    test('shows passed count in score line', () => {
      const results = [
        makeResult({ card_id: 1, passed: true }),
        makeResult({ card_id: 2, passed: false }),
        makeResult({ card_id: 3, passed: true })
      ]
      const wrapper = mountSummary({ results })
      const text = wrapper.find('[data-testid="session-summary__score"]').text()
      expect(text).toContain('2')
    })

    test('shows total in score line', () => {
      const results = [makeResult({ card_id: 1 }), makeResult({ card_id: 2 })]
      const wrapper = mountSummary({ results })
      const text = wrapper.find('[data-testid="session-summary__score"]').text()
      expect(text).toContain('2')
    })

    test('score line renders when results is empty', () => {
      const wrapper = mountSummary({ results: [] })
      expect(wrapper.find('[data-testid="session-summary__score"]').exists()).toBe(true)
    })
  })

  // ── Section visibility ──────────────────────────────────────────────────────

  describe('mastery-section visibility', () => {
    test('renders mastery section when reinforced (non-new) cards exist', () => {
      const results = [makeResult({ is_new: false, before_interval: 5, after_interval: 10 })]
      const wrapper = mountSummary({ results })
      expect(wrapper.find('[data-testid="session-summary__mastery"]').exists()).toBe(true)
    })

    test('hides mastery section when all cards are new', () => {
      const results = [makeResult({ is_new: true })]
      const wrapper = mountSummary({ results })
      expect(wrapper.find('[data-testid="session-summary__mastery"]').exists()).toBe(false)
    })

    test('hides mastery section when results is empty', () => {
      const wrapper = mountSummary({ results: [] })
      expect(wrapper.find('[data-testid="session-summary__mastery"]').exists()).toBe(false)
    })
  })

  describe('new-cards-section visibility', () => {
    test('renders new-cards section when new cards exist', () => {
      const results = [makeResult({ is_new: true })]
      const wrapper = mountSummary({ results })
      expect(wrapper.find('[data-testid="session-summary__new"]').exists()).toBe(true)
    })

    test('hides new-cards section when no new cards', () => {
      const results = [makeResult({ is_new: false })]
      const wrapper = mountSummary({ results })
      expect(wrapper.find('[data-testid="session-summary__new"]').exists()).toBe(false)
    })

    test('hides new-cards section when results is empty', () => {
      const wrapper = mountSummary({ results: [] })
      expect(wrapper.find('[data-testid="session-summary__new"]').exists()).toBe(false)
    })
  })

  describe('timeline-section visibility', () => {
    test('renders timeline section when there is at least one result', () => {
      const results = [makeResult()]
      const wrapper = mountSummary({ results })
      expect(wrapper.find('[data-testid="session-summary__timeline"]').exists()).toBe(true)
    })

    test('hides timeline section when results is empty', () => {
      const wrapper = mountSummary({ results: [] })
      expect(wrapper.find('[data-testid="session-summary__timeline"]').exists()).toBe(false)
    })
  })

  describe('leech-section visibility', () => {
    test('renders leech section when a card has !passed && lapses >= 24 && front_text', () => {
      const results = [
        makeResult({ card_id: 99, front_text: 'Hard card', lapses: 24, passed: false })
      ]
      const wrapper = mountSummary({ results })
      expect(wrapper.find('[data-testid="session-summary__leech"]').exists()).toBe(true)
    })

    test('hides leech section when lapses < 24', () => {
      const results = [makeResult({ lapses: 23, passed: false, front_text: 'Card' })]
      const wrapper = mountSummary({ results })
      expect(wrapper.find('[data-testid="session-summary__leech"]').exists()).toBe(false)
    })

    test('hides leech section when passed is true even with high lapses', () => {
      const results = [makeResult({ lapses: 24, passed: true, front_text: 'Card' })]
      const wrapper = mountSummary({ results })
      expect(wrapper.find('[data-testid="session-summary__leech"]').exists()).toBe(false)
    })

    test('hides leech section when front_text is missing', () => {
      const results = [makeResult({ lapses: 24, passed: false, front_text: undefined })]
      const wrapper = mountSummary({ results })
      expect(wrapper.find('[data-testid="session-summary__leech"]').exists()).toBe(false)
    })

    test('hides leech section when results is empty', () => {
      const wrapper = mountSummary({ results: [] })
      expect(wrapper.find('[data-testid="session-summary__leech"]').exists()).toBe(false)
    })
  })

  // ── Close button — emits action with no payload [obligation] ────────────────

  describe('close button', () => {
    test('pressing close button emits "action" with no argument [obligation]', async () => {
      const wrapper = mountSummary()
      await wrapper.find('[data-testid="session-summary__close"]').trigger('click')
      expect(wrapper.emitted('action')).toHaveLength(1)
      expect(wrapper.emitted('action')[0][0]).toBeUndefined()
    })
  })

  // ── Secondary button — emits action with secondary_action payload [obligation]

  describe('secondary button', () => {
    test('pressing secondary button emits "action" with secondary_action value [obligation]', async () => {
      const wrapper = mountSummary({ secondary_action: 'study-more' })
      await wrapper.find('[data-testid="session-summary__secondary"]').trigger('click')
      expect(wrapper.emitted('action')).toHaveLength(1)
      expect(wrapper.emitted('action')[0][0]).toBe('study-more')
    })

    test('study-more label text', () => {
      const wrapper = mountSummary({ secondary_action: 'study-more' })
      expect(wrapper.find('[data-testid="session-summary__secondary"]').text()).toBe('Study more')
    })

    test('study-all label text', () => {
      const wrapper = mountSummary({ secondary_action: 'study-all' })
      expect(wrapper.find('[data-testid="session-summary__secondary"]').text()).toBe('Study all')
    })

    test('study-again label text', () => {
      const wrapper = mountSummary({ secondary_action: 'study-again' })
      expect(wrapper.find('[data-testid="session-summary__secondary"]').text()).toBe('Study again')
    })
  })

  // ── Mixed results ───────────────────────────────────────────────────────────

  test('renders all sections when results include new, reinforced, and leech cards', () => {
    const results = [
      makeResult({ card_id: 1, is_new: true }),
      makeResult({ card_id: 2, is_new: false, before_interval: 5, after_interval: 10 }),
      makeResult({ card_id: 3, front_text: 'Leech card', lapses: 24, passed: false })
    ]
    const wrapper = mountSummary({ results })
    expect(wrapper.find('[data-testid="session-summary__new"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__mastery"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__timeline"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__leech"]').exists()).toBe(true)
  })
})
