import '@/styles/main.css' // required so filter/transition assertions below read real values instead of passing vacuously

import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TaroPhoneIndex from '@/components/taro-phone/index.vue'

vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ({ value: false }) }))
vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: vi.fn() }))
vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: () => ({ register: vi.fn() })
}))

const mounted = []

function mountPhone() {
  const wrapper = mount(TaroPhoneIndex, {
    attachTo: document.body,
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
  })
  mounted.push(wrapper)
  return wrapper
}

/** A bare probe carrying the attribute the component's `<style>` block targets. */
function mountBlurProbe(state) {
  const probe = document.createElement('div')
  probe.dataset.phoneBlur = state
  document.body.appendChild(probe)
  return probe
}

describe('taro-phone [data-phone-blur] tier gating (data-motion)', () => {
  let probes

  beforeEach(() => {
    probes = []
  })

  afterEach(() => {
    document.documentElement.removeAttribute('data-motion')
    probes.forEach((probe) => probe.remove())
    while (mounted.length > 0) mounted.pop().unmount()
  })

  test('data-motion="full": the clear (false) state uses an ease-in curve, the build (true) state uses an ease-out curve', () => {
    document.documentElement.setAttribute('data-motion', 'full')
    mountPhone()

    const cleared = mountBlurProbe('false')
    const built = mountBlurProbe('true')
    probes.push(cleared, built)

    const cleared_timing = getComputedStyle(cleared).transitionTimingFunction
    const built_timing = getComputedStyle(built).transitionTimingFunction

    expect(cleared_timing).toBe('cubic-bezier(0.4, 0, 1, 1)')
    expect(built_timing).toBe('cubic-bezier(0.22, 1, 0.36, 1)')
    expect(cleared_timing).not.toBe(built_timing)
  })

  test.each(['lean', 'minimal'])(
    'data-motion="%s": [data-phone-blur] carries no filter transition',
    (tier) => {
      document.documentElement.setAttribute('data-motion', tier)
      mountPhone()

      const built = mountBlurProbe('true')
      probes.push(built)

      const style = getComputedStyle(built)
      expect(style.transitionProperty).not.toBe('filter')
    }
  )

  test('data-motion="full": [data-phone-blur="true"] carries a filter transition', () => {
    document.documentElement.setAttribute('data-motion', 'full')
    mountPhone()

    const built = mountBlurProbe('true')
    probes.push(built)

    expect(getComputedStyle(built).transitionProperty).toBe('filter')
  })
})
