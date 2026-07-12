import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, mockEmitHoverSfx, coarseRef, fineRef, mockPlayButtonTap } = vi.hoisted(() => {
  const coarseRef = { value: true }
  const fineRef = { value: false }
  return {
    coarseRef,
    fineRef,
    mockEmitSfx: vi.fn(),
    mockEmitHoverSfx: vi.fn(),
    mockPlayButtonTap: vi.fn(() => ({ peak: Promise.resolve(), done: Promise.resolve() }))
  }
})

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: mockEmitHoverSfx
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: (query) => (query === 'fine' ? fineRef : coarseRef)
}))

vi.mock('@/utils/animations/button-tap', () => ({
  BUTTON_TAP_DURATION: 0.1,
  playButtonTap: mockPlayButtonTap
}))

// ── Component import (after mocks) ────────────────────────────────────────────

import UiTappable from '@/components/ui-kit/tappable.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountTappable(props = {}) {
  return mount(UiTappable, {
    props,
    global: { directives: { sfx: {} } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  coarseRef.value = true
  fineRef.value = false
  mockPlayButtonTap.mockReturnValue({ peak: Promise.resolve(), done: Promise.resolve() })
})

describe('UiTappable — root element', () => {
  test('renders as a button by default', () => {
    const wrapper = mountTappable()
    expect(wrapper.element.tagName.toLowerCase()).toBe('button')
  })

  test('renders as the element specified by the "as" prop', () => {
    const wrapper = mountTappable({ as: 'div' })
    expect(wrapper.element.tagName.toLowerCase()).toBe('div')
  })
})

describe('UiTappable — tap event', () => {
  test('emits tap event when clicked (fine pointer fires immediately)', async () => {
    // Use fine pointer so tap fires synchronously without needing timer advance
    coarseRef.value = false
    const wrapper = mountTappable()
    await wrapper.trigger('click')
    await flushPromises()
    expect(wrapper.emitted('tap')).toBeTruthy()
  })
})

describe('UiTappable — sfx.press read at click time [obligation]', () => {
  test('uses sfx.press from the prop at mount time on first click', async () => {
    // Fine pointer so staged-tap fires audio immediately
    coarseRef.value = false
    const wrapper = mountTappable({ sfx: { press: 'snappy_button_5' } })
    await wrapper.trigger('click')
    await flushPromises()
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5', expect.anything())
  })

  test('reflects sfx.press prop change on next click after mount [obligation]', async () => {
    coarseRef.value = false
    const wrapper = mountTappable({ sfx: { press: 'snappy_button_5' } })

    // First click — plays the original sound
    await wrapper.trigger('click')
    await flushPromises()
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5', expect.anything())

    // Change the prop after mount
    await wrapper.setProps({ sfx: { press: 'digi_powerdown' } })
    vi.clearAllMocks()

    // Second click — must use the updated press sound, not the original
    await wrapper.trigger('click')
    await flushPromises()
    expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown', expect.anything())
    expect(mockEmitSfx).not.toHaveBeenCalledWith('snappy_button_5', expect.anything())
  })

  test('plays no sfx when sfx.press is not set', async () => {
    coarseRef.value = false
    const wrapper = mountTappable({ sfx: {} })
    await wrapper.trigger('click')
    await flushPromises()
    // emitSfx must not be called for the press sound when key is absent
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})

describe('UiTappable — data-tap-active state', () => {
  test('data-tap-active attribute is absent when not animating', () => {
    coarseRef.value = false
    const wrapper = mountTappable()
    expect(wrapper.attributes('data-tap-active')).toBeUndefined()
  })

  test('data-tap-active is set to "true" during coarse animation', async () => {
    coarseRef.value = true
    let resolvePeak
    mockPlayButtonTap.mockReturnValue({
      peak: new Promise((r) => (resolvePeak = r)),
      done: Promise.resolve()
    })
    const wrapper = mountTappable({ animate: 'pop' })
    const p = wrapper.trigger('click')
    // Give a microtask tick so playing ref updates
    await Promise.resolve()
    expect(wrapper.attributes('data-tap-active')).toBe('true')
    resolvePeak()
    await p
    await flushPromises()
  })
})

describe('UiTappable — active prop [obligation]', () => {
  test('data-tap-active is "true" when active is true, with no hover or press', () => {
    const wrapper = mountTappable({ active: true })
    expect(wrapper.attributes('data-tap-active')).toBe('true')
  })

  test('data-tap-active is absent when active is false and nothing else is active', () => {
    const wrapper = mountTappable({ active: false })
    expect(wrapper.attributes('data-tap-active')).toBeUndefined()
  })
})

describe('UiTappable — active_on_hover [obligation]', () => {
  test('hover does not set data-tap-active when active_on_hover is unset (default off)', async () => {
    fineRef.value = true
    const wrapper = mountTappable()
    await wrapper.trigger('pointerenter')
    expect(wrapper.attributes('data-tap-active')).toBeUndefined()
  })

  test('hover sets data-tap-active to "true" when active_on_hover is set on a fine pointer', async () => {
    fineRef.value = true
    const wrapper = mountTappable({ active_on_hover: true })
    await wrapper.trigger('pointerenter')
    expect(wrapper.attributes('data-tap-active')).toBe('true')
  })

  test('pointerleave clears the hover-driven data-tap-active', async () => {
    fineRef.value = true
    const wrapper = mountTappable({ active_on_hover: true })
    await wrapper.trigger('pointerenter')
    expect(wrapper.attributes('data-tap-active')).toBe('true')
    await wrapper.trigger('pointerleave')
    expect(wrapper.attributes('data-tap-active')).toBeUndefined()
  })

  test('hover does not set data-tap-active on a coarse pointer even when active_on_hover is set', async () => {
    fineRef.value = false
    const wrapper = mountTappable({ active_on_hover: true })
    await wrapper.trigger('pointerenter')
    expect(wrapper.attributes('data-tap-active')).toBeUndefined()
  })
})
