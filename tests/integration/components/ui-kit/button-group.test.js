import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn(),
  emitStudySfx: vi.fn()
}))

import UiButtonGroup from '@/components/ui-kit/button-group.vue'

// ── UiButton stub ─────────────────────────────────────────────────────────────
// Forwards attrs (including :style) and emits press on click so we can verify
// styleFor outputs and press passthrough.

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_props, { emit, slots }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          ...attrs,
          'data-testid': 'ui-button-group__button',
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const SINGLE = [{ value: 'a', label: 'A' }]
const DOUBLE = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' }
]
const TRIPLE = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' }
]

function mountGroup(props = {}) {
  return shallowMount(UiButtonGroup, {
    props: { options: DOUBLE, size: 'xl', ...props },
    global: { stubs: { UiButton: UiButtonStub } }
  })
}

function getButtons(wrapper) {
  return wrapper.findAll('[data-testid="ui-button-group__button"]')
}

function styleOf(btn) {
  return btn.attributes('style') ?? ''
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UiButtonGroup', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  test('renders one button per option', () => {
    const wrapper = mountGroup({ options: TRIPLE })
    expect(getButtons(wrapper)).toHaveLength(3)
  })

  // ── Border-radius per position [obligation] ────────────────────────────────

  test('single item gets full-radius on all corners [obligation]', () => {
    const wrapper = mountGroup({ options: SINGLE, size: 'xl' })
    const style = styleOf(getButtons(wrapper)[0])
    // Single item: borderRadius = r (22.5px for xl)
    expect(style).toContain('22.5px')
    // All four corners are the same value so no inner radius
    expect(style).not.toContain('4px')
  })

  test('first button: outer-left corners = size radius, inner-right = 4px [obligation]', () => {
    const wrapper = mountGroup({ options: DOUBLE, size: 'xl' })
    const [first] = getButtons(wrapper)
    const style = styleOf(first)
    // First: `${r} ${inner} ${inner} ${r}` = "22.5px 4px 4px 22.5px"
    expect(style).toContain('22.5px 4px 4px 22.5px')
  })

  test('last button: outer-right corners = size radius, inner-left = 4px [obligation]', () => {
    const wrapper = mountGroup({ options: DOUBLE, size: 'xl' })
    const buttons = getButtons(wrapper)
    const last = buttons[buttons.length - 1]
    const style = styleOf(last)
    // Last: `${inner} ${r} ${r} ${inner}` = "4px 22.5px 22.5px 4px"
    expect(style).toContain('4px 22.5px 22.5px 4px')
  })

  test('middle buttons get all 4px corners [obligation]', () => {
    const wrapper = mountGroup({ options: TRIPLE, size: 'xl' })
    const middle = getButtons(wrapper)[1]
    const style = styleOf(middle)
    // Middle: inner = '4px' on all four corners
    expect(style).toContain('4px')
    expect(style).not.toContain('22.5px')
  })

  test('size=lg uses 19px outer radius', () => {
    const wrapper = mountGroup({ options: DOUBLE, size: 'lg' })
    const [first] = getButtons(wrapper)
    expect(styleOf(first)).toContain('19px')
  })

  test('size=base uses 18px outer radius', () => {
    const wrapper = mountGroup({ options: DOUBLE, size: 'base' })
    const [first] = getButtons(wrapper)
    expect(styleOf(first)).toContain('18px')
  })

  test('size=sm uses 13px outer radius', () => {
    const wrapper = mountGroup({ options: DOUBLE, size: 'sm' })
    const [first] = getButtons(wrapper)
    expect(styleOf(first)).toContain('13px')
  })

  // ── Padding-x override [obligation] ───────────────────────────────────────

  test('xl size sets --btn-padding-x to 20px on every button [obligation]', () => {
    const wrapper = mountGroup({ options: TRIPLE, size: 'xl' })
    for (const btn of getButtons(wrapper)) {
      expect(styleOf(btn)).toContain('--btn-padding-x: 20px')
    }
  })

  test('lg size sets --btn-padding-x to 16px', () => {
    const wrapper = mountGroup({ options: DOUBLE, size: 'lg' })
    for (const btn of getButtons(wrapper)) {
      expect(styleOf(btn)).toContain('--btn-padding-x: 16px')
    }
  })

  test('base size sets --btn-padding-x to 10px', () => {
    const wrapper = mountGroup({ options: DOUBLE, size: 'base' })
    for (const btn of getButtons(wrapper)) {
      expect(styleOf(btn)).toContain('--btn-padding-x: 10px')
    }
  })

  test('sm size sets --btn-padding-x to 8px', () => {
    const wrapper = mountGroup({ options: DOUBLE, size: 'sm' })
    for (const btn of getButtons(wrapper)) {
      expect(styleOf(btn)).toContain('--btn-padding-x: 8px')
    }
  })

  // ── Press event passthrough ────────────────────────────────────────────────

  test('clicking a button emits "press" with the option value', async () => {
    const wrapper = mountGroup({ options: DOUBLE })
    await getButtons(wrapper)[0].trigger('click')
    expect(wrapper.emitted('press')).toHaveLength(1)
    expect(wrapper.emitted('press')[0][0]).toBe('a')
  })

  test('clicking the second button emits "press" with the second option value', async () => {
    const wrapper = mountGroup({ options: DOUBLE })
    await getButtons(wrapper)[1].trigger('click')
    expect(wrapper.emitted('press')[0][0]).toBe('b')
  })
})
