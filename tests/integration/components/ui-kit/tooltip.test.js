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

  describe('theme — popover uses explicit props, not fallthrough attrs', () => {
    test('popover uses white/brown-100 defaults when no theme prop is passed', async () => {
      const wrapper = mountTooltip()
      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      const popover = document.body.querySelector('[data-testid="ui-tooltip"]')
      expect(popover.getAttribute('data-theme')).toBe('white')
      expect(popover.getAttribute('data-theme-dark')).toBe('brown-100')
      wrapper.unmount()
    })

    test('passing theme prop changes the popover data-theme', async () => {
      const wrapper = mountTooltip({ theme: 'blue-500', theme_dark: 'blue-650' })
      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      const popover = document.body.querySelector('[data-testid="ui-tooltip"]')
      expect(popover.getAttribute('data-theme')).toBe('blue-500')
      expect(popover.getAttribute('data-theme-dark')).toBe('blue-650')
      wrapper.unmount()
    })

    test('a data-theme attr arriving via fallthrough attrs does NOT change the popover theme (regression guard)', async () => {
      // When a parent component sets data-theme on <ui-tooltip data-theme="red-500">,
      // that attr should fall through to the trigger element only — NOT reach
      // the teleported popover, which is themed exclusively via the theme prop.
      const wrapper = mountTooltip({}, {}, { 'data-theme': 'red-500' })
      await dispatchPointer(wrapper, 'pointerenter', 'mouse')

      const popover = document.body.querySelector('[data-testid="ui-tooltip"]')
      // Popover must still use the default white theme
      expect(popover.getAttribute('data-theme')).toBe('white')
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
