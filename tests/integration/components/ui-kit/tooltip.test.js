import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import UiTooltip from '@/components/ui-kit/tooltip.vue'

vi.mock('@floating-ui/vue', () => ({
  useFloating: vi.fn(() => ({
    floatingStyles: { value: {} },
    update: vi.fn()
  })),
  flip: vi.fn(() => ({})),
  offset: vi.fn(() => ({})),
  autoUpdate: vi.fn(() => () => {})
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn(() => ({ value: false }))
}))

function mountTooltip(props = {}, slots = {}, attrs = {}) {
  return mount(UiTooltip, {
    props: { text: 'hello', ...props },
    attrs,
    slots: { default: '<span data-testid="trigger-label">trigger</span>', ...slots },
    attachTo: document.body
  })
}

async function dispatchPointer(wrapper, type, pointerType) {
  wrapper.element.dispatchEvent(
    new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType })
  )
  await flushPromises()
}

function tooltipExists() {
  return document.body.querySelector('[data-testid="ui-tooltip"]') !== null
}

describe('UiTooltip', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('pointer activation', () => {
    test('pointerenter with mouse activates the tooltip', async () => {
      const wrapper = mountTooltip()

      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      expect(tooltipExists()).toBe(true)
      wrapper.unmount()
    })

    test('pointerenter with touch does NOT activate the tooltip', async () => {
      const wrapper = mountTooltip()

      await dispatchPointer(wrapper, 'pointerenter', 'touch')

      expect(tooltipExists()).toBe(false)
      wrapper.unmount()
    })

    test('pointerenter with pen does NOT activate the tooltip', async () => {
      const wrapper = mountTooltip()

      await dispatchPointer(wrapper, 'pointerenter', 'pen')

      expect(tooltipExists()).toBe(false)
      wrapper.unmount()
    })

    test('pointerleave with mouse deactivates the tooltip', async () => {
      const wrapper = mountTooltip()

      await dispatchPointer(wrapper, 'pointerenter', 'mouse')
      expect(tooltipExists()).toBe(true)

      await dispatchPointer(wrapper, 'pointerleave', 'mouse')
      expect(tooltipExists()).toBe(false)
      wrapper.unmount()
    })

    test('pointerleave with touch does not affect mouse-activated state', async () => {
      const wrapper = mountTooltip()

      await dispatchPointer(wrapper, 'pointerenter', 'mouse')
      expect(tooltipExists()).toBe(true)

      await dispatchPointer(wrapper, 'pointerleave', 'touch')
      expect(tooltipExists()).toBe(true)
      wrapper.unmount()
    })
  })

  describe('focus activation (still works)', () => {
    test('focusin shows the tooltip regardless of pointer events', async () => {
      const wrapper = mountTooltip()

      wrapper.element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await flushPromises()

      expect(tooltipExists()).toBe(true)
      wrapper.unmount()
    })
  })

  describe('suppress', () => {
    test('suppress=true keeps the tooltip hidden even when activated by mouse', async () => {
      const wrapper = mountTooltip({ suppress: true })

      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      expect(tooltipExists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('palette — popover reads data-palette off attrs, not a prop', () => {
    test('popover carries data-depth="overlay" and no data-palette when none is passed', async () => {
      const wrapper = mountTooltip()
      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      const popover = document.body.querySelector('[data-testid="ui-tooltip"]')
      expect(popover.getAttribute('data-depth')).toBe('overlay')
      expect(popover.getAttribute('data-palette')).toBeNull()
      wrapper.unmount()
    })

    test("a data-palette attr reaches the teleported popover (it can't inherit through the DOM)", async () => {
      const wrapper = mountTooltip({}, {}, { 'data-palette': 'danger' })
      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      const popover = document.body.querySelector('[data-testid="ui-tooltip"]')
      expect(popover.getAttribute('data-palette')).toBe('danger')
      wrapper.unmount()
    })
  })

  describe('max_chars / is_multiline [obligation]', () => {
    test('max_chars defaults to 32 and sets maxWidth to 32ch [obligation]', async () => {
      const wrapper = mountTooltip({ text: 'short' })
      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      const popover = document.body.querySelector('[data-testid="ui-tooltip"]')
      expect(popover.style.maxWidth).toBe('32ch')
      wrapper.unmount()
    })

    test('data-multiline is "false" when text.length <= max_chars [obligation]', async () => {
      const wrapper = mountTooltip({ text: 'short text' })
      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      const popover = document.body.querySelector('[data-testid="ui-tooltip"]')
      expect(popover.getAttribute('data-multiline')).toBe('false')
      wrapper.unmount()
    })

    test('data-multiline is "true" when text.length > max_chars [obligation]', async () => {
      const long_text = 'a'.repeat(40)
      const wrapper = mountTooltip({ text: long_text })
      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      const popover = document.body.querySelector('[data-testid="ui-tooltip"]')
      expect(popover.getAttribute('data-multiline')).toBe('true')
      wrapper.unmount()
    })

    test('a custom max_chars is respected for both maxWidth and the multiline threshold [obligation]', async () => {
      const text = 'a'.repeat(10)
      const wrapper = mountTooltip({ text, max_chars: 8 })
      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      const popover = document.body.querySelector('[data-testid="ui-tooltip"]')
      expect(popover.style.maxWidth).toBe('8ch')
      // text.length (10) > max_chars (8) → multiline
      expect(popover.getAttribute('data-multiline')).toBe('true')
      wrapper.unmount()
    })

    test('a custom max_chars that exceeds text.length resolves data-multiline to "false" [obligation]', async () => {
      const text = 'a'.repeat(10)
      const wrapper = mountTooltip({ text, max_chars: 20 })
      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      const popover = document.body.querySelector('[data-testid="ui-tooltip"]')
      expect(popover.getAttribute('data-multiline')).toBe('false')
      wrapper.unmount()
    })
  })
})
