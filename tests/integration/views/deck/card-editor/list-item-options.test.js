import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

vi.mock('@/utils/animations/button-tap', () => ({
  playButtonTap: vi.fn(),
  BUTTON_TAP_DURATION: 0.1
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// UiButton stub: forward attrs (including data-testid) onto the rendered button.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('button', attrs, slots.default?.())
  }
})

import ListItemOptions from '@/views/deck/card-editor/list-item-options.vue'

function mountOptions(props = {}) {
  return mount(ListItemOptions, {
    props,
    global: {
      stubs: { UiButton: UiButtonStub },
      directives: { sfx: {} }
    }
  })
}

describe('ListItemOptions', () => {
  // ── Event emissions ────────────────────────────────────────────────────────

  test('clicking the move button emits move', async () => {
    const wrapper = mountOptions()

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')

    expect(wrapper.emitted('move')).toHaveLength(1)
  })

  test('clicking the delete button emits delete', async () => {
    const wrapper = mountOptions()

    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('delete')).toHaveLength(1)
  })
})
