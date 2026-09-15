import '@/styles/main.css'

import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import OverlaySurface from '@/components/overlay/overlay-surface/index.vue'
import { makeOverlayContext, OVERLAY_CONTEXT_KEY } from '@tests/fixtures/overlay'

function mountSurface(props = {}, { attach = false } = {}) {
  return shallowMount(OverlaySurface, {
    props,
    ...(attach ? { attachTo: document.body } : {}),
    global: {
      provide: { [OVERLAY_CONTEXT_KEY]: makeOverlayContext() }
    }
  })
}

describe('OverlaySurface', () => {
  // ── full_bleed opts a surface out of the top gutter ────────────
  // Default keeps the downgraded top gutter (dialog windows, popups); a
  // full-bleed caller (dialog-card) drops it so content reaches the
  // viewport's top edge once downgraded.

  describe('full_bleed', () => {
    test('defaults to false — keeps the overlay-downgrade top-gutter padding once downgraded', () => {
      const wrapper = mountSurface({ sheet_at: 'w<2xl' }, { attach: true })
      expect(getComputedStyle(wrapper.element).paddingTop).toBe('16px')
      wrapper.unmount()
    })

    test('true drops the overlay-downgrade top-gutter padding once downgraded', () => {
      const wrapper = mountSurface({ full_bleed: true, sheet_at: 'w<2xl' }, { attach: true })
      expect(getComputedStyle(wrapper.element).paddingTop).toBe('0px')
      wrapper.unmount()
    })

    test('false explicitly keeps the top-gutter padding, same as the default', () => {
      const wrapper = mountSurface({ full_bleed: false, sheet_at: 'w<2xl' }, { attach: true })
      expect(getComputedStyle(wrapper.element).paddingTop).toBe('16px')
      wrapper.unmount()
    })
  })

  // ── backdrop dismiss ───────────────────────────────────────────

  test('a self click routes through the overlay context dismiss', async () => {
    const dismiss = vi.fn()
    const wrapper = shallowMount(OverlaySurface, {
      global: { provide: { [OVERLAY_CONTEXT_KEY]: makeOverlayContext({ dismiss }) } }
    })
    await wrapper.trigger('click')
    expect(dismiss).toHaveBeenCalledTimes(1)
  })
})
