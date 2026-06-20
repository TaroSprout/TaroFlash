import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

import UiToggle from '@/components/ui-kit/toggle.vue'

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
    slots: { default: () => slotText }
  })
  return { wrapper, getChecked: () => model }
}

describe('UiToggle', () => {
  beforeEach(() => mockEmitSfx.mockClear())

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

  test('plays the select sfx when the input changes', async () => {
    const { wrapper } = makeToggle({ checked: false })
    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(mockEmitSfx).toHaveBeenCalledWith('select')
  })
})
