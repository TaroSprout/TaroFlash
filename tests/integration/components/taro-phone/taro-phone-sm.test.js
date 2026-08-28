import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TaroPhoneSm from '@/components/taro-phone/taro-phone-sm.vue'
import { useTaroPhoneStore } from '@/stores/taro-phone'

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

const { emitHoverSfx } = await import('@/sfx/bus')
const { vSfx } = await import('@/sfx/directive')

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

describe('TaroPhoneSm — hover scale [obligation]', () => {
  test('hover:scale-81 rides the resting scale-75, adding a scale step on top of the hover rotation [obligation]', () => {
    const wrapper = makeWrapper()
    const classes = wrapper.find('[data-testid="phone"]').classes()
    expect(classes).toContain('hover:scale-81')
    expect(classes).toContain('hover:rotate-2')
  })

  test('rest keeps scale-75 and rotate-6 — the hover step never touches the resting values [obligation]', () => {
    const wrapper = makeWrapper()
    const classes = wrapper.find('[data-testid="phone"]').classes()
    expect(classes).toContain('scale-75')
    expect(classes).toContain('rotate-6')
  })
})

describe('TaroPhoneSm — transform transition duration [obligation]', () => {
  test('carries duration-150 on the transform transition [obligation]', () => {
    const wrapper = makeWrapper()
    const classes = wrapper.find('[data-testid="phone"]').classes()
    expect(classes).toContain('transition-transform')
    expect(classes).toContain('duration-150')
  })

  test('carries no duration other than the shortened one [obligation]', () => {
    const wrapper = makeWrapper()
    const classes = wrapper.find('[data-testid="phone"]').classes()
    // Not an enumerated blocklist: any duration class that isn't duration-150 fails,
    // so reverting to the superseded duration-200 — or drifting to any other value — trips this.
    expect(classes.filter((c) => c.startsWith('duration-'))).toEqual(['duration-150'])
  })
})

describe('TaroPhoneSm — hover transforms stay gated behind hover: [obligation]', () => {
  test('no unconditional transform class applies the hover rotation or scale values outside hover: [obligation]', () => {
    const wrapper = makeWrapper()
    const classes = wrapper.find('[data-testid="phone"]').classes()

    // Every transform class that moves the chip beyond its resting rotate-6/scale-75
    // is hover:-prefixed — Tailwind compiles hover: to @media (hover: hover), which
    // JSDOM/Chromium test mode can't evaluate directly, so this checks the class-level
    // proxy: the motion values only ever appear gated, never bare.
    expect(classes).not.toContain('rotate-2')
    expect(classes).not.toContain('scale-81')
  })
})

describe('TaroPhoneSm — hover sfx pointer gating [obligation]', () => {
  function mountWithRealDirective() {
    return mount(TaroPhoneSm, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
        directives: { sfx: vSfx }
      }
    })
  }

  test('a mouse pointerenter plays the hover sfx [obligation]', () => {
    vi.clearAllMocks()
    const wrapper = mountWithRealDirective()

    wrapper
      .find('[data-testid="phone"]')
      .element.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

    expect(emitHoverSfx).toHaveBeenCalledWith('ui.hover')
  })

  test('a touch pointerenter plays no hover sfx [obligation]', () => {
    vi.clearAllMocks()
    const wrapper = mountWithRealDirective()

    wrapper
      .find('[data-testid="phone"]')
      .element.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))

    expect(emitHoverSfx).not.toHaveBeenCalled()
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
