import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

// ── Import ─────────────────────────────────────────────────────────────────────

import WelcomeFooter from '@/views/welcome/welcome-footer.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountFooter() {
  return shallowMount(WelcomeFooter)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('WelcomeFooter', () => {
  test('renders the About heading', () => {
    const wrapper = mountFooter()
    expect(wrapper.text()).toContain('About')
  })

  test('renders the Resources heading', () => {
    const wrapper = mountFooter()
    expect(wrapper.text()).toContain('Resources')
  })

  test('renders the Privacy Policy link', () => {
    const wrapper = mountFooter()
    const link = wrapper.find('a[href="/privacy"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Privacy Policy')
  })

  test('renders the Terms of Service link', () => {
    const wrapper = mountFooter()
    const link = wrapper.find('a[href="/terms"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('Terms of Service')
  })

  test('renders the footer description text', () => {
    const wrapper = mountFooter()
    expect(wrapper.text()).toContain('TaroFlash')
  })
})
