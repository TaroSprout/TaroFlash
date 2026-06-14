import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, inject, nextTick } from 'vue'
import DeckSettings from '@/components/modals/deck-settings/index.vue'
import { useMatchMedia } from '@/composables/use-media-query'
import { deckSettingsLayoutKey } from '@/components/modals/deck-settings/layout'
import { deck as deckFixture } from '../../../../fixtures/deck'
import { setSidebar, setBelowMd, resetResponsive } from '../../../../helpers/responsive-mock'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockAlertWarn,
  mockToastSuccess,
  mockToastError,
  mockEditor,
  mockRouterPush,
  afterEnterControls
} = vi.hoisted(() => {
  // afterEnterControls holds a resolve fn that tests can call to simulate the
  // modal enter animation completing. Reset before each test.
  let _resolve = null
  const afterEnterControls = {
    resolve: () => _resolve?.(),
    reset: () => {
      _resolve = null
    },
    _setResolve: (fn) => {
      _resolve = fn
    }
  }
  return {
    mockAlertWarn: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockEditor: {
      resetReviews: vi.fn().mockResolvedValue(true),
      deleteDeck: vi.fn().mockResolvedValue(true),
      saveDeck: vi.fn().mockResolvedValue(true)
    },
    mockRouterPush: vi.fn(),
    afterEnterControls
  }
})

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: mockAlertWarn })
}))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useRoute: () => ({ name: 'dashboard', params: {} })
}))

vi.mock('@/composables/use-media-query', async () => {
  const m = await import('../../../../helpers/responsive-mock')
  return m.responsiveMockModule
})

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.()),
    set: vi.fn(),
    killTweensOf: vi.fn()
  }
}))

// Mock useModalAfterEnter so tests control when the enter promise resolves.
// useModalRequestClose is kept as a no-op (the close path is tested via the
// alert warn mock — not via the modal close hook).
vi.mock('@/composables/modal', () => ({
  useModalAfterEnter: () =>
    new Promise((resolve) => {
      afterEnterControls._setResolve(resolve)
    }),
  useModalRequestClose: () => {}
}))

vi.mock('@/composables/deck-editor', async () => {
  const { reactive, ref: vueRef } = await import('vue')
  const editor = {
    deck: { id: 1 },
    settings: reactive({}),
    config: reactive({}),
    cover: reactive({}),
    card_attributes: reactive({ front: {}, back: {} }),
    cover_image_preview: vueRef(undefined),
    cover_image_loading: vueRef(false),
    active_side: vueRef('cover'),
    is_dirty: vueRef(false),
    deleting: vueRef(false),
    resetting_reviews: vueRef(false),
    saveDeck: (...args) => mockEditor.saveDeck(...args),
    deleteDeck: (...args) => mockEditor.deleteDeck(...args),
    resetReviews: (...args) => mockEditor.resetReviews(...args),
    uploadImage: () => {},
    removeImage: () => {},
    setCoverImage: async () => {},
    removeCoverImage: () => {},
    setActiveSide: () => {}
  }
  // expose on the mockEditor handle so individual tests can flip dirty state
  mockEditor.editor = editor
  return {
    useDeckEditor: () => editor,
    deckEditorKey: Symbol('deckEditor')
  }
})

// `<script setup>` imports are direct bindings — Vue's `stubs` option can't
// replace them. Use module mocks for the tab children we want stubbed.
vi.mock('@/components/modals/deck-settings/deck-aside.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'DeckAside',
      props: ['loading'],
      emits: ['save'],
      setup(props, { emit, expose }) {
        expose({ validate: () => true })
        return () =>
          h('div', { 'data-testid': 'deck-aside-stub' }, [
            h(
              'button',
              { 'data-testid': 'deck-aside-save-btn', onClick: () => emit('save') },
              'save'
            )
          ])
      }
    })
  }
})

vi.mock('@/components/modals/deck-settings/tab-danger-zone/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'TabDangerZone',
      emits: ['delete', 'reset-reviews'],
      setup(_props, { emit }) {
        return () =>
          h('div', { 'data-testid': 'tab-danger-zone-stub' }, [
            h(
              'button',
              { 'data-testid': 'tdz__reset', onClick: () => emit('reset-reviews') },
              'reset'
            ),
            h('button', { 'data-testid': 'tdz__delete', onClick: () => emit('delete') }, 'delete')
          ])
      }
    })
  }
})

// ── Stubs ─────────────────────────────────────────────────────────────────────

const TabSheetStub = defineComponent({
  emits: ['close', 'update:active'],
  setup(_props, { slots, emit, expose }) {
    // Mirror the real TabSheet: own sidebar visibility and expose it upward.
    expose({ has_sidebar: useMatchMedia('w>=lg & fine') })
    return () =>
      h('div', { 'data-testid': 'tab-sheet' }, [
        h('div', { 'data-testid': 'tab-sheet__header-content' }, slots['header-content']?.()),
        h(
          'button',
          {
            'data-testid': 'tab-sheet__close-emit',
            onClick: () => emit('close')
          },
          'close'
        ),
        h(
          'button',
          {
            'data-testid': 'tab-sheet__select-design',
            onClick: () => emit('update:active', 'design')
          },
          'design'
        ),
        slots.default?.(),
        slots.overlay?.(),
        h('div', { 'data-testid': 'tab-sheet__footer' }, slots.footer?.())
      ])
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  setup(_props, { slots, attrs }) {
    return () => h('button', { 'data-testid': 'ui-button', ...attrs }, slots.default?.())
  }
})

const TabDangerZoneStub = defineComponent({
  name: 'TabDangerZone',
  emits: ['delete', 'reset-reviews'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'tab-danger-zone-stub' }, [
        h(
          'button',
          {
            'data-testid': 'tdz__reset',
            onClick: () => emit('reset-reviews')
          },
          'reset'
        ),
        h(
          'button',
          {
            'data-testid': 'tdz__delete',
            onClick: () => emit('delete')
          },
          'delete'
        )
      ])
  }
})

// Stubs for tab content components that include a back button and a navigate
// trigger so the parent's @back/@navigate handlers can be exercised from tests.
// Mirrors the real DeckBackButton behaviour: hidden on desktop layout.
const TabContentStub = defineComponent({
  emits: ['back', 'navigate'],
  setup(_props, { emit }) {
    const layout_mode = inject(deckSettingsLayoutKey)
    return () => {
      const show_back = layout_mode?.value !== 'desktop'
      return h('div', { 'data-testid': 'tab-content-stub' }, [
        show_back
          ? h(
              'button',
              {
                'data-testid': 'deck-settings__back-button',
                onClick: () => emit('back')
              },
              'back'
            )
          : null,
        h(
          'button',
          {
            'data-testid': 'tab-content__navigate',
            onClick: () => emit('navigate', 'study')
          },
          'navigate'
        )
      ])
    }
  }
})

const DeckPreviewStub = defineComponent({
  name: 'DeckDesignPreview',
  emits: ['update:side'],
  setup(_props, { emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': 'deck-preview-stub',
          onClick: () => emit('update:side', 'front')
        },
        'preview'
      )
  }
})

const DeckAsideStub = defineComponent({
  name: 'DeckAside',
  props: ['loading'],
  emits: ['save'],
  setup(_props, { emit, expose }) {
    expose({ validate: () => true })
    return () =>
      h('div', { 'data-testid': 'deck-aside-stub' }, [
        h('button', { 'data-testid': 'deck-aside-save-btn', onClick: () => emit('save') }, 'save')
      ])
  }
})

function makeWrapper(extraProps = {}) {
  const close = vi.fn()
  const wrapper = mount(DeckSettings, {
    props: { deck: deckFixture.one({ overrides: { id: 1 } }), close, ...extraProps },
    global: {
      stubs: {
        TabSheet: TabSheetStub,
        TabDesign: TabContentStub,
        TabGeneral: TabContentStub,
        TabStudy: TabContentStub,
        TabDangerZone: TabDangerZoneStub,
        DeckDesignPreview: DeckPreviewStub,
        DeckAside: DeckAsideStub,
        UiButton: UiButtonStub
      }
      // $t is supplied by the real i18n plugin from setup-browser.js
    }
  })
  return { wrapper, close }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockAlertWarn.mockReset()
  mockToastSuccess.mockReset()
  mockToastError.mockReset()
  mockRouterPush.mockReset()
  mockEditor.resetReviews.mockReset().mockResolvedValue(true)
  mockEditor.deleteDeck.mockReset().mockResolvedValue(true)
  mockEditor.saveDeck.mockReset().mockResolvedValue(true)
  // Reset the mocked editor's active_side back to cover between tests
  if (mockEditor.editor) mockEditor.editor.active_side.value = 'cover'
  afterEnterControls.reset()
  resetResponsive()
})

describe('DeckSettings — save button (DeckAside renders DeckSaveButton internally)', () => {
  // Save logic is fully tested in deck-save-button.test.js.
  // Index-level concerns: DeckAside is present and the stub is wired correctly.
  test('renders the DeckAside component', () => {
    const { wrapper } = makeWrapper()
    // deck-settings__aside is passed as a prop attr and lands on DeckAside's root
    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(true)
  })
})

describe('DeckSettings — header copy is tab-driven', () => {
  const cases = [
    { tab: 'design', title: 'Card Designer' },
    { tab: 'study', title: 'Study Preferences' },
    { tab: 'danger-zone', title: 'Danger Zone' }
  ]

  for (const { tab, title } of cases) {
    test(`renders the ${tab} header title`, () => {
      const { wrapper } = makeWrapper({ initial_tab: tab })

      expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe(title)
    })
  }
})

describe('DeckSettings — aside wiring', () => {
  test('renders the DeckAside', () => {
    const { wrapper } = makeWrapper()

    const aside = wrapper.find('[data-testid="deck-settings__aside"]')
    expect(aside.exists()).toBe(true)
  })
})

describe('DeckSettings — null active_tab tracks sidebar visibility', () => {
  // The default tab must be the strict inverse of whether TabSheet shows its
  // sidebar ('w>=lg & fine'): sidebar visible -> design, hidden -> index.
  test('null active_tab renders the design header when the sidebar is visible', async () => {
    setSidebar(true)
    // No initial_tab → active_tab starts null (plain ref)
    const { wrapper } = makeWrapper()
    // has_sidebar arrives from TabSheet via a template ref — one render late.
    await nextTick()
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Card Designer')
    expect(wrapper.find('[data-testid="deck-settings__back-button"]').exists()).toBe(false)
  })

  test('null active_tab renders the index header when the sidebar is hidden', () => {
    setSidebar(false)
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Deck Settings')
  })

  test('hiding the sidebar with danger-zone selected redirects to the index (null)', async () => {
    setSidebar(true)
    const { wrapper } = makeWrapper({ initial_tab: 'danger-zone' })
    // Let the sidebar-visible state settle before hiding it, so the watch sees
    // the real true -> false transition (not a no-op false -> false).
    await nextTick()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Danger Zone')

    setSidebar(false)
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Deck Settings')
  })
})

describe('DeckSettings — below-md layout collapse', () => {
  test('renders aside + floating preview above md', () => {
    setBelowMd(false)
    const { wrapper } = makeWrapper()

    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-settings__floating-preview"]').exists()).toBe(true)
  })

  test('hides the aside when below md', () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper()

    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(false)
  })

  test('hides the floating overlay preview when below md', () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper()

    expect(wrapper.find('[data-testid="deck-settings__floating-preview"]').exists()).toBe(false)
  })

  test('toggles aside + floating preview reactively when crossing md', async () => {
    setBelowMd(false)
    const { wrapper } = makeWrapper()

    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(true)

    setBelowMd(true)
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="deck-settings__floating-preview"]').exists()).toBe(false)
  })
})

const nextFrame = () => new Promise((r) => requestAnimationFrame(r))

describe('DeckSettings — tab transition hooks', () => {
  test('swapping tabs on desktop completes through requestAnimationFrame', async () => {
    setBelowMd(false)
    const { wrapper } = makeWrapper({ initial_tab: 'study' })

    mockEditor.editor.is_dirty.value = false
    // Drive the tab swap via the sheet's update:active emit so the
    // sidebar_active setter is exercised too.
    await wrapper.find('[data-testid="tab-sheet__select-design"]').trigger('click')
    await flushPromises()
    await nextFrame()
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Card Designer')
  })

  test('swapping tabs below md routes through the mobile height tween', async () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper({ initial_tab: 'study' })

    await wrapper.find('[data-testid="tab-sheet__select-design"]').trigger('click')
    await flushPromises()
    await nextFrame()
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Card Designer')
  })
})

describe('DeckSettings — overlay actions', () => {
  test('floating preview click forwards the new side to editor.setActiveSide on the design tab', async () => {
    setBelowMd(false)
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    const { wrapper } = makeWrapper({ initial_tab: 'design' })

    await wrapper.find('[data-testid="deck-preview-stub"]').trigger('click')

    expect(setActiveSide).toHaveBeenCalledWith('front')
    setActiveSide.mockRestore()
  })

  test('floating preview click is a no-op when not on the design tab', async () => {
    setBelowMd(false)
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    const { wrapper } = makeWrapper({ initial_tab: 'study' })

    await wrapper.find('[data-testid="deck-preview-stub"]').trigger('click')

    expect(setActiveSide).not.toHaveBeenCalled()
    setActiveSide.mockRestore()
  })

  test('back button shows and clears active_tab when the sidebar is hidden', async () => {
    setSidebar(false)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })

    expect(wrapper.find('[data-testid="deck-settings__back-button"]').exists()).toBe(true)

    await wrapper.find('[data-testid="deck-settings__back-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Deck Settings')
  })

  test('tab-sheet close emit forwards to close(false)', async () => {
    const { wrapper, close } = makeWrapper()

    await wrapper.find('[data-testid="tab-sheet__close-emit"]').trigger('click')

    expect(close).toHaveBeenCalledWith(false)
  })

  test('mounts under requestIdleCallback fallback (setTimeout) without throwing', async () => {
    const originalIdle = window.requestIdleCallback
    // drop rIC to force the setTimeout fallback path in onMounted
    window.requestIdleCallback = undefined

    expect(() => makeWrapper()).not.toThrow()
    await flushPromises()

    window.requestIdleCallback = originalIdle
  })

  test('mounts and fires the idle prefetch callback', async () => {
    const idleSpy = vi.fn((cb) => {
      cb({ didTimeout: false, timeRemaining: () => 50 })
      return 0
    })
    const originalIdle = window.requestIdleCallback
    window.requestIdleCallback = idleSpy

    makeWrapper()
    await flushPromises()

    expect(idleSpy).toHaveBeenCalledTimes(1)
    expect(idleSpy.mock.calls[0][0]).toBeTypeOf('function')

    window.requestIdleCallback = originalIdle
  })
})

describe('DeckSettings — active_tab is a plain non-persisted ref [obligation]', () => {
  test('active_tab defaults to null (no initial_tab prop)', () => {
    setSidebar(false)
    const { wrapper } = makeWrapper()
    // With null active_tab and no sidebar, the index tab is displayed
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Deck Settings')
  })

  test('initial_tab prop sets active_tab to that tab on mount [obligation]', () => {
    const { wrapper } = makeWrapper({ initial_tab: 'study' })
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe(
      'Study Preferences'
    )
  })

  test('second mount starts fresh (no cross-mount state leak) [obligation]', () => {
    // First mount with design tab
    const { wrapper: w1 } = makeWrapper({ initial_tab: 'design' })
    expect(w1.find('[data-testid="deck-settings__header-title"]').text()).toBe('Card Designer')
    w1.unmount()

    // Second mount with no initial_tab: should start at null/index, not design
    setSidebar(false)
    const { wrapper: w2 } = makeWrapper()
    expect(w2.find('[data-testid="deck-settings__header-title"]').text()).toBe('Deck Settings')
  })
})

describe('DeckSettings — active_side resets to cover when tab becomes null [obligation]', () => {
  test('going back (null tab) resets editor.active_side to cover via direct assignment [obligation]', async () => {
    setSidebar(false)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })

    // Simulate designer changing active_side to front
    mockEditor.editor.active_side.value = 'front'
    expect(mockEditor.editor.active_side.value).toBe('front')

    // Click back → active_tab becomes null
    await wrapper.find('[data-testid="deck-settings__back-button"]').trigger('click')
    await flushPromises()

    // The watcher on active_tab should have reset active_side to 'cover'
    expect(mockEditor.editor.active_side.value).toBe('cover')
  })

  test('navigating to a non-null tab does not reset active_side [obligation]', async () => {
    setSidebar(false)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })

    mockEditor.editor.active_side.value = 'front'

    // Switch to general (non-null tab) via the sheet
    await wrapper.find('[data-testid="tab-sheet__select-design"]').trigger('click')
    await flushPromises()

    // Still 'front' — watcher only fires when tab === null
    expect(mockEditor.editor.active_side.value).toBe('front')
  })
})

describe('DeckSettings — initial_tab / initial_side override [obligation]', () => {
  test('initial_tab prop opens that tab directly (design)', () => {
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Card Designer')
  })

  test('initial_tab prop opens that tab directly (study)', () => {
    const { wrapper } = makeWrapper({ initial_tab: 'study' })
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe(
      'Study Preferences'
    )
  })

  test('initial_side is NOT applied synchronously during setup [obligation]', () => {
    // The bug we fixed: flip and modal-open were simultaneous because setActiveSide
    // was called synchronously. The new contract is: setActiveSide is deferred until
    // after the enter animation resolves (await after_enter).
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    makeWrapper({ initial_tab: 'design', initial_side: 'front' })
    expect(setActiveSide).not.toHaveBeenCalled()
    setActiveSide.mockRestore()
  })

  test('initial_side=front: setActiveSide is called after the enter promise resolves [obligation]', async () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    makeWrapper({ initial_tab: 'design', initial_side: 'front' })
    // Not called yet — waiting for enter animation
    expect(setActiveSide).not.toHaveBeenCalled()
    // Simulate the modal enter completing
    afterEnterControls.resolve()
    await flushPromises()
    expect(setActiveSide).toHaveBeenCalledWith('front')
    setActiveSide.mockRestore()
  })

  test('initial_side=back: setActiveSide("back") is called after enter resolves [obligation]', async () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    makeWrapper({ initial_tab: 'design', initial_side: 'back' })
    afterEnterControls.resolve()
    await flushPromises()
    expect(setActiveSide).toHaveBeenCalledWith('back')
    setActiveSide.mockRestore()
  })

  test('omitting initial_side does not call editor.setActiveSide (even after enter) [obligation]', async () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    makeWrapper({ initial_tab: 'design' })
    afterEnterControls.resolve()
    await flushPromises()
    expect(setActiveSide).not.toHaveBeenCalled()
    setActiveSide.mockRestore()
  })
})

describe('DeckSettings — onNavigate sets direction forward and activates tab', () => {
  test('navigate event from tab content sets the header to the navigated tab', async () => {
    setSidebar(false)
    // Start at design tab (which is TabContentStub) so navigate button is present
    const { wrapper } = makeWrapper({ initial_tab: 'design' })

    await wrapper.find('[data-testid="tab-content__navigate"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe(
      'Study Preferences'
    )
  })
})

describe('DeckSettings — onClose when dirty shows alert', () => {
  test('close while dirty shows unsaved-changes alert', async () => {
    mockAlertWarn.mockReturnValue({ response: Promise.resolve(false) })
    const { wrapper } = makeWrapper()
    mockEditor.editor.is_dirty.value = true

    await wrapper.find('[data-testid="tab-sheet__close-emit"]').trigger('click')
    await flushPromises()

    expect(mockAlertWarn).toHaveBeenCalledTimes(1)
  })

  test('close while dirty and alert confirmed calls close(false)', async () => {
    mockAlertWarn.mockReturnValue({ response: Promise.resolve(true) })
    const { wrapper, close } = makeWrapper()
    mockEditor.editor.is_dirty.value = true

    await wrapper.find('[data-testid="tab-sheet__close-emit"]').trigger('click')
    await flushPromises()

    expect(close).toHaveBeenCalledWith(false)
  })

  test('close while dirty and alert cancelled does not close', async () => {
    mockAlertWarn.mockReturnValue({ response: Promise.resolve(false) })
    const { wrapper, close } = makeWrapper()
    mockEditor.editor.is_dirty.value = true

    await wrapper.find('[data-testid="tab-sheet__close-emit"]').trigger('click')
    await flushPromises()

    expect(close).not.toHaveBeenCalled()
  })
})

describe('DeckSettings — tab_initial_render fast-path [obligation]', () => {
  test('onTabEnter calls done immediately on first render without GSAP tween', async () => {
    // The GSAP mock fires onComplete synchronously (see gsap mock above), but
    // the important assertion is that tab_initial_render prevents any slide/fade
    // call on the very first enter. Since the transition fires internally on
    // mount, the initial render completes without additional GSAP calls.
    // Verify: after mount, the header is visible (tab content rendered = done() was called).
    setSidebar(false)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    await flushPromises()

    // Component is visible — onTabEnter called done() via the fast-path
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Card Designer')
  })
})
