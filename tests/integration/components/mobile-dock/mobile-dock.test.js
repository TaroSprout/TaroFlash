import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { defineComponent, h } from 'vue'
import { DEFAULT_BREAKPOINT, useMobileDock } from '@/components/mobile-dock/use-mobile-dock'
import { setBelowBreakpoint, resetBreakpointMedia } from '../../../helpers/breakpoint-media-mock'
import { setKeyboardOpen } from '../../../helpers/keyboard-open-mock'
import MobileDock from '@/components/mobile-dock/mobile-dock.vue'

// The dock reads its own `w<<breakpoint>` queries — mock per-query so a claim's
// breakpoint can be checked without touching the real matchMedia surface.
vi.mock('@/composables/ui/media-query', async () => {
  const m = await import('../../../helpers/breakpoint-media-mock')
  return m.breakpointMediaMockModule
})

vi.mock('@/composables/ui/keyboard', async () => {
  const m = await import('../../../helpers/keyboard-open-mock')
  return m.keyboardOpenMockModule
})

// ── Helpers ───────────────────────────────────────────────────────────────────

// mobile-dock teleports its slot into [mobile-dock-content]. Create that target
// before each test so Teleport has a valid destination.
let content_target
let above_target
const wrappers = []

function mountFill(slots = {}, props = {}) {
  const wrapper = mount(MobileDock, { attachTo: document.body, props, slots })
  wrappers.push(wrapper)
  return wrapper
}

// ── State reset ───────────────────────────────────────────────────────────────

beforeEach(() => {
  setKeyboardOpen(false)
  resetBreakpointMedia()

  // Create the teleport target that [mobile-dock-content] expects.
  content_target = document.createElement('div')
  content_target.setAttribute('mobile-dock-content', '')
  document.body.appendChild(content_target)

  // Create the above teleport target (rendered by mobile-dock-host).
  above_target = document.createElement('div')
  above_target.setAttribute('mobile-dock-above', '')
  document.body.appendChild(above_target)
})

afterEach(() => {
  wrappers.forEach((w) => w.unmount())
  wrappers.length = 0
  document.body.innerHTML = ''
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MobileDock', () => {
  describe('breakpoint claim', () => {
    test('claims its breakpoint prop on mount, observable via is_visible', async () => {
      const { is_visible } = useMobileDock()

      mountFill({}, { breakpoint: 'md' })
      setBelowBreakpoint('md', true)
      await nextTick()

      expect(is_visible.value).toBe(true)
    })

    test('defaults to DEFAULT_BREAKPOINT when no breakpoint prop is passed', async () => {
      const { is_visible } = useMobileDock()

      mountFill()
      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      await nextTick()

      expect(is_visible.value).toBe(true)
    })

    test('releases its claim on unmount, falling back to DEFAULT_BREAKPOINT', async () => {
      const { is_visible } = useMobileDock()
      const wrapper = mountFill({}, { breakpoint: 'md' })

      setBelowBreakpoint('md', true)
      await nextTick()
      expect(is_visible.value).toBe(true)

      wrapper.unmount()
      wrappers.splice(wrappers.indexOf(wrapper), 1)
      await nextTick()

      // Now only the default (xl) query decides visibility.
      setBelowBreakpoint('md', true)
      setBelowBreakpoint(DEFAULT_BREAKPOINT, false)
      await nextTick()
      expect(is_visible.value).toBe(false)

      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      await nextTick()
      expect(is_visible.value).toBe(true)
    })
  })

  describe('teleport', () => {
    test('slot content is teleported into [mobile-dock-content]', async () => {
      const SlottedContent = defineComponent({
        setup() {
          return () => h('span', { 'data-testid': 'dock-slot-content' }, 'hello')
        }
      })

      mountFill({ default: () => h(SlottedContent) })

      // Content lands in the teleport target, not in the wrapper tree.
      const el = document.querySelector('[data-testid="dock-slot-content"]')
      expect(el).not.toBeNull()
      expect(el.textContent).toBe('hello')
    })

    test('slot content is inside [mobile-dock-content] after teleport', async () => {
      mountFill({
        default: () => h('p', { 'data-testid': 'dock-paragraph' }, 'content')
      })

      const para = document.querySelector('[data-testid="dock-paragraph"]')
      expect(para).not.toBeNull()
      // Confirm it lives inside the dock content target, not the wrapper.
      expect(content_target.contains(para)).toBe(true)
    })
  })

  describe('above slot', () => {
    test('above slot content is teleported into [mobile-dock-above] when provided', () => {
      const AboveContent = defineComponent({
        setup() {
          return () => h('div', { 'data-testid': 'above-slot-content' }, 'above')
        }
      })

      mountFill({
        default: () => h('span', 'default'),
        above: () => h(AboveContent)
      })

      const el = document.querySelector('[data-testid="above-slot-content"]')
      expect(el).not.toBeNull()
      expect(above_target.contains(el)).toBe(true)
    })

    test('no above teleport is rendered when the above slot is not provided', () => {
      // Only provide the default slot — backward-compat with existing single-slot docks.
      mountFill({
        default: () => h('span', { 'data-testid': 'default-only' }, 'content')
      })

      // The above target should be empty — no content was teleported into it.
      expect(above_target.children.length).toBe(0)
    })
  })
})
