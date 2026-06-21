import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

// UiTooltip wraps with @floating-ui and Teleport; stub so slot content renders.
const TooltipStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('label', { ...attrs }, slots.default?.())
  }
})

import UiInput from '@/components/ui-kit/input.vue'
import { vSfx } from '@/sfx/directive'

function mountInput(props = {}) {
  return mount(UiInput, {
    props,
    global: {
      stubs: { UiTooltip: TooltipStub },
      directives: { sfx: vSfx }
    }
  })
}

describe('UiInput', () => {
  beforeEach(() => {
    mockEmitSfx.mockReset()
  })

  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the input wrapper element', () => {
    const wrapper = mountInput()
    expect(wrapper.find('[data-testid="ui-kit-input"]').exists()).toBe(true)
  })

  test('renders an <input> element inside the wrapper', () => {
    const wrapper = mountInput()
    expect(wrapper.find('input').exists()).toBe(true)
  })

  // ── placeholder ────────────────────────────────────────────────────────────

  test('sets placeholder attribute on the <input>', () => {
    const wrapper = mountInput({ placeholder: 'Enter email…' })
    expect(wrapper.find('input').attributes('placeholder')).toBe('Enter email…')
  })

  // ── label ──────────────────────────────────────────────────────────────────

  test('renders a label span when label prop is provided', () => {
    const wrapper = mountInput({ label: 'Email address' })
    expect(wrapper.find('span').text()).toBe('Email address')
  })

  test('does not render a label span when label prop is omitted', () => {
    const wrapper = mountInput()
    expect(wrapper.find('span').exists()).toBe(false)
  })

  // ── model binding ──────────────────────────────────────────────────────────

  test('emits update:value when user types into the input', async () => {
    const wrapper = mountInput()
    await wrapper.find('input').setValue('hello')
    expect(wrapper.emitted('update:value')).toBeTruthy()
  })

  // ── attrs passthrough ──────────────────────────────────────────────────────

  test('forwards type attribute to the <input>', () => {
    const wrapper = mountInput({ type: 'email' })
    expect(wrapper.find('input').attributes('type')).toBe('email')
  })

  // ── sfx on focus ──────────────────────────────────────────────────────────

  test('plays type_05 sfx when the <input> receives focus [obligation]', async () => {
    const wrapper = mountInput()
    await wrapper.find('input').trigger('focus')
    expect(mockEmitSfx).toHaveBeenCalledWith('type_05', expect.anything())
  })
})
