import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import DialogCardBody from '@/components/layout-kit/dialog-card/dialog-card-body.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const mounted = []

afterEach(() => {
  while (mounted.length > 0) mounted.pop().unmount()
})

function mountBody(props = {}) {
  const wrapper = mount(DialogCardBody, {
    props,
    attachTo: document.body,
    slots: { default: () => h('div', { 'data-testid': 'body-content' }, 'content') }
  })
  mounted.push(wrapper)
  return wrapper
}

function root(wrapper) {
  return wrapper.find('[data-testid="dialog-card-body"]')
}

function scroller(wrapper) {
  return wrapper.find('[data-testid="scroll-region__scroller"]')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DialogCardBody', () => {
  describe('always self-scrolls and forwards bleed onto the region', () => {
    test('the body always self-scrolls — no scroll_target prop exists to override it', () => {
      const wrapper = mountBody()
      expect(root(wrapper).attributes('data-scroll')).toBe('self')
    })

    test('carries no data-overflow-bleed attribute on the region root by default', () => {
      const wrapper = mountBody()
      expect(root(wrapper).attributes('data-overflow-bleed')).toBeUndefined()
    })

    test('sets data-overflow-bleed on the region root when enabled', () => {
      const wrapper = mountBody({ overflow_bleed: true })
      expect(root(wrapper).attributes('data-overflow-bleed')).toBe('true')
    })

    test('forwards overflow_bleed onto the scroller class (bleed padding)', () => {
      const wrapper = mountBody({ overflow_bleed: true })
      expect(scroller(wrapper).classes()).toContain('px-2.5')
      expect(scroller(wrapper).classes()).toContain('-mx-2.5')
    })

    test('omits the bleed padding classes on the scroller by default', () => {
      const wrapper = mountBody()
      expect(scroller(wrapper).classes()).not.toContain('px-2.5')
    })
  })

  test('the scroller carries the bottom-padding class regardless of bleed', () => {
    const wrapper = mountBody()
    expect(scroller(wrapper).classes()).toContain('pb-(--dialog-body-pb,var(--dialog-px))')
  })

  test('renders default slot content inside the scroller', () => {
    const wrapper = mountBody()
    expect(scroller(wrapper).find('[data-testid="body-content"]').exists()).toBe(true)
  })

  // Regression guard: scroll must stay internal to the body — never handed off
  // to the overlay-surface via a `--scroll-overflow` override. Asserts the
  // scroller's real computed overflow, not the reverted class string, so any
  // future spelling of the same hand-off is caught too.

  test('the scroller keeps its own overflow-y: auto — never handed off via --scroll-overflow', () => {
    const wrapper = mountBody()
    expect(getComputedStyle(scroller(wrapper).element).overflowY).toBe('auto')
  })
})
