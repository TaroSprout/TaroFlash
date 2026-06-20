import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { _resetGestureState } from '@/composables/ui/gestures'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))
vi.mock('@/sfx/config', () => ({
  TYPE_SFX: [],
  SOUNDS: {},
  BUS_DEFAULTS: { interface: 5, study: 5, hover: 5 }
}))

import UiSlider from '@/components/ui-kit/slider.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const EDGE_PX = 20

let _activeWrappers = []

afterEach(() => {
  for (const w of _activeWrappers) w.unmount()
  _activeWrappers = []
  _resetGestureState()
})

/**
 * Mount a slider attached to document.body with a two-way-bound model value.
 * Returns wrapper + a `getValue()` accessor that returns the current model.
 * Wrappers are auto-unmounted in afterEach.
 */
function makeSlider(props = {}, initialValue = 5) {
  let model = initialValue
  const wrapper = mount(UiSlider, {
    attachTo: document.body,
    props: {
      modelValue: model,
      'onUpdate:modelValue': (v) => {
        model = v
        wrapper.setProps({ modelValue: v })
      },
      ...props
    }
  })
  _activeWrappers.push(wrapper)
  return { wrapper, getValue: () => model }
}

function root(wrapper) {
  return wrapper.find('[data-testid="ui-kit-slider"]')
}

// ── Structure ─────────────────────────────────────────────────────────────────

describe('UiSlider — structure', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('renders the root, fill, handle, content, and content-fill parts', () => {
    const { wrapper } = makeSlider()
    expect(root(wrapper).exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-kit-slider__fill"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-kit-slider__handle"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-kit-slider__content"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-kit-slider__content-fill"]').exists()).toBe(true)
  })

  test('shows value in the content overlay', () => {
    const { wrapper } = makeSlider({}, 7)
    const value_el = wrapper.find('[data-testid="ui-kit-slider__value"]')
    expect(value_el.exists()).toBe(true)
    expect(value_el.text()).toBe('7')
  })

  test('renders label when label prop is provided', () => {
    const { wrapper } = makeSlider({ label: 'Volume' })
    expect(wrapper.find('[data-testid="ui-kit-slider__label"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ui-kit-slider__label"]').text()).toBe('Volume')
  })

  test('does not render label when label prop is omitted', () => {
    const { wrapper } = makeSlider()
    expect(wrapper.find('[data-testid="ui-kit-slider__label"]').exists()).toBe(false)
  })

  test('root has role="slider" and aria attributes', () => {
    const { wrapper } = makeSlider({ min: 0, max: 10, label: 'Gain' }, 4)
    const el = root(wrapper)
    expect(el.attributes('role')).toBe('slider')
    expect(el.attributes('aria-valuemin')).toBe('0')
    expect(el.attributes('aria-valuemax')).toBe('10')
    expect(el.attributes('aria-valuenow')).toBe('4')
    expect(el.attributes('aria-label')).toBe('Gain')
    expect(el.attributes('tabindex')).toBe('0')
  })
})

// ── Tick markers ──────────────────────────────────────────────────────────────

describe('UiSlider — tick markers', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('renders tick markers when step count is between 2 and 20', () => {
    // min=0, max=10, step=1 → 10 steps → 9 interior ticks (count-1)
    const { wrapper } = makeSlider({ min: 0, max: 10, step: 1, ticks: true }, 0)
    const ticks = wrapper.findAll('[data-testid="ui-kit-slider__tick"]')
    expect(ticks).toHaveLength(9)
  })

  test('renders no ticks when step count is 1 (below minimum of 2)', () => {
    // min=0, max=1, step=1 → 1 step → 0 interior ticks
    const { wrapper } = makeSlider({ min: 0, max: 1, step: 1, ticks: true }, 0)
    const ticks = wrapper.findAll('[data-testid="ui-kit-slider__tick"]')
    expect(ticks).toHaveLength(0)
  })

  test('renders no ticks when step count exceeds MAX_TICKS (20)', () => {
    // min=0, max=21, step=1 → 21 steps → suppressed
    const { wrapper } = makeSlider({ min: 0, max: 21, step: 1, ticks: true }, 0)
    const ticks = wrapper.findAll('[data-testid="ui-kit-slider__tick"]')
    expect(ticks).toHaveLength(0)
  })

  test('renders no ticks when ticks prop is false', () => {
    const { wrapper } = makeSlider({ min: 0, max: 10, step: 1, ticks: false }, 0)
    const ticks = wrapper.findAll('[data-testid="ui-kit-slider__tick"]')
    expect(ticks).toHaveLength(0)
  })

  test('ticks at or before the value are hidden (data-visible=false)', async () => {
    // min=0, max=4, step=1 → ticks at 1,2,3
    // value=2 → tick at 1 hidden, tick at 2 hidden, tick at 3 visible
    const { wrapper } = makeSlider({ min: 0, max: 4, step: 1, ticks: true }, 2)
    const ticks = wrapper.findAll('[data-testid="ui-kit-slider__tick"]')
    // tick[0] = value 1, tick[1] = value 2, tick[2] = value 3
    expect(ticks[0].attributes('data-visible')).toBe('false') // 1 <= 2 → hidden
    expect(ticks[1].attributes('data-visible')).toBe('false') // 2 <= 2 → hidden
    expect(ticks[2].attributes('data-visible')).toBe('true') // 3 > 2 → visible
  })

  test('renders exactly MAX_TICKS-1 ticks when step count is exactly 20', () => {
    // min=0, max=20, step=1 → 20 steps → 19 interior ticks
    const { wrapper } = makeSlider({ min: 0, max: 20, step: 1, ticks: true }, 0)
    const ticks = wrapper.findAll('[data-testid="ui-kit-slider__tick"]')
    expect(ticks).toHaveLength(19)
  })
})

// ── Keyboard accessibility ─────────────────────────────────────────────────────

describe('UiSlider — keyboard a11y', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('ArrowRight increments value by step', async () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    await root(wrapper).trigger('keydown', { key: 'ArrowRight' })
    expect(getValue()).toBe(6)
  })

  test('ArrowUp increments value by step', async () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    await root(wrapper).trigger('keydown', { key: 'ArrowUp' })
    expect(getValue()).toBe(6)
  })

  test('ArrowLeft decrements value by step', async () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    await root(wrapper).trigger('keydown', { key: 'ArrowLeft' })
    expect(getValue()).toBe(4)
  })

  test('ArrowDown decrements value by step', async () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    await root(wrapper).trigger('keydown', { key: 'ArrowDown' })
    expect(getValue()).toBe(4)
  })

  test('Home sets value to min', async () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 7)
    await root(wrapper).trigger('keydown', { key: 'Home' })
    expect(getValue()).toBe(0)
  })

  test('End sets value to max', async () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 3)
    await root(wrapper).trigger('keydown', { key: 'End' })
    expect(getValue()).toBe(10)
  })

  test('ArrowRight at max is clamped to max', async () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 10)
    await root(wrapper).trigger('keydown', { key: 'ArrowRight' })
    expect(getValue()).toBe(10)
  })

  test('ArrowLeft at min is clamped to min', async () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 0)
    await root(wrapper).trigger('keydown', { key: 'ArrowLeft' })
    expect(getValue()).toBe(0)
  })

  test('ArrowRight with step=2 increments by 2', async () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 2 }, 4)
    await root(wrapper).trigger('keydown', { key: 'ArrowRight' })
    expect(getValue()).toBe(6)
  })

  test('unrecognised key does not change value', async () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    await root(wrapper).trigger('keydown', { key: 'Enter' })
    expect(getValue()).toBe(5)
  })

  test('unrecognised key does not call emitSfx', async () => {
    const { wrapper } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    await root(wrapper).trigger('keydown', { key: 'Tab' })
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})

// ── applyX / drag stepping math ───────────────────────────────────────────────

describe('UiSlider — applyX stepping and clamping', () => {
  /**
   * To test applyX we simulate pointer events on the mounted element.
   * We spoof getBoundingClientRect so the math is deterministic:
   *   rect_left = 0, rect_width = 200
   *   effective travel = 200 - 2*20 = 160px starting at x=20
   *   clientX=20 → min, clientX=180 → max
   */

  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  function simulateDrag(wrapper, clientX) {
    const el = root(wrapper).element
    el.getBoundingClientRect = () => ({
      left: 0,
      width: 200,
      top: 0,
      bottom: 0,
      right: 200,
      height: 0
    })
    el.setPointerCapture = vi.fn()
    el.dispatchEvent(
      new PointerEvent('pointerdown', { clientX, clientY: 0, pointerId: 1, bubbles: true })
    )
    document.dispatchEvent(
      new PointerEvent('pointerup', { clientX, clientY: 0, pointerId: 1, bubbles: true })
    )
  }

  test('pointer at left edge (x <= EDGE_PX) snaps to min', () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    simulateDrag(wrapper, EDGE_PX) // x = 20 → ratio 0 → value 0
    expect(getValue()).toBe(0)
  })

  test('pointer at right edge (x >= width - EDGE_PX) snaps to max', () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    simulateDrag(wrapper, 200 - EDGE_PX) // x = 180 → ratio 1 → value 10
    expect(getValue()).toBe(10)
  })

  test('pointer beyond right edge is clamped to max', () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    simulateDrag(wrapper, 250)
    expect(getValue()).toBe(10)
  })

  test('pointer before left edge is clamped to min', () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    simulateDrag(wrapper, 0)
    expect(getValue()).toBe(0)
  })

  test('pointer at midpoint yields mid value', () => {
    // min=0, max=10, step=1; travel 160px from x=20 to x=180
    // midpoint x=100 → (100-20)/160=0.5 → raw=5 → stepped=5
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 0)
    simulateDrag(wrapper, 100)
    expect(getValue()).toBe(5)
  })

  test('stepped value rounds to nearest notch', () => {
    // min=0, max=10, step=2; x=36 → ratio=(36-20)/160=0.1 → raw=1 → nearest step=0 vs 2=2 rounds to 0... ratio 0.1 * 10 = 1.0 → round(1/2)*2 = 2
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 2 }, 0)
    // x=36: ratio=(36-20)/160=0.1 → raw=0+0.1*10=1 → round(1/2)*2=2
    simulateDrag(wrapper, 36)
    expect(getValue()).toBe(2)
  })

  test('emitSfx is called with tick sound when value changes', () => {
    const { wrapper } = makeSlider({ min: 0, max: 10, step: 1, sfx: { tick: 'tap_05' } }, 5)
    simulateDrag(wrapper, EDGE_PX) // will change from 5 → 0
    expect(mockEmitSfx).toHaveBeenCalledWith('tap_05', { bus: undefined })
  })

  test('emitSfx is NOT called when drag lands on current value', () => {
    // value already at 0; drag to left edge → stepped=0=current → no emit
    const { wrapper } = makeSlider({ min: 0, max: 10, step: 1 }, 0)
    simulateDrag(wrapper, EDGE_PX)
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('sfx.bus is forwarded to emitSfx', () => {
    const { wrapper } = makeSlider({ min: 0, max: 10, step: 1, sfx: { bus: 'study' } }, 5)
    simulateDrag(wrapper, EDGE_PX) // 5 → 0 = change
    expect(mockEmitSfx).toHaveBeenCalledWith('tap_05', { bus: 'study' })
  })

  test('sfx.tick defaults to tap_05 when not specified', () => {
    const { wrapper } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    simulateDrag(wrapper, EDGE_PX)
    expect(mockEmitSfx).toHaveBeenCalledWith('tap_05', { bus: undefined })
  })

  test('pointermove mid-drag updates the value (onMove path)', () => {
    const { wrapper, getValue } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    const el = root(wrapper).element
    el.getBoundingClientRect = () => ({
      left: 0,
      width: 200,
      top: 0,
      bottom: 0,
      right: 200,
      height: 0
    })
    el.setPointerCapture = vi.fn()
    // start at midpoint (value 5)
    el.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 100, clientY: 0, pointerId: 1, bubbles: true })
    )
    // move to left edge (value 0)
    document.dispatchEvent(
      new PointerEvent('pointermove', { clientX: EDGE_PX, clientY: 0, pointerId: 1, bubbles: true })
    )
    document.dispatchEvent(
      new PointerEvent('pointerup', { clientX: EDGE_PX, clientY: 0, pointerId: 1, bubbles: true })
    )
    expect(getValue()).toBe(0)
  })

  test('pointercancel clears the dragging state (onCancel path)', async () => {
    const { wrapper } = makeSlider({ min: 0, max: 10, step: 1 }, 5)
    const el = root(wrapper).element
    el.getBoundingClientRect = () => ({
      left: 0,
      width: 200,
      top: 0,
      bottom: 0,
      right: 200,
      height: 0
    })
    el.setPointerCapture = vi.fn()
    el.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 100, clientY: 0, pointerId: 1, bubbles: true })
    )
    document.dispatchEvent(
      new PointerEvent('pointercancel', {
        clientX: 100,
        clientY: 0,
        pointerId: 1,
        bubbles: true
      })
    )
    await nextTick()
    // After cancel the root is no longer in the dragging state
    expect(root(wrapper).attributes('data-active')).toBe('false')
  })
})
