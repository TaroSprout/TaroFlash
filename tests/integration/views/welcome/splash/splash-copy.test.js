import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: vi.fn() }))

import SplashCopy from '@/views/welcome/splash/splash-copy.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountSplashCopy() {
  return shallowMount(SplashCopy)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SplashCopy', () => {
  test('renders the copy container', () => {
    const wrapper = mountSplashCopy()
    expect(wrapper.find('[data-testid="welcome-hero__copy"]').exists()).toBe(true)
  })

  test('renders the hero heading with brand name', () => {
    const wrapper = mountSplashCopy()
    // welcome-view.hero.heading resolves to 'TaroFlash' (or similar brand copy)
    const h1 = wrapper.find('h1')
    expect(h1.exists()).toBe(true)
    expect(h1.text().length).toBeGreaterThan(0)
  })

  test('renders the subheading paragraph', () => {
    const wrapper = mountSplashCopy()
    const p = wrapper.find('p')
    expect(p.exists()).toBe(true)
    expect(p.text().length).toBeGreaterThan(0)
  })
})
