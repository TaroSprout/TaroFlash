import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h, ref } from 'vue'
import FieldRow from '@/views/deck/deck-settings/tab-review-pacing/field-row.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'

function makeField({ overridden = false, reset = vi.fn() } = {}) {
  return { overridden: ref(overridden), reset }
}

function makeWrapper(props = {}, slots = {}) {
  return mount(FieldRow, { props, slots })
}

describe('FieldRow', () => {
  test('renders the label', () => {
    const wrapper = makeWrapper({ label: 'Max reviews' })
    expect(wrapper.find('[data-testid="field-row__label"]').text()).toContain('Max reviews')
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
    test('does not render when field.overridden is false [obligation]', () => {
      const wrapper = makeWrapper({ label: 'Max reviews', field: makeField({ overridden: false }) })
      expect(wrapper.find('[data-testid="field-row__reset"]').exists()).toBe(false)
    })

    test('does not render when the field prop is not passed [obligation]', () => {
      const wrapper = makeWrapper({ label: 'Max reviews' })
      expect(wrapper.find('[data-testid="field-row__reset"]').exists()).toBe(false)
    })

    test('renders when field.overridden is true [obligation]', () => {
      const wrapper = makeWrapper({ label: 'Max reviews', field: makeField({ overridden: true }) })
      expect(wrapper.find('[data-testid="field-row__reset"]').exists()).toBe(true)
    })

    test('clicking it calls field.reset directly — no confirmation dialog, no emitted event [obligation]', async () => {
      const reset = vi.fn()
      const wrapper = makeWrapper({
        label: 'Max reviews',
        field: makeField({ overridden: true, reset })
      })

      await wrapper.find('[data-testid="field-row__reset"]').trigger('click')

      expect(reset).toHaveBeenCalledOnce()
    })

    test('exposes its reset-to-preset-label translation as the icon-only button tooltip', async () => {
      const wrapper = makeWrapper({ label: 'Max reviews', field: makeField({ overridden: true }) })

      await wrapper
        .find('[data-testid="field-row__reset"]')
        .trigger('pointerenter', { pointerType: 'mouse' })

      expect(document.querySelector('[data-testid="ui-tooltip"]').textContent.trim()).toBe('Reset')
    })
  })
})
