import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionSummary from '@/views/study-session/session-summary/index.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// session-summary no longer takes a leech_threshold prop — it reads
// thresholdFor(deck_id) off the injected DeckResolution, so the same
// aggregateSession call can resolve a different threshold per result's deck.

const { mockThresholdFor } = vi.hoisted(() => ({ mockThresholdFor: vi.fn(() => 24) }))

vi.mock('@/views/study-session/deck-resolution', () => ({
  useDeckResolution: () => ({ thresholdFor: mockThresholdFor })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const StatTileStub = defineComponent({
  name: 'StatTile',
  props: ['summary'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'stat-tile-stub',
        'data-stuck-count': props.summary?.stuck_count
      })
  }
})

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeResult(overrides = {}) {
  return {
    card_id: 1,
    front_text: 'What is Vue?',
    is_new: false,
    before_interval: 10,
    after_interval: 20,
    lapses: 0,
    passed: true,
    ...overrides
  }
}

function mountSummary({ results = [] } = {}) {
  return mount(SessionSummary, {
    props: { results },
    global: { stubs: { StatTile: StatTileStub } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionSummary (index.vue)', () => {
  beforeEach(() => {
    mockThresholdFor.mockReset().mockReturnValue(24)
  })

  // ── Structure ───────────────────────────────────────────────────────────────

  test('renders session-summary root', () => {
    const wrapper = mountSummary()
    expect(wrapper.find('[data-testid="session-summary"]').exists()).toBe(true)
  })

  test('renders session-summary__hero section', () => {
    const wrapper = mountSummary()
    expect(wrapper.find('[data-testid="session-summary__hero"]').exists()).toBe(true)
  })

  test('renders session-summary__icon', () => {
    const wrapper = mountSummary()
    expect(wrapper.find('[data-testid="session-summary__icon"]').exists()).toBe(true)
  })

  test('renders session-summary__title', () => {
    const wrapper = mountSummary()
    expect(wrapper.find('[data-testid="session-summary__title"]').exists()).toBe(true)
  })

  // ── No title prop, no session-header [obligation] ─────────────────────────
  // session-summary no longer owns any header chrome — the shell
  // (flashcard-session/index.vue) renders the header via dialog-card's
  // native slots, so session-summary only takes `results` + emits `close`.

  test('does not render a session-header [obligation]', () => {
    const wrapper = mountSummary()
    expect(wrapper.findComponent({ name: 'SessionHeader' }).exists()).toBe(false)
    expect(wrapper.find('[data-testid="session-header"]').exists()).toBe(false)
  })

  test('mounts fine without a title prop [obligation]', () => {
    expect(() => mountSummary()).not.toThrow()
  })

  // ── Score blurb: recalled/total pill spans ────────────────────────────────

  test('score-recalled span shows correct passed count', () => {
    const results = [
      makeResult({ card_id: 1, passed: true }),
      makeResult({ card_id: 2, passed: false }),
      makeResult({ card_id: 3, passed: true })
    ]
    const wrapper = mountSummary({ results })
    expect(wrapper.find('[data-testid="session-summary__score-recalled"]').text()).toBe('2')
  })

  test('score-total span shows total count', () => {
    const results = [makeResult({ card_id: 1 }), makeResult({ card_id: 2 })]
    const wrapper = mountSummary({ results })
    expect(wrapper.find('[data-testid="session-summary__score-total"]').text()).toBe('2')
  })

  test('score-recalled renders with 0 when no results', () => {
    const wrapper = mountSummary({ results: [] })
    expect(wrapper.find('[data-testid="session-summary__score-recalled"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="session-summary__score-total"]').text()).toBe('0')
  })

  // ── Stat tile rendered ─────────────────────────────────────────────────────

  test('renders the stat-tile stub', () => {
    const wrapper = mountSummary()
    expect(wrapper.find('[data-testid="stat-tile-stub"]').exists()).toBe(true)
  })

  // ── thresholdFor(deck_id) threading [obligation] ──────────────────────────
  // session-summary passes DeckResolution's thresholdFor into aggregateSession —
  // a different threshold on the same results must change the derived summary.

  test('passes thresholdFor into aggregateSession, changing stuck_count for the same results [obligation]', () => {
    const results = [makeResult({ card_id: 1, passed: false, lapses: 10 })]

    mockThresholdFor.mockReturnValue(8)
    const low_threshold = mountSummary({ results })

    mockThresholdFor.mockReturnValue(24)
    const high_threshold = mountSummary({ results })

    expect(
      low_threshold.find('[data-testid="stat-tile-stub"]').attributes('data-stuck-count')
    ).toBe('1')
    expect(
      high_threshold.find('[data-testid="stat-tile-stub"]').attributes('data-stuck-count')
    ).toBe('0')
  })

  test('resolves each result own deck threshold via thresholdFor(deck_id), per deck [obligation]', () => {
    const threshold_by_deck = { 1: 4, 2: 30 }
    mockThresholdFor.mockImplementation((deck_id) => threshold_by_deck[deck_id])

    const results = [
      makeResult({ card_id: 1, deck_id: 1, passed: false, lapses: 5 }),
      makeResult({ card_id: 2, deck_id: 2, passed: false, lapses: 5 })
    ]
    const wrapper = mountSummary({ results })

    // deck 1's threshold (4) is crossed by lapses=5; deck 2's threshold (30) is not.
    expect(wrapper.find('[data-testid="stat-tile-stub"]').attributes('data-stuck-count')).toBe('1')
    expect(mockThresholdFor).toHaveBeenCalledWith(1)
    expect(mockThresholdFor).toHaveBeenCalledWith(2)
  })

  // ── Footer close button emits close [obligation] ──────────────────────────

  test('close button emits close event [obligation]', async () => {
    const wrapper = mountSummary()
    await wrapper.find('[data-testid="session-summary__close"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
