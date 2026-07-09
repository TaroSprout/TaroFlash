import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SessionSummary from '@/views/study-session/session-summary/index.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const StatTileStub = defineComponent({
  name: 'StatTile',
  props: ['summary'],
  setup() {
    return () => h('div', { 'data-testid': 'stat-tile-stub' })
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

  // ── Footer close button emits close [obligation] ──────────────────────────

  test('close button emits close event [obligation]', async () => {
    const wrapper = mountSummary()
    await wrapper.find('[data-testid="session-summary__close"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
