import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount, mount } from '@vue/test-utils'

// ── Hoisted mocks (sfx — break the sfx/config ↔ sfx/player circular init) ────

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: vi.fn() }))
vi.mock('@/sfx/config', () => ({ TYPE_SFX: [], HOVER_SFX_SET: new Set() }))

// ── Component imports (after mocks) ───────────────────────────────────────────

import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import SpinboxButton from '@/components/ui-kit/spinbox/button.vue'

function mountSpinbox(props = {}) {
  return shallowMount(UiSpinbox, { props: { value: 0, ...props } })
}

function findValue(wrapper) {
  return wrapper.find('[data-testid="ui-kit-spinbox__value"]')
}

function findInput(wrapper) {
  return wrapper.find('[data-testid="ui-kit-spinbox__input"]')
}

function findSuffix(wrapper) {
  return wrapper.find('[data-testid="ui-kit-spinbox__suffix"]')
}

function findDecrement(wrapper) {
  return wrapper.find('[data-testid="ui-kit-spinbox__decrement"]')
}

function findIncrement(wrapper) {
  return wrapper.find('[data-testid="ui-kit-spinbox__increment"]')
}

describe('UiSpinbox', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the spinbox container', () => {
    const wrapper = mountSpinbox()
    expect(wrapper.find('[data-testid="ui-kit-spinbox"]').exists()).toBe(true)
  })

  test('renders increment and decrement buttons', () => {
    const wrapper = mountSpinbox()
    expect(findIncrement(wrapper).exists()).toBe(true)
    expect(findDecrement(wrapper).exists()).toBe(true)
  })

  test('does not render label span when label prop is omitted', () => {
    const wrapper = mountSpinbox()
    expect(wrapper.find('[data-testid="ui-kit-spinbox__label"]').exists()).toBe(false)
  })

  test('renders the label span when label prop is provided', () => {
    const wrapper = mountSpinbox({ label: 'Font size' })
    const label = wrapper.find('[data-testid="ui-kit-spinbox__label"]')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('Font size')
  })

  // ── Value display ──────────────────────────────────────────────────────────

  test('shows the current value in the input', () => {
    const wrapper = mountSpinbox({ value: 7 })
    expect(findInput(wrapper).element.value).toBe('7')
  })

  test('appends suffix when suffix prop is set', () => {
    const wrapper = mountSpinbox({ value: 30, suffix: 'px' })
    expect(findInput(wrapper).element.value).toBe('30')
    expect(findSuffix(wrapper).text()).toBe('px')
  })

  test('does not render suffix span when suffix is omitted', () => {
    const wrapper = mountSpinbox({ value: 30 })
    expect(findSuffix(wrapper).exists()).toBe(false)
  })

  // ── Increment / decrement (v-model) ────────────────────────────────────────

  test('clicking increment emits update:value with value + step', async () => {
    const wrapper = mountSpinbox({ value: 5, step: 1 })
    await findIncrement(wrapper).trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([[6]])
  })

  test('clicking decrement emits update:value with value - step', async () => {
    const wrapper = mountSpinbox({ value: 5, step: 1 })
    await findDecrement(wrapper).trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([[4]])
  })

  test('honors a custom step value', async () => {
    const wrapper = mountSpinbox({ value: 30, step: 10 })
    await findIncrement(wrapper).trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([[40]])
  })

  // ── Bounds ─────────────────────────────────────────────────────────────────

  test('decrement button is disabled at min', () => {
    const wrapper = mountSpinbox({ value: 1, min: 1 })
    expect(findDecrement(wrapper).attributes('disabled')).toBe('true')
  })

  test('increment button is disabled at max', () => {
    const wrapper = mountSpinbox({ value: 10, max: 10 })
    expect(findIncrement(wrapper).attributes('disabled')).toBe('true')
  })

  test('decrement at min does not emit update:value', async () => {
    const wrapper = mountSpinbox({ value: 1, min: 1 })
    await findDecrement(wrapper).trigger('click')
    expect(wrapper.emitted('update:value')).toBeUndefined()
  })

  test('increment at max does not emit update:value', async () => {
    const wrapper = mountSpinbox({ value: 10, max: 10 })
    await findIncrement(wrapper).trigger('click')
    expect(wrapper.emitted('update:value')).toBeUndefined()
  })

  test('decrement clamps to min when step would overshoot', async () => {
    const wrapper = mountSpinbox({ value: 3, min: 1, step: 10 })
    await findDecrement(wrapper).trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([[1]])
  })

  test('increment clamps to max when step would overshoot', async () => {
    const wrapper = mountSpinbox({ value: 8, max: 10, step: 10 })
    await findIncrement(wrapper).trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([[10]])
  })

  // ── Wrap ───────────────────────────────────────────────────────────────────

  test('decrement at min wraps to max when wrap is enabled', async () => {
    const wrapper = mountSpinbox({ value: 1, min: 1, max: 10, wrap: true })
    await findDecrement(wrapper).trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([[10]])
  })

  test('increment at max wraps to min when wrap is enabled', async () => {
    const wrapper = mountSpinbox({ value: 10, min: 1, max: 10, wrap: true })
    await findIncrement(wrapper).trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([[1]])
  })

  test('wrap keeps both buttons enabled at the bounds', () => {
    const wrapper = mountSpinbox({ value: 1, min: 1, max: 10, wrap: true })
    expect(findDecrement(wrapper).attributes('disabled')).toBe('false')
    expect(findIncrement(wrapper).attributes('disabled')).toBe('false')
  })

  // ── Typing ─────────────────────────────────────────────────────────────────

  test('typing a number updates value via input event', async () => {
    const wrapper = mountSpinbox({ value: 5, min: 1, max: 100 })
    const input = findInput(wrapper)
    input.element.value = '42'
    await input.trigger('input')
    expect(wrapper.emitted('update:value')).toEqual([[42]])
  })

  test('typing a value above max clamps via input event', async () => {
    const wrapper = mountSpinbox({ value: 5, min: 1, max: 100 })
    const input = findInput(wrapper)
    input.element.value = '999'
    await input.trigger('input')
    expect(wrapper.emitted('update:value')).toEqual([[100]])
  })

  test('clearing the input does not emit update:value', async () => {
    const wrapper = mountSpinbox({ value: 5, min: 1, max: 100 })
    const input = findInput(wrapper)
    input.element.value = ''
    await input.trigger('input')
    expect(wrapper.emitted('update:value')).toBeUndefined()
  })

  test('blur on empty input restores the current value', async () => {
    const wrapper = mountSpinbox({ value: 7, min: 1, max: 100 })
    const input = findInput(wrapper)
    input.element.value = ''
    await input.trigger('blur')
    expect(input.element.value).toBe('7')
    expect(wrapper.emitted('update:value')).toBeUndefined()
  })

  test('blur clamps a typed below-min value to min', async () => {
    const wrapper = mountSpinbox({ value: 50, min: 5, max: 100 })
    const input = findInput(wrapper)
    input.element.value = '1'
    await input.trigger('input')
    await input.trigger('blur')
    const emitted = wrapper.emitted('update:value')
    expect(emitted[emitted.length - 1]).toEqual([5])
    expect(input.element.value).toBe('5')
  })

  test('focus selects all text in the input', async () => {
    const wrapper = mountSpinbox({ value: 42 })
    const input = findInput(wrapper)
    input.element.focus()
    await input.trigger('focus')
    expect(input.element.selectionStart).toBe(0)
    expect(input.element.selectionEnd).toBe(String(input.element.value).length)
  })

  // ── Input mask (beforeinput) ───────────────────────────────────────────────

  test('blocks "." via beforeinput', async () => {
    const wrapper = mountSpinbox({ value: 5, min: 1, max: 100 })
    const input = findInput(wrapper)
    const event = new InputEvent('beforeinput', { data: '.', cancelable: true })
    input.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  test('blocks "e" via beforeinput', async () => {
    const wrapper = mountSpinbox({ value: 5, min: 1, max: 100 })
    const input = findInput(wrapper)
    const event = new InputEvent('beforeinput', { data: 'e', cancelable: true })
    input.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  test('blocks "+" via beforeinput', async () => {
    const wrapper = mountSpinbox({ value: 5, min: 1, max: 100 })
    const input = findInput(wrapper)
    const event = new InputEvent('beforeinput', { data: '+', cancelable: true })
    input.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  test('blocks "-" when min is non-negative', async () => {
    const wrapper = mountSpinbox({ value: 5, min: 0, max: 100 })
    const input = findInput(wrapper)
    const event = new InputEvent('beforeinput', { data: '-', cancelable: true })
    input.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  test('allows "-" when min is negative', async () => {
    const wrapper = mountSpinbox({ value: 0, min: -10, max: 10 })
    const input = findInput(wrapper)
    const event = new InputEvent('beforeinput', { data: '-', cancelable: true })
    input.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  test('allows digits via beforeinput', async () => {
    const wrapper = mountSpinbox({ value: 5, min: 1, max: 100 })
    const input = findInput(wrapper)
    const event = new InputEvent('beforeinput', { data: '7', cancelable: true })
    input.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  test('blocks pasted strings containing non-digits', async () => {
    const wrapper = mountSpinbox({ value: 5, min: 1, max: 100 })
    const input = findInput(wrapper)
    const event = new InputEvent('beforeinput', { data: '12.5', cancelable: true })
    input.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  test('beforeinput with null data (e.g. backspace) is allowed', async () => {
    const wrapper = mountSpinbox({ value: 5, min: 1, max: 100 })
    const input = findInput(wrapper)
    const event = new InputEvent('beforeinput', { data: null, cancelable: true })
    input.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  // ── Container is not a label (regression) ──────────────────────────────────

  test('container is a div, not a label, so clicks do not bubble to decrement', () => {
    const wrapper = mountSpinbox({ value: 5 })
    const container = wrapper.find('[data-testid="ui-kit-spinbox-container"]')
    expect(container.element.tagName).toBe('DIV')
  })

  // ── Defaults ──────────────────────────────────────────────────────────────

  test('with no min/max, both buttons are enabled by default', () => {
    const wrapper = mountSpinbox({ value: 0 })
    expect(findDecrement(wrapper).attributes('disabled')).toBe('false')
    expect(findIncrement(wrapper).attributes('disabled')).toBe('false')
  })

  test('default step is 1', async () => {
    const wrapper = mountSpinbox({ value: 5 })
    await findIncrement(wrapper).trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([[6]])
  })
})

// ── Button clickability (regression: captureMode) ──────────────────────────

describe('SpinboxButton', () => {
  test('clicking the button emits click on a fine-pointer device', async () => {
    const wrapper = mount(SpinboxButton, { props: { icon: 'chevron-up' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
