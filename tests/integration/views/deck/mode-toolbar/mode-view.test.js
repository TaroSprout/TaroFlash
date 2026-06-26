import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

import ModeView from '@/views/deck/mode-toolbar/mode-view.vue'
import SearchBar from '@/views/deck/search-bar.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_p, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

// toolbar-base must render its named slots so the #left / #right content appears
const ToolbarBaseStub = defineComponent({
  name: 'toolbarBase',
  setup(_p, { slots }) {
    return () => h('div', null, [slots.left?.(), slots.right?.()])
  }
})

function makeEditor({ newCard = vi.fn() } = {}) {
  return { newCard }
}

function mount({ editor } = {}) {
  return shallowMount(ModeView, {
    global: {
      stubs: {
        UiButton: UiButtonStub,
        toolbarBase: ToolbarBaseStub,
        CardCount: true,
        PageSettings: true
      },
      provide: {
        [cardEditorKey]: editor ?? makeEditor()
      }
    }
  })
}

describe('mode-toolbar/mode-view', () => {
  test('renders the add-card button', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="mode-view__add-card-button"]').exists()).toBe(true)
  })

  // SearchBar replaced the old static search icon button in this PR.
  test('renders SearchBar in the toolbar left slot [obligation]', () => {
    const wrapper = mount()
    expect(wrapper.findComponent(SearchBar).exists()).toBe(true)
  })

  // The new-card orchestration (setMode → chime → addCardAtTop) lives in the
  // controller's `newCard`; mode-view only delegates to it.
  test('clicking new-card invokes the injected newCard action [obligation]', async () => {
    const newCard = vi.fn()
    const wrapper = mount({ editor: makeEditor({ newCard }) })
    await wrapper.find('[data-testid="mode-view__add-card-button"]').trigger('click')
    expect(newCard).toHaveBeenCalledOnce()
  })
})
