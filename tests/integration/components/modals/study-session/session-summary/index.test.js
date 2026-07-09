import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, computed } from 'vue'
import SessionSummary from '@/components/flashcard-session/session-summary/index.vue'
import { dialogCardViewportKey } from '@/components/layout-kit/dialog-card/dialog-card-viewport'
import { deck } from '../../../../../fixtures/deck'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Stub session-header to control @stop emission and check show_menu/title
const SessionHeaderStub = defineComponent({
  name: 'SessionHeader',
  props: ['title', 'is_cover', 'show_menu'],
  emits: ['stop'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        { 'data-testid': 'session-header-stub', 'data-show-menu': String(props.show_menu) },
        [h('button', { 'data-testid': 'header-stop-btn', onClick: () => emit('stop') }, 'X')]
      )
  }
})

// Stub stat-tile so we don't need to provide viewport for it
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

function makeDeck(overrides = {}) {
  return deck.one({ overrides: { title: 'My Test Deck', ...overrides } })
}

function mountSummary({ results = [], deck_data = makeDeck() } = {}) {
  return mount(SessionSummary, {
    props: { title: deck_data.title, results },
    global: {
      stubs: {
        SessionHeader: SessionHeaderStub,
        StatTile: StatTileStub
      },
      provide: {
        // Provide the viewport injection so useDialogCardViewport() doesn't throw
        [dialogCardViewportKey]: computed(() => 'desktop')
      }
    }
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

  // ── Header: deck title + show_menu=false [obligation] ─────────────────────

  test('session-header receives deck title [obligation]', () => {
    const wrapper = mountSummary({ deck_data: makeDeck({ title: 'Kanji N3' }) })
    // The stub forwards props — title is passed through to SessionHeader
    expect(wrapper.findComponent({ name: 'SessionHeader' }).props('title')).toBe('Kanji N3')
  })

  test('session-header receives show_menu=false [obligation]', () => {
    const wrapper = mountSummary()
    const header = wrapper.find('[data-testid="session-header-stub"]')
    expect(header.attributes('data-show-menu')).toBe('false')
  })

  // ── Header X → emits close [obligation] ───────────────────────────────────

  test('header @stop (X button) emits close [obligation]', async () => {
    const wrapper = mountSummary()
    await wrapper.find('[data-testid="header-stop-btn"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  // ── Score blurb: recalled/total pill spans [obligation] ──────────────────

  test('score-recalled span shows correct passed count [obligation]', () => {
    const results = [
      makeResult({ card_id: 1, passed: true }),
      makeResult({ card_id: 2, passed: false }),
      makeResult({ card_id: 3, passed: true })
    ]
    const wrapper = mountSummary({ results })
    expect(wrapper.find('[data-testid="session-summary__score-recalled"]').text()).toBe('2')
  })

  test('score-total span shows total count [obligation]', () => {
    const results = [makeResult({ card_id: 1 }), makeResult({ card_id: 2 })]
    const wrapper = mountSummary({ results })
    expect(wrapper.find('[data-testid="session-summary__score-total"]').text()).toBe('2')
  })

  test('score-recalled renders with 0 when no results', () => {
    const wrapper = mountSummary({ results: [] })
    expect(wrapper.find('[data-testid="session-summary__score-recalled"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="session-summary__score-total"]').text()).toBe('0')
  })

  // ── Stat tile rendered [obligation] ───────────────────────────────────────

  test('renders the stat-tile stub [obligation]', () => {
    const wrapper = mountSummary()
    expect(wrapper.find('[data-testid="stat-tile-stub"]').exists()).toBe(true)
  })

  // ── Footer close button emits close [obligation] ──────────────────────────

  test('close button emits close event [obligation]', async () => {
    const wrapper = mountSummary()
    await wrapper.find('[data-testid="session-summary__close"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('both header X and footer close button emit close independently', async () => {
    const wrapper = mountSummary()

    await wrapper.find('[data-testid="header-stop-btn"]').trigger('click')
    await wrapper.find('[data-testid="session-summary__close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(2)
  })
})
