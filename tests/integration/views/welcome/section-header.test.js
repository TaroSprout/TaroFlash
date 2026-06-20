import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

// ── Import ─────────────────────────────────────────────────────────────────────

import SectionHeader from '@/views/welcome/section-header.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountHeader(props = {}) {
  return shallowMount(SectionHeader, { props })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SectionHeader', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the header container', () => {
    const wrapper = mountHeader({ eyebrow: 'Eyebrow', heading: 'Heading' })
    expect(wrapper.find('[data-testid="welcome-section-header"]').exists()).toBe(true)
  })

  test('renders eyebrow text', () => {
    const wrapper = mountHeader({ eyebrow: 'What Inside', heading: 'My Heading' })
    expect(wrapper.find('[data-testid="welcome-section-header__eyebrow"]').text()).toBe(
      'What Inside'
    )
  })

  test('renders heading text', () => {
    const wrapper = mountHeader({ eyebrow: 'Some Label', heading: 'Big Title Here' })
    expect(wrapper.find('[data-testid="welcome-section-header__heading"]').text()).toBe(
      'Big Title Here'
    )
  })

  test('renders the decorative rule', () => {
    const wrapper = mountHeader({ eyebrow: 'E', heading: 'H' })
    expect(wrapper.find('[data-testid="welcome-section-header__rule"]').exists()).toBe(true)
  })

  // ── Subtitle conditional rendering ────────────────────────────────────────

  test('renders subtitle when subtitle prop is provided', () => {
    const wrapper = mountHeader({ eyebrow: 'E', heading: 'H', subtitle: 'Some subtitle text' })
    const subtitle = wrapper.find('[data-testid="welcome-section-header__subtitle"]')
    expect(subtitle.exists()).toBe(true)
    expect(subtitle.text()).toBe('Some subtitle text')
  })

  test('does not render subtitle when subtitle prop is absent', () => {
    const wrapper = mountHeader({ eyebrow: 'E', heading: 'H' })
    expect(wrapper.find('[data-testid="welcome-section-header__subtitle"]').exists()).toBe(false)
  })

  test('does not render subtitle when subtitle is empty string', () => {
    const wrapper = mountHeader({ eyebrow: 'E', heading: 'H', subtitle: '' })
    expect(wrapper.find('[data-testid="welcome-section-header__subtitle"]').exists()).toBe(false)
  })
})
