import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import NewCardsSection from '@/components/study-session/session-summary/new-cards-section.vue'

function mountNewCards(count) {
  return mount(NewCardsSection, { props: { count } })
}

describe('NewCardsSection', () => {
  // ── Root element ────────────────────────────────────────────────────────────

  test('renders the new-cards root element', () => {
    const wrapper = mountNewCards(3)
    expect(wrapper.find('[data-testid="session-summary__new"]').exists()).toBe(true)
  })

  // ── Count display ───────────────────────────────────────────────────────────

  test('displays the count in the count element', () => {
    const wrapper = mountNewCards(5)
    expect(wrapper.find('[data-testid="session-summary__new-count"]').text()).toBe('5')
  })

  test('displays count of 1', () => {
    const wrapper = mountNewCards(1)
    expect(wrapper.find('[data-testid="session-summary__new-count"]').text()).toBe('1')
  })

  test('displays a large count', () => {
    const wrapper = mountNewCards(42)
    expect(wrapper.find('[data-testid="session-summary__new-count"]').text()).toBe('42')
  })

  test('displays zero count', () => {
    const wrapper = mountNewCards(0)
    expect(wrapper.find('[data-testid="session-summary__new-count"]').text()).toBe('0')
  })

  // ── Unit text ───────────────────────────────────────────────────────────────

  test('renders the "new cards learned" unit label', () => {
    const wrapper = mountNewCards(3)
    // i18n key: session-summary.new.unit → "new cards learned"
    expect(wrapper.find('[data-testid="session-summary__new"]').text()).toContain(
      'new cards learned'
    )
  })
})
