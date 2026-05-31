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

// UiButton stub: forward attrs (including disabled and data-testid) onto the
// rendered button so we can query by testid and inspect the disabled DOM property.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('button', attrs, slots.default?.())
  }
})

// UiTooltip stub: forward attrs onto a button element (UiButton uses element="button").
const UiTooltipStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  props: ['element', 'text', 'suppress', 'gap'],
  setup(props, { slots, attrs }) {
    const tag = props.element ?? 'div'
    return () => h(tag, attrs, slots.default?.())
  }
})

import ListItemOptions from '@/views/deck/card-editor/list-item-options.vue'

function mountOptions(props = {}) {
  return mount(ListItemOptions, {
    props,
    global: {
      stubs: { UiButton: UiButtonStub, UiTooltip: UiTooltipStub },
      directives: { sfx: {} }
    }
  })
}

describe('ListItemOptions', () => {
  // ── Event emissions ────────────────────────────────────────────────────────

  test('clicking the upload-image button emits upload-image', async () => {
    const wrapper = mountOptions()

    await wrapper.find('[data-testid="list-item-options__upload-image"]').trigger('click')

    expect(wrapper.emitted('upload-image')).toHaveLength(1)
  })

  test('clicking the move button emits move', async () => {
    const wrapper = mountOptions()

    // The move button has no data-testid — find it as the second button.
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('move')).toHaveLength(1)
  })

  test('clicking the delete button emits delete', async () => {
    const wrapper = mountOptions()

    const buttons = wrapper.findAll('button')
    await buttons[2].trigger('click')

    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  // ── upload_disabled prop ───────────────────────────────────────────────────

  test('upload button is not disabled when upload_disabled is false (default)', () => {
    const wrapper = mountOptions()

    expect(wrapper.find('[data-testid="list-item-options__upload-image"]').element.disabled).toBe(
      false
    )
  })

  test('upload button is disabled when upload_disabled is true', () => {
    const wrapper = mountOptions({ upload_disabled: true })

    expect(wrapper.find('[data-testid="list-item-options__upload-image"]').element.disabled).toBe(
      true
    )
  })

  test('upload button disabled does not prevent move or delete emits', async () => {
    const wrapper = mountOptions({ upload_disabled: true })

    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')

    expect(wrapper.emitted('move')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })
})
