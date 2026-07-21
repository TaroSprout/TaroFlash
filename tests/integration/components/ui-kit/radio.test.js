import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

const { mockEmitSfx, mockEmitHoverSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitHoverSfx: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: mockEmitHoverSfx
}))

import UiRadio from '@/components/ui-kit/radio.vue'
import { vSfx } from '@/sfx/directive'

function mountRadio(props = {}) {
  return shallowMount(UiRadio, { props, global: { directives: { sfx: vSfx } } })
}

describe('UiRadio', () => {
  beforeEach(() => {
    mockEmitSfx.mockReset()
    mockEmitHoverSfx.mockReset()
  })

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

  test('renders subtract (dash) icon when intermediate=true', () => {
    const wrapper = mountRadio({ checked: false, intermediate: true })
    const icons = wrapper.findAllComponents({ name: 'UiIcon' })
    expect(icons.some((c) => c.props('src') === 'subtract')).toBe(true)
  })

  test('does not render subtract icon when intermediate is not set', () => {
    const wrapper = mountRadio({ checked: false })
    const icons = wrapper.findAllComponents({ name: 'UiIcon' })
    expect(icons.some((c) => c.props('src') === 'subtract')).toBe(false)
  })

  test('can show both check and subtract icons simultaneously', () => {
    const wrapper = mountRadio({ checked: true, intermediate: true })
    const icons = wrapper.findAllComponents({ name: 'UiIcon' })
    expect(icons.some((c) => c.props('src') === 'check')).toBe(true)
    expect(icons.some((c) => c.props('src') === 'subtract')).toBe(true)
  })

  // ── click ──────────────────────────────────────────────────────────────────

  test('clicking the radio does not throw', async () => {
    const wrapper = mountRadio({ checked: false })
    await expect(
      wrapper.find('[data-testid="ui-kit-radio"]').trigger('click')
    ).resolves.not.toThrow()
  })

  // ── sfx prop ───────────────────────────────────────────────────────────────

  test('plays the "select" press sfx by default [obligation]', async () => {
    const wrapper = mountRadio({ checked: false })
    await wrapper.find('[data-testid="ui-kit-radio"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('select', expect.anything())
  })

  test('overrides the press sfx via the sfx prop [obligation]', async () => {
    const wrapper = mountRadio({ checked: false, sfx: { press: 'snappy_button_2' } })
    await wrapper.find('[data-testid="ui-kit-radio"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_2', expect.anything())
    expect(mockEmitSfx).not.toHaveBeenCalledWith('select', expect.anything())
  })

  test('forwards hover sfx to the v-sfx directive [obligation]', () => {
    const wrapper = mountRadio({ checked: false, sfx: { hover: 'type_05' } })
    wrapper
      .find('[data-testid="ui-kit-radio"]')
      .element.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    expect(mockEmitHoverSfx).toHaveBeenCalledWith('type_05', expect.anything())
  })

  test('forwards focus sfx to the v-sfx directive [obligation]', async () => {
    const wrapper = mountRadio({ checked: false, sfx: { focus: 'type_05' } })
    await wrapper.find('[data-testid="ui-kit-radio"]').trigger('focus')
    expect(mockEmitSfx).toHaveBeenCalledWith('type_05', expect.anything())
  })
})
