import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

const { mockEmitSfx, mockEmitHoverSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitHoverSfx: vi.fn()
}))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: mockEmitHoverSfx }))

import UiToggle from '@/components/ui-kit/toggle.vue'
import { vSfx } from '@/sfx/directive'

function makeToggle(props = {}, slotText = 'Label') {
  let model = props.checked
  const wrapper = mount(UiToggle, {
    props: {
      ...props,
      'onUpdate:checked': (v) => {
        model = v
        wrapper.setProps({ checked: v })
      }
    },
    slots: { default: () => slotText },
    global: { directives: { sfx: vSfx } }
  })
  return { wrapper, getChecked: () => model }
}

describe('UiToggle', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockEmitHoverSfx.mockClear()
  })

  test('renders the root label and switch parts', () => {
    const { wrapper } = makeToggle()
    expect(wrapper.find('[data-testid="ui-kit-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-kit-toggle__switch"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-kit-toggle__switch-handle"]').exists()).toBe(true)
  })

  test('renders the slot content as the label', () => {
    const { wrapper } = makeToggle({}, 'Spaced repetition')
    expect(wrapper.find('[data-testid="ui-kit-toggle__label"]').text()).toBe('Spaced repetition')
  })

  test('reflects checked state on data-active', async () => {
    const { wrapper } = makeToggle({ checked: false })
    expect(wrapper.find('[data-testid="ui-kit-toggle"]').attributes('data-active')).toBe('false')

    await wrapper.setProps({ checked: true })
    expect(wrapper.find('[data-testid="ui-kit-toggle"]').attributes('data-active')).toBe('true')
  })

  test('the inner input mirrors the checked prop', async () => {
    const { wrapper } = makeToggle({ checked: false })
    const input = wrapper.find('input[type="checkbox"]')
    expect(input.element.checked).toBe(false)

    await wrapper.setProps({ checked: true })
    expect(input.element.checked).toBe(true)
  })

  test('toggling the input emits update:checked with the new value', async () => {
    const { wrapper, getChecked } = makeToggle({ checked: false })
    const input = wrapper.find('input[type="checkbox"]')
    await input.setValue(true)
    expect(getChecked()).toBe(true)
  })

  test('plays the ui.select sfx when the input changes', async () => {
    const { wrapper } = makeToggle({ checked: false })
    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.select')
  })

  test('sfx.press: false suppresses the select sfx on change', async () => {
    const { wrapper } = makeToggle({ checked: false, sfx: { press: false } })
    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(mockEmitSfx).not.toHaveBeenCalledWith('ui.select')
  })

  function pointerEnter(el) {
    el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
  }

  test('sfx.hover: false suppresses the hover sfx', async () => {
    const { wrapper } = makeToggle({ checked: false, sfx: { hover: false } })
    pointerEnter(wrapper.find('[data-testid="ui-kit-toggle"]').element)
    expect(mockEmitHoverSfx).not.toHaveBeenCalled()
  })

  test('an omitted hover channel falls back to the primitive default and plays the hover sfx', () => {
    const { wrapper } = makeToggle({ checked: false })
    pointerEnter(wrapper.find('[data-testid="ui-kit-toggle"]').element)
    expect(mockEmitHoverSfx).toHaveBeenCalled()
  })

  test('an omitted press channel falls back to ui.select, still playing on change', async () => {
    const { wrapper } = makeToggle({ checked: false })
    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.select')
  })

  // ── disabled ───────────────────────────────────────────────────

  describe('disabled', () => {
    test('sets data-disabled=true on the root', () => {
      const { wrapper } = makeToggle({ checked: false, disabled: true })
      expect(wrapper.find('[data-testid="ui-kit-toggle"]').attributes('data-disabled')).toBe('true')
    })

    test('data-disabled defaults to false when the prop is not passed', () => {
      const { wrapper } = makeToggle({ checked: false })
      expect(wrapper.find('[data-testid="ui-kit-toggle"]').attributes('data-disabled')).toBe(
        'false'
      )
    })

    test('sets the native checkbox input disabled', () => {
      const { wrapper } = makeToggle({ checked: false, disabled: true })
      expect(wrapper.find('input[type="checkbox"]').element.disabled).toBe(true)
    })

    test('a genuine click on the disabled input does not toggle checked or emit update:checked', async () => {
      const { wrapper, getChecked } = makeToggle({ checked: false, disabled: true })
      await wrapper.find('input[type="checkbox"]').trigger('click')

      expect(getChecked()).toBe(false)
      expect(wrapper.emitted('update:checked')).toBeFalsy()
    })

    test('a genuine click on the disabled input suppresses the select sfx', async () => {
      const { wrapper } = makeToggle({ checked: false, disabled: true })
      await wrapper.find('input[type="checkbox"]').trigger('click')

      expect(mockEmitSfx).not.toHaveBeenCalledWith('ui.select')
    })
  })
})
