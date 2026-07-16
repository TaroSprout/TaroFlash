import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import TooltipRow from '@/views/deck/deck-settings/tab-review-pacing/tooltip-row.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'

function makeWrapper(props = {}, slots = {}) {
  return mount(TooltipRow, { props, slots })
}

describe('TooltipRow', () => {
  test('renders the label', () => {
    const wrapper = makeWrapper({ label: 'Max reviews' })
    expect(wrapper.find('[data-testid="tooltip-row__label"]').text()).toContain('Max reviews')
  })

  test('renders the tooltip icon when a tooltip prop is passed', () => {
    const wrapper = makeWrapper({ label: 'Max reviews', tooltip: 'Caps daily review count' })
    expect(wrapper.findComponent(UiTooltip).exists()).toBe(true)
  })

  test('omits the tooltip icon when the tooltip prop is not passed', () => {
    const wrapper = makeWrapper({ label: 'Max reviews' })
    expect(wrapper.findComponent(UiTooltip).exists()).toBe(false)
  })

  test('forwards the tooltip text to the tooltip component', () => {
    const wrapper = makeWrapper({ label: 'Max reviews', tooltip: 'Caps daily review count' })
    expect(wrapper.findComponent(UiTooltip).props('text')).toBe('Caps daily review count')
  })

  test('renders the default slot content unconditionally', () => {
    const wrapper = makeWrapper(
      { label: 'Max reviews' },
      { default: () => h('div', { 'data-testid': 'trailing-control' }) }
    )
    expect(wrapper.find('[data-testid="trailing-control"]').exists()).toBe(true)
  })

  test('renders the slot content even when a tooltip is also present', () => {
    const wrapper = makeWrapper(
      { label: 'Max reviews', tooltip: 'Caps daily review count' },
      { default: () => h('div', { 'data-testid': 'trailing-control' }) }
    )
    expect(wrapper.find('[data-testid="trailing-control"]').exists()).toBe(true)
    expect(wrapper.findComponent(UiTooltip).exists()).toBe(true)
  })

  describe('reset button [obligation]', () => {
    test('does not render when overridden is false [obligation]', () => {
      const wrapper = makeWrapper({ label: 'Max reviews', overridden: false })
      expect(wrapper.find('[data-testid="tooltip-row__reset"]').exists()).toBe(false)
    })

    test('does not render when overridden is not passed [obligation]', () => {
      const wrapper = makeWrapper({ label: 'Max reviews' })
      expect(wrapper.find('[data-testid="tooltip-row__reset"]').exists()).toBe(false)
    })

    test('renders when overridden is true [obligation]', () => {
      const wrapper = makeWrapper({ label: 'Max reviews', overridden: true })
      expect(wrapper.find('[data-testid="tooltip-row__reset"]').exists()).toBe(true)
    })

    test('clicking it emits reset with no confirmation dialog [obligation]', async () => {
      const wrapper = makeWrapper({ label: 'Max reviews', overridden: true })

      await wrapper.find('[data-testid="tooltip-row__reset"]').trigger('click')

      expect(wrapper.emitted('reset')).toHaveLength(1)
    })
  })
})
