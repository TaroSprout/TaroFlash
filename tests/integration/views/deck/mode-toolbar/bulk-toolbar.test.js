import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn(),
  setSfxPolicy: vi.fn()
}))

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_p, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

const UiTagStub = defineComponent({
  name: 'UiTag',
  setup(_p, { slots }) {
    return () => h('span', { 'data-testid': 'ui-tag-stub' }, slots.default?.())
  }
})

const ToolbarBaseStub = defineComponent({
  name: 'toolbarBase',
  setup(_p, { slots, attrs }) {
    return () =>
      h('div', { 'data-testid': attrs['data-testid'] ?? 'toolbar-base-stub' }, [
        h('div', { 'data-testid': 'toolbar-left' }, slots.left?.()),
        h('div', { 'data-testid': 'toolbar-right' }, slots.right?.())
      ])
  }
})

const CardCountStub = defineComponent({
  name: 'CardCount',
  setup() {
    return () => h('div', { 'data-testid': 'card-count-stub' })
  }
})

import BulkToolbar from '@/views/deck/mode-toolbar/bulk-toolbar.vue'
import { cardEditorKey } from '@/composables/card/list-controller'

function makeEditor({
  selected_count = 0,
  card_count = 0,
  exitSelection = vi.fn(),
  onCancelSelection = vi.fn(() => exitSelection())
} = {}) {
  return {
    card_count: ref(card_count),
    selection: {
      selected_count: ref(selected_count),
      all_cards_selected: ref(false),
      select_all_mode: ref(false),
      toggleSelectAll: vi.fn(),
      exitSelection
    },
    actions: {
      onCancelSelection,
      onMoveCards: vi.fn(),
      onDeleteCards: vi.fn()
    }
  }
}

function mount(editor = makeEditor()) {
  return {
    wrapper: shallowMount(BulkToolbar, {
      global: {
        stubs: {
          UiButton: UiButtonStub,
          UiTag: UiTagStub,
          toolbarBase: ToolbarBaseStub,
          CardCount: CardCountStub
        },
        provide: { [cardEditorKey]: editor }
      }
    }),
    editor
  }
}

describe('mode-toolbar/bulk-toolbar', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('renders cancel button and count tag in the left slot', () => {
    const { wrapper } = mount()
    expect(wrapper.find('[data-testid="bulk-toolbar__cancel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bulk-toolbar__count"]').exists()).toBe(true)
  })

  test('count tag renders the current selected_count', () => {
    const { wrapper } = mount(makeEditor({ selected_count: 4 }))
    expect(wrapper.find('[data-testid="bulk-toolbar__count"]').text()).toContain('4')
  })

  test('renders the shared CardCount in the right slot [obligation]', () => {
    const { wrapper } = mount()
    expect(wrapper.find('[data-testid="card-count-stub"]').exists()).toBe(true)
  })

  test('clicking cancel calls onCancelSelection (which triggers exitSelection)', async () => {
    const { wrapper, editor } = mount()
    await wrapper.find('[data-testid="bulk-toolbar__cancel"]').trigger('click')
    expect(editor.actions.onCancelSelection).toHaveBeenCalledOnce()
  })
})
