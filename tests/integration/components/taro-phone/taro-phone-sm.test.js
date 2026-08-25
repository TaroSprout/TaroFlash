import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TaroPhoneSm from '@/components/taro-phone/taro-phone-sm.vue'
import { useTaroPhoneStore } from '@/stores/taro-phone'

function makeWrapper() {
  return mount(TaroPhoneSm, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      directives: { sfx: {} }
    }
  })
}

describe('TaroPhoneSm — notification badge', () => {
  test('hides the badge when notification_count is 0', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="notification-badge"]').exists()).toBe(false)
  })

  test('shows the badge when notification_count > 0', async () => {
    const wrapper = makeWrapper()
    const store = useTaroPhoneStore()
    store.notify('settings', 1)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="notification-badge"]').exists()).toBe(true)
  })

  test('the badge carries data-palette="danger" [obligation]', async () => {
    const wrapper = makeWrapper()
    const store = useTaroPhoneStore()
    store.notify('settings', 1)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="notification-badge"]').attributes('data-palette')).toBe(
      'danger'
    )
  })
})

describe('TaroPhoneSm — open', () => {
  test('emits open when clicked', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="phone"]').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })
})

describe('TaroPhoneSm — station [obligation]', () => {
  test('stamps the constant data-station="window" [obligation]', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="phone"]').attributes('data-station')).toBe('window')
  })
})

describe('TaroPhoneSm — hover rotation [obligation]', () => {
  test('hover:rotate-2 rides the resting rotate-6, straightening rather than tilting further [obligation]', () => {
    const wrapper = makeWrapper()
    const classes = wrapper.find('[data-testid="phone"]').classes()
    expect(classes).toContain('rotate-6')
    expect(classes).toContain('hover:rotate-2')
  })

  test('the hover rotation change carries no colour or background class change [obligation]', () => {
    const wrapper = makeWrapper()
    const classes = wrapper.find('[data-testid="phone"]').classes()
    expect(classes).toContain('bg-surface')
    expect(classes.some((c) => /^hover:(bg|text|outline|border)-/.test(c))).toBe(false)
  })
})

describe('TaroPhoneSm — hover sfx wiring [obligation]', () => {
  test('v-sfx is bound with hover set to ui.hover [obligation]', () => {
    let captured
    const captureDirective = {
      mounted: (_el, binding) => (captured = binding.value),
      updated: (_el, binding) => (captured = binding.value)
    }
    mount(TaroPhoneSm, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
        directives: { sfx: captureDirective }
      }
    })
    expect(captured).toEqual({ hover: 'ui.hover' })
  })
})

describe('TaroPhoneSm — collapsed colour roles [obligation]', () => {
  test('the collapsed screen uses the ink-muted role, not well [obligation]', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="phone__screen"]').classes()).toContain('bg-ink-muted')
    expect(wrapper.find('[data-testid="phone__screen"]').classes()).not.toContain('bg-well')
  })

  test('the home-button outline uses the ink-muted role, not well [obligation]', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="phone__home-button"]').classes()).toContain(
      'outline-ink-muted'
    )
    expect(wrapper.find('[data-testid="phone__home-button"]').classes()).not.toContain(
      'outline-well'
    )
  })

  test('the chip body stays on the surface role [obligation]', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="phone"]').classes()).toContain('bg-surface')
  })

  test('carries no dark: variant override anywhere in the markup [obligation]', () => {
    const wrapper = makeWrapper()
    expect(wrapper.html()).not.toMatch(/\bdark:/)
  })
})
