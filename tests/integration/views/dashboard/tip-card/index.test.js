import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

import DashboardTipCard from '@/views/dashboard/tip-card/index.vue'
import { TIPS } from '@/utils/tips/catalog'

beforeEach(() => {
  vi.spyOn(Math, 'random')
})

afterEach(() => {
  Math.random.mockRestore()
})

describe('DashboardTipCard', () => {
  test('renders the title and body for the tip useTipRotation currently points to (not hardcoded to TIPS[0])', () => {
    // Force a non-first tip so the assertion only passes if the component
    // reads the live tip from the composable rather than TIPS[0].
    Math.random.mockReturnValue(0.9)
    const expected_index = Math.floor(0.9 * TIPS.length)
    const expected_tip = TIPS[expected_index]

    const wrapper = shallowMount(DashboardTipCard)

    expect(wrapper.find('[data-testid="dashboard-tip-card__title"]').text()).toBe(
      wrapper.vm.$t(expected_tip.title_key)
    )
    expect(wrapper.find('[data-testid="dashboard-tip-card__body"]').text()).toBe(
      wrapper.vm.$t(expected_tip.body_key)
    )
    expect(expected_index).not.toBe(0)
  })

  test('renders the title and body matching the first tip when the composable points to index 0', () => {
    Math.random.mockReturnValue(0)
    const expected_tip = TIPS[0]

    const wrapper = shallowMount(DashboardTipCard)

    expect(wrapper.find('[data-testid="dashboard-tip-card__title"]').text()).toBe(
      wrapper.vm.$t(expected_tip.title_key)
    )
    expect(wrapper.find('[data-testid="dashboard-tip-card__body"]').text()).toBe(
      wrapper.vm.$t(expected_tip.body_key)
    )
  })

  test('passes the translated tape-label to the tape component', () => {
    Math.random.mockReturnValue(0)
    const wrapper = shallowMount(DashboardTipCard)
    const tape = wrapper.findComponent({ name: 'UiTape' })
    expect(tape.props('label')).toBe(wrapper.vm.$t('dashboard.tip-card.tape-label'))
  })
})
