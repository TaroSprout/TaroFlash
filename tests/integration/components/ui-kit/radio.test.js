import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import UiRadio from '@/components/ui-kit/radio.vue'

function mountRadio(props = {}) {
  return shallowMount(UiRadio, { props })
}

describe('UiRadio', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the radio element', () => {
    const wrapper = mountRadio({ checked: false })
    expect(wrapper.find('[data-testid="ui-kit-radio"]').exists()).toBe(true)
  })

  // ── data-active ────────────────────────────────────────────────────────────

  test('mirrors the active prop onto data-active [obligation]', () => {
    const wrapper = mountRadio({ checked: false, active: true })
    expect(wrapper.find('[data-testid="ui-kit-radio"]').attributes('data-active')).toBe('true')
  })

  test('data-active is not set when active is false and not being pressed [obligation]', () => {
    const wrapper = mountRadio({ checked: false, active: false })
    expect(wrapper.find('[data-testid="ui-kit-radio"]').attributes('data-active')).toBeUndefined()
  })

  // ── checked state ──────────────────────────────────────────────────────────

  test('renders check icon when checked=true', () => {
    const wrapper = mountRadio({ checked: true })
    const icons = wrapper.findAllComponents({ name: 'UiIcon' })
    expect(icons.some((c) => c.props('src') === 'check')).toBe(true)
  })

  test('does not render check icon when checked=false', () => {
    const wrapper = mountRadio({ checked: false })
    const icons = wrapper.findAllComponents({ name: 'UiIcon' })
    expect(icons.some((c) => c.props('src') === 'check')).toBe(false)
  })

  // ── intermediate state ─────────────────────────────────────────────────────

  test('renders minus icon when intermediate=true', () => {
    const wrapper = mountRadio({ checked: false, intermediate: true })
    const icons = wrapper.findAllComponents({ name: 'UiIcon' })
    expect(icons.some((c) => c.props('src') === 'minus')).toBe(true)
  })

  test('does not render minus icon when intermediate is not set', () => {
    const wrapper = mountRadio({ checked: false })
    const icons = wrapper.findAllComponents({ name: 'UiIcon' })
    expect(icons.some((c) => c.props('src') === 'minus')).toBe(false)
  })

  test('can show both check and minus icons simultaneously', () => {
    const wrapper = mountRadio({ checked: true, intermediate: true })
    const icons = wrapper.findAllComponents({ name: 'UiIcon' })
    expect(icons.some((c) => c.props('src') === 'check')).toBe(true)
    expect(icons.some((c) => c.props('src') === 'minus')).toBe(true)
  })

  // ── click ──────────────────────────────────────────────────────────────────

  test('clicking the radio does not throw', async () => {
    const wrapper = mountRadio({ checked: false })
    await expect(
      wrapper.find('[data-testid="ui-kit-radio"]').trigger('click')
    ).resolves.not.toThrow()
  })
})
