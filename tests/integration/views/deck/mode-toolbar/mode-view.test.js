import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { emitSfxMock } = vi.hoisted(() => ({ emitSfxMock: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock, emitHoverSfx: vi.fn() }))

import ModeView from '@/views/deck/mode-toolbar/mode-view.vue'
import { cardEditorKey } from '@/composables/card-editor/card-list-controller'
import { deckViewShellKey } from '@/composables/card-editor/deck-view-shell'

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('click') }, slots.default?.())
  }
})

// toolbar-base must render its named slots so the #left / #right content appears
const ToolbarBaseStub = defineComponent({
  name: 'toolbarBase',
  setup(_p, { slots }) {
    return () => h('div', null, [slots.left?.(), slots.right?.()])
  }
})

function makeShell({ setMode = vi.fn().mockResolvedValue(undefined) } = {}) {
  return { setMode }
}

function makeEditor({ addCardAtTop = vi.fn() } = {}) {
  return { addCardAtTop }
}

function mount({ shell, editor } = {}) {
  return shallowMount(ModeView, {
    global: {
      stubs: {
        UiButton: UiButtonStub,
        toolbarBase: ToolbarBaseStub,
        CardCount: true,
        PageSettings: true
      },
      provide: {
        [deckViewShellKey]: shell ?? makeShell(),
        [cardEditorKey]: editor ?? makeEditor()
      }
    }
  })
}

describe('mode-toolbar/mode-view', () => {
  beforeEach(() => {
    emitSfxMock.mockReset()
  })

  test('renders the add-card button', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="mode-view__add-card-button"]').exists()).toBe(true)
  })

  // ── onNewCard — obligation: setMode → emitSfx blocking → addCardAtTop ────

  test('clicking new-card calls shell.setMode("edit") [obligation]', async () => {
    const setMode = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount({ shell: makeShell({ setMode }) })
    await wrapper.find('[data-testid="mode-view__add-card-button"]').trigger('click')
    expect(setMode).toHaveBeenCalledWith('edit')
  })

  test('addCardAtTop is called after setMode resolves [obligation]', async () => {
    const addCardAtTop = vi.fn()
    let resolveSetMode
    const setMode = vi.fn().mockReturnValue(new Promise((r) => (resolveSetMode = r)))
    const wrapper = mount({ shell: makeShell({ setMode }), editor: makeEditor({ addCardAtTop }) })

    await wrapper.find('[data-testid="mode-view__add-card-button"]').trigger('click')
    // setMode hasn't resolved yet — addCardAtTop must not have been called
    expect(addCardAtTop).not.toHaveBeenCalled()

    resolveSetMode()
    await Promise.resolve()
    await Promise.resolve()
    expect(addCardAtTop).toHaveBeenCalledOnce()
  })

  test('emits ui.snappy_button_2 with blocking=true between setMode and addCardAtTop [obligation]', async () => {
    const addCardAtTop = vi.fn()
    const setMode = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount({ shell: makeShell({ setMode }), editor: makeEditor({ addCardAtTop }) })

    await wrapper.find('[data-testid="mode-view__add-card-button"]').trigger('click')
    await Promise.resolve()

    expect(emitSfxMock).toHaveBeenCalledWith('ui.snappy_button_2', { blocking: true })
    expect(addCardAtTop).toHaveBeenCalledOnce()
    // Chime must be emitted before addCardAtTop
    const sfx_call_order = emitSfxMock.mock.invocationCallOrder[0]
    const add_call_order = addCardAtTop.mock.invocationCallOrder[0]
    expect(sfx_call_order).toBeLessThan(add_call_order)
  })
})
