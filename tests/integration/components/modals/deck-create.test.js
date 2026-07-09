import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'

const { mockEditor, mockRouterPush, mockRandomCover, mockEmitSfx, capturedSettings } = vi.hoisted(
  () => ({
    mockEditor: {
      saveDeck: vi.fn().mockResolvedValue({ id: 99 })
    },
    mockRouterPush: vi.fn(),
    mockRandomCover: vi.fn(() => ({ theme: 'pink-400', pattern: 'wave', icon: 'book' })),
    mockEmitSfx: vi.fn(),
    capturedSettings: { current: null }
  })
)

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush })
}))

vi.mock('@/stores/notice-store', () => ({ useNoticeStore: () => mockNotice }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/utils/cover', async () => {
  const actual = await vi.importActual('@/utils/cover')
  return { ...actual, randomCoverConfig: mockRandomCover }
})

// useMatchMedia mock: exposes a shared ref and a setter so tests can control
// the mobile/desktop branch before mounting the component.
// 'coarse' queries always return false (fine/desktop pointer) so that
// usePlayOnTap inside UiButton passes clicks straight through without intercepting.
vi.mock('@/composables/ui/media-query', async () => {
  const { ref } = await import('vue')
  const isMobile = ref(false)
  const alwaysFalse = ref(false)
  return {
    useMatchMedia: vi.fn((query) => (query === 'coarse' ? alwaysFalse : isMobile)),
    __setMobile: (v) => {
      isMobile.value = v
    }
  }
})

vi.mock('@/composables/deck/editor', async () => {
  const { reactive } = await import('vue')
  return {
    useDeckEditor: vi.fn((deck) => {
      const settings = reactive({ title: '', description: '' })
      capturedSettings.current = settings
      return {
        settings,
        cover: reactive(deck?.cover_config ?? {}),
        card_attributes: reactive({ front: {}, back: {} }),
        saveDeck: (...args) => mockEditor.saveDeck(...args)
      }
    }),
    deckEditorKey: Symbol('deckEditor')
  }
})

vi.mock('@/components/deck/deck-design-preview.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'DeckPreview',
      props: ['cover'],
      setup(props) {
        return () =>
          h('div', {
            'data-testid': 'deck-preview-stub',
            'data-theme': props.cover?.theme ?? ''
          })
      }
    })
  }
})

vi.mock('@/views/deck/cover-designer/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'CoverDesigner',
      props: ['config'],
      setup() {
        return () => h('div', { 'data-testid': 'cover-designer-stub' })
      }
    })
  }
})

vi.mock('@/components/layout-kit/sheet/mobile-sheet.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'MobileSheet',
      emits: ['close'],
      setup(_p, { slots, emit }) {
        return () =>
          h('div', { 'data-testid': 'mobile-sheet-stub' }, [
            h('button', {
              'data-testid': 'mobile-sheet-stub__close',
              onClick: () => emit('close')
            }),
            slots['header-content']?.(),
            slots.overlay?.(),
            slots.default?.()
          ])
      }
    })
  }
})

vi.mock('@/components/card/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'Card',
      setup() {
        return () => h('div', { 'data-testid': 'card-stub' })
      }
    })
  }
})

vi.mock('@/components/ui-kit/icon.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'UiIcon',
      props: ['src'],
      setup() {
        return () => h('span', { 'data-testid': 'ui-icon-stub' })
      }
    })
  }
})

import DeckCreate from '@/views/deck/deck-create-modal.vue'
import { __setMobile } from '@/composables/ui/media-query'

function mountModal(close = vi.fn()) {
  const wrapper = mount(DeckCreate, {
    props: { close },
    global: { directives: { sfx: {} } }
  })
  return { wrapper, close }
}

describe('DeckCreate modal', () => {
  beforeEach(() => {
    mockEditor.saveDeck.mockReset()
    mockEditor.saveDeck.mockResolvedValue({ id: 99 })
    mockRouterPush.mockClear()
    mockRandomCover.mockClear()
    mockEmitSfx.mockClear()
    mockNotice.error.mockClear()
    __setMobile(false)
  })

  // ── Non-mobile layout ──────────────────────────────────────────────────────

  test('non-mobile: renders deck-create__aside with submit button (no cancel) [obligation]', () => {
    const { wrapper } = mountModal()

    expect(wrapper.find('[data-testid="deck-create__aside"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-create__aside-submit"]').exists()).toBe(true)
    // Cancel button is NOT present in the aside on non-mobile [obligation]
    expect(wrapper.find('[data-testid="deck-create__mobile-actions"]').exists()).toBe(false)
  })

  test('non-mobile: renders the floating preview in the overlay slot [obligation]', () => {
    const { wrapper } = mountModal()

    expect(wrapper.find('[data-testid="deck-create__pinned-preview"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-create__inline-preview"]').exists()).toBe(false)
  })

  test('non-mobile: does not render mobile-only sections [obligation]', () => {
    const { wrapper } = mountModal()

    expect(wrapper.find('[data-testid="deck-create__mobile-inputs"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="deck-create__mobile-actions"]').exists()).toBe(false)
  })

  test('non-mobile: renders the cover designer and body', () => {
    const { wrapper } = mountModal()

    expect(wrapper.find('[data-testid="deck-create__body"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cover-designer-stub"]').exists()).toBe(true)
  })

  test('seeds the editor cover with randomCoverConfig() values', () => {
    mountModal()
    expect(mockRandomCover).toHaveBeenCalledTimes(1)
  })

  // ── Mobile layout ──────────────────────────────────────────────────────────

  test('mobile: renders deck-create__inline-preview instead of floating preview [obligation]', async () => {
    __setMobile(true)
    const { wrapper } = mountModal()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="deck-create__inline-preview"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-create__pinned-preview"]').exists()).toBe(false)
  })

  test('mobile: renders deck-create__mobile-inputs and deck-create__mobile-actions [obligation]', async () => {
    __setMobile(true)
    const { wrapper } = mountModal()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="deck-create__mobile-inputs"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-create__mobile-actions"]').exists()).toBe(true)
  })

  test('mobile: does not render the aside [obligation]', async () => {
    __setMobile(true)
    const { wrapper } = mountModal()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="deck-create__aside"]').exists()).toBe(false)
  })

  test('mobile: cancel button in mobile-actions closes with false [obligation]', async () => {
    __setMobile(true)
    const { wrapper, close } = mountModal()
    await wrapper.vm.$nextTick()

    const mobileActions = wrapper.find('[data-testid="deck-create__mobile-actions"]')
    // UiButton renders with data-testid="ui-kit-button" on its inner button element
    const buttons = mobileActions.findAll('[data-testid="ui-kit-button"]')
    // First button in mobile-actions is the cancel button
    await buttons[0].trigger('click')

    expect(close).toHaveBeenCalledWith(false)
    expect(mockEditor.saveDeck).not.toHaveBeenCalled()
  })

  test('mobile: submit button in mobile-actions calls saveDeck', async () => {
    __setMobile(true)
    mockEditor.saveDeck.mockResolvedValueOnce({ id: 42 })
    const { wrapper, close } = mountModal()
    await wrapper.vm.$nextTick()

    capturedSettings.current.title = 'Mobile Deck'
    await wrapper.vm.$nextTick()

    const mobileActions = wrapper.find('[data-testid="deck-create__mobile-actions"]')
    // UiButton renders with data-testid="ui-kit-button" on its inner button element
    const buttons = mobileActions.findAll('[data-testid="ui-kit-button"]')
    // Second button in mobile-actions is the submit button
    await buttons[1].trigger('click')
    await flushPromises()

    expect(mockEditor.saveDeck).toHaveBeenCalled()
    expect(close).toHaveBeenCalledWith(true)
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deck', params: { id: 42 } })
  })

  // ── Close behaviour ────────────────────────────────────────────────────────

  test('mobile-sheet @close closes with false', async () => {
    const { wrapper, close } = mountModal()
    await wrapper.find('[data-testid="mobile-sheet-stub__close"]').trigger('click')

    expect(close).toHaveBeenCalledWith(false)
  })

  // ── Submit (non-mobile) ────────────────────────────────────────────────────

  test('submit calls saveDeck, then close(true), then routes to the new deck', async () => {
    mockEditor.saveDeck.mockResolvedValueOnce({ id: 7 })
    const { wrapper, close } = mountModal()

    capturedSettings.current.title = 'My Deck'
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')
    await flushPromises()

    expect(mockEditor.saveDeck).toHaveBeenCalled()
    expect(close).toHaveBeenCalledWith(true)
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deck', params: { id: 7 } })
  })

  test('submit does not close or route when saveDeck returns null', async () => {
    mockEditor.saveDeck.mockResolvedValueOnce(null)
    const { wrapper, close } = mountModal()

    capturedSettings.current.title = 'My Deck'
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')
    await flushPromises()

    expect(close).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  test('shows an error notice when saveDeck returns null [obligation]', async () => {
    mockEditor.saveDeck.mockResolvedValueOnce(null)
    const { wrapper } = mountModal()

    capturedSettings.current.title = 'My Deck'
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')
    await flushPromises()

    expect(mockNotice.error).toHaveBeenCalledWith("Couldn't save this deck. Please try again.")
  })

  // ── Title-required guard ───────────────────────────────────────────────────

  test('onSave with empty title plays woodblock sfx and does NOT call saveDeck [obligation]', async () => {
    const { wrapper, close } = mountModal()

    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')
    await flushPromises()

    expect(mockEditor.saveDeck).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
  })

  test('onSave with whitespace-only title treats it as empty and blocks save [obligation]', async () => {
    const { wrapper } = mountModal()

    capturedSettings.current.title = '   '
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')
    await flushPromises()

    expect(mockEditor.saveDeck).not.toHaveBeenCalled()
    expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
  })

  // ── Title-error watcher [obligation] ──────────────────────────────────────

  test('title error clears reactively via watcher when title changes [obligation]', async () => {
    const { wrapper } = mountModal()

    // Trigger the error first by submitting with empty title
    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')
    await flushPromises()
    expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')

    // Clear sfx mock so we can detect if the woodblock fires again
    mockEmitSfx.mockClear()

    // Reactively update the title — the watch() should clear the error
    capturedSettings.current.title = 'New Title'
    await wrapper.vm.$nextTick()

    // Now submitting should succeed (no woodblock sfx, saveDeck called)
    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')
    await flushPromises()

    expect(mockEmitSfx).not.toHaveBeenCalledWith('etc_woodblock_stuck')
    expect(mockEditor.saveDeck).toHaveBeenCalled()
  })

  // ── Locale title ───────────────────────────────────────────────────────────

  test('renders the modal title "Make A New Deck" (updated locale value) [obligation]', () => {
    const { wrapper } = mountModal()
    // The mobile-sheet stub renders the header-content slot; we find the h1
    const h1 = wrapper.find('h1')
    expect(h1.exists()).toBe(true)
    expect(h1.text()).toContain('Make A New Deck')
  })

  // ── Description binding (non-mobile aside + mobile inputs) ─────────────────

  test('non-mobile: aside renders inputs bound to editor settings', async () => {
    const { wrapper } = mountModal()

    capturedSettings.current.title = 'Deck Title'
    capturedSettings.current.description = 'A description'
    await wrapper.vm.$nextTick()

    // Aside inputs render (proxy for the v-model bindings being active)
    expect(wrapper.find('[data-testid="deck-create__aside-inputs"]').exists()).toBe(true)
  })

  test('mobile: mobile-inputs renders description input bound to editor settings', async () => {
    __setMobile(true)
    const { wrapper } = mountModal()
    await wrapper.vm.$nextTick()

    capturedSettings.current.description = 'Mobile description'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="deck-create__mobile-inputs"]').exists()).toBe(true)
  })

  test('non-mobile: typing into the aside title/description inputs writes back to editor.settings', async () => {
    const { wrapper } = mountModal()
    const aside_inputs = wrapper.find('[data-testid="deck-create__aside-inputs"]')

    await aside_inputs.find('input').setValue('Typed Title')
    await aside_inputs.find('textarea').setValue('Typed Description')

    expect(capturedSettings.current.title).toBe('Typed Title')
    expect(capturedSettings.current.description).toBe('Typed Description')
  })

  test('mobile: typing into the mobile title/description inputs writes back to editor.settings', async () => {
    __setMobile(true)
    const { wrapper } = mountModal()
    await wrapper.vm.$nextTick()

    const inputs = wrapper.find('[data-testid="deck-create__mobile-inputs"]').findAll('input')
    await inputs[0].setValue('Mobile Typed Title')
    await inputs[1].setValue('Mobile Typed Description')

    expect(capturedSettings.current.title).toBe('Mobile Typed Title')
    expect(capturedSettings.current.description).toBe('Mobile Typed Description')
  })
})
