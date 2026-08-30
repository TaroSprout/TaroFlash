import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import DialogCardBody from '@/components/layout-kit/dialog-card/dialog-card-body.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountBody(props = {}) {
  return mount(DialogCardBody, {
    props,
    slots: { default: () => h('div', { 'data-testid': 'body-content' }, 'content') }
  })
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
})
