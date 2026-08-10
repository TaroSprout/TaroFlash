import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import ModeImport from '@/views/deck/mode-toolbar/mode-import.vue'
import { cardImportKey } from '@/views/deck/composables/card-import'

// The auto-stub for toolbar-base swallows its named slots — render them so
// the left/right button and select assertions below can find their content.
const ToolbarBaseStub = defineComponent({
  name: 'ToolbarBase',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('div', attrs, [slots.left?.(), slots.right?.()])
  }
})

function makeDraft(overrides = {}) {
  return {
    close: vi.fn(),
    dismiss: vi.fn(),
    has_cards: ref(false),
    layout: ref('grid'),
    setLayout: vi.fn(),
    ...overrides
  }
}

function mount(draft = makeDraft()) {
  return shallowMount(ModeImport, {
    global: {
      provide: { [cardImportKey]: draft },
      stubs: { ToolbarBase: ToolbarBaseStub },
      renderStubDefaultSlot: true
    }
  })
}

function findButton(wrapper, testid) {
  return wrapper
    .findAllComponents({ name: 'UiButton' })
    .find((c) => c.attributes('data-testid') === testid)
}

describe('mode-toolbar/mode-import', () => {
  test('clicking close calls draft.dismiss, not draft.close [obligation]', async () => {
    const draft = makeDraft()
    const wrapper = mount(draft)
    await findButton(wrapper, 'mode-import__close-button').vm.$emit('press')
    expect(draft.dismiss).toHaveBeenCalledOnce()
    expect(draft.close).not.toHaveBeenCalled()
  })

  test('the layout select is disabled while there are no cards', () => {
    const wrapper = mount(makeDraft({ has_cards: ref(false) }))
    // `disabled` isn't a declared prop on UiSelectMenu, so it lands as a
    // fallthrough attribute on the stub rather than a component prop.
    expect(wrapper.findComponent({ name: 'UiSelectMenu' }).attributes('disabled')).toBe('true')
  })

  test('the layout select is enabled once cards are loaded', () => {
    const wrapper = mount(makeDraft({ has_cards: ref(true) }))
    expect(wrapper.findComponent({ name: 'UiSelectMenu' }).attributes('disabled')).toBe('false')
  })

  test('changing the layout select calls draft.setLayout', async () => {
    const draft = makeDraft({ has_cards: ref(true) })
    const wrapper = mount(draft)
    await wrapper.findComponent({ name: 'UiSelectMenu' }).vm.$emit('update:model-value', 'list')
    expect(draft.setLayout).toHaveBeenCalledWith('list')
  })
})
