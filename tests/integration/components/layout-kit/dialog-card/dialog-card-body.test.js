import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import DialogCardBody from '@/components/layout-kit/dialog-card/dialog-card-body.vue'
import { dialogCardViewportKey } from '@/components/layout-kit/dialog-card/dialog-card-viewport'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountBody(props = {}, viewport = 'desktop') {
  return shallowMount(DialogCardBody, {
    props,
    slots: { default: () => h('div', { 'data-testid': 'body-content' }, 'content') },
    global: { provide: { [dialogCardViewportKey]: { value: viewport } } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DialogCardBody', () => {
  describe('scroll_target [obligation]', () => {
    test('owns the overflow itself (overflow-y-auto) when scroll_target is omitted', () => {
      const wrapper = mountBody()
      const content = wrapper.find('[data-testid="dialog-card-body__content"]')

      expect(content.classes()).toContain('overflow-y-auto')
      expect(content.classes()).toContain('scroll-hidden')
    })

    test('does not own the overflow when scroll_target is passed', () => {
      const wrapper = mountBody({ scroll_target: '#external' })
      const content = wrapper.find('[data-testid="dialog-card-body__content"]')

      expect(content.classes()).not.toContain('overflow-y-auto')
      expect(content.classes()).not.toContain('scroll-hidden')
    })

    test('points the scroll-bar target at scroll_target when provided', () => {
      const wrapper = mountBody({ scroll_target: '#external' })
      expect(wrapper.findComponent({ name: 'UiScrollBar' }).props('target')).toBe('#external')
    })

    test('points the scroll-bar target at its own content element when scroll_target is omitted', async () => {
      const wrapper = mountBody()
      await nextTick()
      const target = wrapper.findComponent({ name: 'UiScrollBar' }).props('target')

      expect(target).toBeTruthy()
      expect(typeof target).not.toBe('string')
    })
  })

  describe('overflow_bleed [obligation]', () => {
    test('adds no bleed classes by default [obligation]', () => {
      const wrapper = mountBody()
      const content = wrapper.find('[data-testid="dialog-card-body__content"]')

      expect(content.classes()).not.toContain('px-2.5')
      expect(content.classes()).not.toContain('-mx-2.5')
    })

    test('adds the horizontal bleed padding + negative margin when enabled [obligation]', () => {
      const wrapper = mountBody({ overflow_bleed: true })
      const content = wrapper.find('[data-testid="dialog-card-body__content"]')

      expect(content.classes()).toContain('px-2.5')
      expect(content.classes()).toContain('-mx-2.5')
    })
  })

  describe('scroll-bar visibility [obligation]', () => {
    test('renders the scroll-bar when the injected viewport is desktop', async () => {
      const wrapper = mountBody({}, 'desktop')
      await nextTick()
      expect(wrapper.findComponent({ name: 'UiScrollBar' }).exists()).toBe(true)
    })

    test('does not render the scroll-bar when the injected viewport is mobile', () => {
      const wrapper = mountBody({}, 'mobile')
      expect(wrapper.findComponent({ name: 'UiScrollBar' }).exists()).toBe(false)
    })
  })

  test('renders default slot content', () => {
    const wrapper = mountBody()
    expect(wrapper.find('[data-testid="body-content"]').exists()).toBe(true)
  })
})
