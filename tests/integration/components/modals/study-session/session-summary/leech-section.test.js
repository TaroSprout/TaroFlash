import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import LeechSection from '@/components/study-session/session-summary/leech-section.vue'

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeLeech(overrides = {}) {
  return {
    card_id: 1,
    front_text: 'What is the powerhouse of the cell?',
    lapses: 9,
    ...overrides
  }
}

function mountLeech(leeches) {
  return mount(LeechSection, { props: { leeches } })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LeechSection', () => {
  // ── Root element ────────────────────────────────────────────────────────────

  test('renders the leech root element', () => {
    const wrapper = mountLeech([makeLeech()])
    expect(wrapper.find('[data-testid="session-summary__leech"]').exists()).toBe(true)
  })

  // ── Card rows ───────────────────────────────────────────────────────────────

  test('renders one row per leech', () => {
    const leeches = [
      makeLeech({ card_id: 1, front_text: 'Card A' }),
      makeLeech({ card_id: 2, front_text: 'Card B' }),
      makeLeech({ card_id: 3, front_text: 'Card C' })
    ]
    const wrapper = mountLeech(leeches)
    expect(wrapper.findAll('[data-testid="session-summary__leech-card"]')).toHaveLength(3)
  })

  test('renders a single leech row', () => {
    const wrapper = mountLeech([makeLeech()])
    expect(wrapper.findAll('[data-testid="session-summary__leech-card"]')).toHaveLength(1)
  })

  // ── front_text display ──────────────────────────────────────────────────────

  test('shows front_text in the leech row', () => {
    const wrapper = mountLeech([makeLeech({ front_text: 'Mitochondria' })])
    expect(wrapper.find('[data-testid="session-summary__leech-card"]').text()).toContain(
      'Mitochondria'
    )
  })

  test('shows each card front_text in its respective row', () => {
    const leeches = [
      makeLeech({ card_id: 1, front_text: 'Alpha' }),
      makeLeech({ card_id: 2, front_text: 'Beta' })
    ]
    const wrapper = mountLeech(leeches)
    const rows = wrapper.findAll('[data-testid="session-summary__leech-card"]')
    expect(rows[0].text()).toContain('Alpha')
    expect(rows[1].text()).toContain('Beta')
  })

  // ── Lapse count display ─────────────────────────────────────────────────────

  test('shows the lapse count in the leech row', () => {
    const wrapper = mountLeech([makeLeech({ lapses: 11 })])
    // i18n: session-summary.leech.lapses = "Forgotten {count} times"
    expect(wrapper.find('[data-testid="session-summary__leech-card"]').text()).toContain('11')
  })

  test('shows correct lapse count for each leech', () => {
    const leeches = [makeLeech({ card_id: 1, lapses: 8 }), makeLeech({ card_id: 2, lapses: 15 })]
    const wrapper = mountLeech(leeches)
    const rows = wrapper.findAll('[data-testid="session-summary__leech-card"]')
    expect(rows[0].text()).toContain('8')
    expect(rows[1].text()).toContain('15')
  })

  // ── Leech list ──────────────────────────────────────────────────────────────

  test('renders the leech list container', () => {
    const wrapper = mountLeech([makeLeech()])
    expect(wrapper.find('[data-testid="session-summary__leech-list"]').exists()).toBe(true)
  })

  // ── Heading and caption ─────────────────────────────────────────────────────

  test('renders the section heading', () => {
    const wrapper = mountLeech([makeLeech()])
    // i18n: session-summary.leech.heading = "Keeps slipping"
    expect(wrapper.text()).toContain('Keeps slipping')
  })

  test('renders the caption text', () => {
    const wrapper = mountLeech([makeLeech()])
    expect(wrapper.text()).toContain('These keep coming back')
  })

  // ── Empty leeches ───────────────────────────────────────────────────────────

  test('renders zero rows when leeches array is empty', () => {
    const wrapper = mountLeech([])
    expect(wrapper.findAll('[data-testid="session-summary__leech-card"]')).toHaveLength(0)
  })
})
