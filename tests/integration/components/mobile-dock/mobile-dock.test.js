import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useMobileDock } from '@/components/mobile-dock/use-mobile-dock'
import MobileDock from '@/components/mobile-dock/mobile-dock.vue'

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
  // Reset module-level singleton state between tests.
  const { el, breakpoint } = useMobileDock()
  el.value = null
  breakpoint.value = 'xl'

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
  describe('breakpoint prop [obligation]', () => {
    test('writes its breakpoint prop to the shared breakpoint ref onMounted [obligation]', async () => {
      const { breakpoint } = useMobileDock()
      expect(breakpoint.value).toBe('xl')

      mountFill({}, { breakpoint: 'md' })

      expect(breakpoint.value).toBe('md')
    })

    test('defaults to xl when no breakpoint prop is passed [obligation]', () => {
      const { breakpoint } = useMobileDock()
      breakpoint.value = 'md'

      mountFill()

      expect(breakpoint.value).toBe('xl')
    })
  })

  describe('teleport [obligation]', () => {
    test('slot content is teleported into [mobile-dock-content] [obligation]', async () => {
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

    test('slot content is inside [mobile-dock-content] after teleport [obligation]', async () => {
      mountFill({
        default: () => h('p', { 'data-testid': 'dock-paragraph' }, 'content')
      })

      const para = document.querySelector('[data-testid="dock-paragraph"]')
      expect(para).not.toBeNull()
      // Confirm it lives inside the dock content target, not the wrapper.
      expect(content_target.contains(para)).toBe(true)
    })
  })

  describe('above slot [obligation]', () => {
    test('above slot content is teleported into [mobile-dock-above] when provided [obligation]', () => {
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

    test('no above teleport is rendered when the above slot is not provided [obligation]', () => {
      // Only provide the default slot — backward-compat with existing single-slot docks.
      mountFill({
        default: () => h('span', { 'data-testid': 'default-only' }, 'content')
      })

      // The above target should be empty — no content was teleported into it.
      expect(above_target.children.length).toBe(0)
    })
  })
})
