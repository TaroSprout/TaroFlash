import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { h } from 'vue'

// ── Stubs ──────────────────────────────────────────────────────────────────────

// Stub UiButton: render with $attrs forwarded so we can inspect props passed to it.
const UiButtonStub = {
  name: 'UiButton',
  inheritAttrs: false,
  props: ['iconLeft', 'iconOnly', 'roundedFull', 'size', 'sfx'],
  emits: ['click'],
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          'data-testid': 'ui-button-stub',
          'data-icon-left': props.iconLeft,
          onClick: () => emit('click')
        },
        slots.default?.()
      )
  }
}

// ── Component import (after stubs) ────────────────────────────────────────────

import ResumeFollowButton from '@/views/audio-reader/lesson/resume-follow-button.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountButton(props = {}) {
  return shallowMount(ResumeFollowButton, {
    props: { direction: 'down', ...props },
    global: {
      stubs: { UiButton: UiButtonStub },
      mocks: { $t: (key) => key }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ResumeFollowButton', () => {
  describe('icon selection [obligation]', () => {
    test('direction "up" renders arcade-stick-up icon [obligation]', () => {
      const wrapper = mountButton({ direction: 'up' })

      const btn = wrapper.findComponent(UiButtonStub)
      expect(btn.props('iconLeft')).toBe('arcade-stick-up')
    })

    test('direction "down" renders arcade-stick-down icon [obligation]', () => {
      const wrapper = mountButton({ direction: 'down' })

      const btn = wrapper.findComponent(UiButtonStub)
      expect(btn.props('iconLeft')).toBe('arcade-stick-down')
    })
  })

  describe('resume emit [obligation]', () => {
    test('emits "resume" when the button is clicked [obligation]', async () => {
      const wrapper = mountButton()

      await wrapper.findComponent(UiButtonStub).trigger('click')

      expect(wrapper.emitted('resume')).toBeTruthy()
      expect(wrapper.emitted('resume')).toHaveLength(1)
    })
  })

  describe('click feedback [obligation]', () => {
    test('plays the snappy_button_5 sfx on click [obligation]', () => {
      const wrapper = mountButton()

      expect(wrapper.findComponent(UiButtonStub).props('sfx')).toEqual({
        press: 'ui.snappy_button_5'
      })
    })
  })
})
