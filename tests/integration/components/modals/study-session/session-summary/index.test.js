import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionSummary from '@/views/study-session/session-summary/index.vue'
import { dialogCardViewportKey } from '@/components/layout-kit/dialog-card/dialog-card-viewport'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// session-summary reads thresholdFor(deck_id) off the injected DeckResolution,
// so the same aggregateSession call can resolve a different threshold per
// result's own deck.

const { mockThresholdFor, mockIsLive } = vi.hoisted(() => ({
  mockThresholdFor: vi.fn(() => 24),
  mockIsLive: vi.fn(() => false)
}))

vi.mock('@/views/study-session/deck-resolution', () => ({
  useDeckResolution: () => ({ thresholdFor: mockThresholdFor })
}))

vi.mock('@/api/capabilities', () => ({
  useCapabilities: () => ({ isLive: mockIsLive })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const StatsPanelStub = defineComponent({
  name: 'StatsPanel',
  props: ['summary'],
  emits: ['select'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'stats-panel-stub',
        'data-stuck-count': props.summary?.groups?.stuck?.length,
        onClick: () => emit('select', 'stuck')
      })
  }
})

// ── Fixtures ─────────────────────────────────────────────────────────────────

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

function mountSummary({ results = [], earnings = null } = {}) {
  return mount(SessionSummary, {
    props: { results, earnings },
    global: {
      stubs: { StatsPanel: StatsPanelStub },
      provide: { [dialogCardViewportKey]: { value: 'desktop' } }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionSummary (index.vue)', () => {
  beforeEach(() => {
    mockThresholdFor.mockReset().mockReturnValue(24)
    mockIsLive.mockReset().mockReturnValue(false)
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

  test('mounts fine without extra props', () => {
    expect(() => mountSummary()).not.toThrow()
  })

  // ── Close button removed ─────────────────────────────────────
  // The close button moved up into study-session/index.vue's #toolbar;
  // session-summary no longer renders it or emits close.

  test('does not render a close button', () => {
    const wrapper = mountSummary()
    expect(wrapper.find('[data-testid="session-summary__close"]').exists()).toBe(false)
  })

  test('does not emit close', () => {
    const wrapper = mountSummary()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  // ── StatsPanel wiring ──────────────────────────────────────────────────────

  test('renders the stats-panel stub', () => {
    const wrapper = mountSummary()
    expect(wrapper.find('[data-testid="stats-panel-stub"]').exists()).toBe(true)
  })

  test('forwards the stats-panel select event as open-category', async () => {
    const wrapper = mountSummary()
    await wrapper.find('[data-testid="stats-panel-stub"]').trigger('click')
    expect(wrapper.emitted('open-category')).toEqual([['stuck']])
  })

  // ── thresholdFor(deck_id) threading ──────────────────────────
  // session-summary passes DeckResolution's thresholdFor into aggregateSession —
  // a different threshold on the same results must change the derived summary.

  test('passes thresholdFor into aggregateSession, changing the stuck group for the same results', () => {
    const results = [makeResult({ card_id: 1, passed: false, lapses: 10 })]

    mockThresholdFor.mockReturnValue(8)
    const low_threshold = mountSummary({ results })

    mockThresholdFor.mockReturnValue(24)
    const high_threshold = mountSummary({ results })

    expect(
      low_threshold.find('[data-testid="stats-panel-stub"]').attributes('data-stuck-count')
    ).toBe('1')
    expect(
      high_threshold.find('[data-testid="stats-panel-stub"]').attributes('data-stuck-count')
    ).toBe('0')
  })

  test('resolves each result own deck threshold via thresholdFor(deck_id), per deck', () => {
    const threshold_by_deck = { 1: 4, 2: 30 }
    mockThresholdFor.mockImplementation((deck_id) => threshold_by_deck[deck_id])

    const results = [
      makeResult({ card_id: 1, deck_id: 1, passed: false, lapses: 5 }),
      makeResult({ card_id: 2, deck_id: 2, passed: false, lapses: 5 })
    ]
    const wrapper = mountSummary({ results })

    // deck 1's threshold (4) is crossed by lapses=5; deck 2's threshold (30) is not.
    expect(wrapper.find('[data-testid="stats-panel-stub"]').attributes('data-stuck-count')).toBe(
      '1'
    )
    expect(mockThresholdFor).toHaveBeenCalledWith(1)
    expect(mockThresholdFor).toHaveBeenCalledWith(2)
  })

  // ── Earnings block ────────────────────────────────────────────────────────

  test('renders the base, bonus, and balance amounts verbatim in their respective slots', () => {
    mockIsLive.mockReturnValue(true)
    const wrapper = mountSummary({ earnings: { base: 2, bonus: 1, balance: 340 } })

    const amounts = wrapper.findAll('[data-testid="ui-kit-paperclips__amount"]')
    expect(amounts[0].text()).toBe('2')
    expect(amounts[1].text()).toBe('1')
    expect(amounts[2].text()).toBe('340')
  })

  test('does not render the earnings block when session_rewards is not live', () => {
    mockIsLive.mockReturnValue(false)
    const wrapper = mountSummary({ earnings: { base: 2, bonus: 1, balance: 340 } })

    expect(wrapper.find('[data-testid="session-summary__earnings"]').exists()).toBe(false)
  })

  test('does not render the earnings block when earnings is null, even when live', () => {
    mockIsLive.mockReturnValue(true)
    const wrapper = mountSummary({ earnings: null })

    expect(wrapper.find('[data-testid="session-summary__earnings"]').exists()).toBe(false)
  })

  test('does not render the earnings block when both base and bonus are 0, even when live with non-null earnings', () => {
    mockIsLive.mockReturnValue(true)
    const wrapper = mountSummary({ earnings: { base: 0, bonus: 0, balance: 340 } })

    expect(wrapper.find('[data-testid="session-summary__earnings"]').exists()).toBe(false)
  })

  test('renders the earnings block when live, non-null earnings, and base > 0', () => {
    mockIsLive.mockReturnValue(true)
    const wrapper = mountSummary({ earnings: { base: 2, bonus: 0, balance: 340 } })

    expect(wrapper.find('[data-testid="session-summary__earnings"]').exists()).toBe(true)
  })

  test('hides the base line when base is 0 but bonus is not', () => {
    mockIsLive.mockReturnValue(true)
    const wrapper = mountSummary({ earnings: { base: 0, bonus: 1, balance: 340 } })

    expect(wrapper.find('[data-testid="session-summary__earnings-heading"]').exists()).toBe(false)
  })

  test('shows the base line when base is at least 1', () => {
    mockIsLive.mockReturnValue(true)
    const wrapper = mountSummary({ earnings: { base: 1, bonus: 0, balance: 340 } })

    expect(wrapper.find('[data-testid="session-summary__earnings-heading"]').exists()).toBe(true)
  })

  test('hides the difficulty bonus line when bonus is 0 but base is not', () => {
    mockIsLive.mockReturnValue(true)
    const wrapper = mountSummary({ earnings: { base: 1, bonus: 0, balance: 340 } })

    expect(wrapper.find('[data-testid="session-summary__earnings-bonus"]').exists()).toBe(false)
  })

  test('shows the difficulty bonus line when bonus is at least 1', () => {
    mockIsLive.mockReturnValue(true)
    const wrapper = mountSummary({ earnings: { base: 0, bonus: 1, balance: 340 } })

    expect(wrapper.find('[data-testid="session-summary__earnings-bonus"]').exists()).toBe(true)
  })

  test('shows all three earnings lines when both base and bonus are at least 1', () => {
    mockIsLive.mockReturnValue(true)
    const wrapper = mountSummary({ earnings: { base: 2, bonus: 1, balance: 340 } })

    expect(wrapper.find('[data-testid="session-summary__earnings-heading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__earnings-bonus"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__earnings-balance"]').exists()).toBe(true)
  })
})
