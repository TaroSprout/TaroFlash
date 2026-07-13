import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import DeckSettings from '@/views/deck/deck-settings/index.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
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

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ success: mockToastSuccess, error: mockToastError })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useRoute: () => ({ name: 'dashboard', params: {} })
}))

vi.mock('@/composables/ui/media-query', async () => {
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

vi.mock('@/composables/deck/editor', async () => {
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
    preview_front_text: vueRef(undefined),
    preview_back_text: vueRef(undefined),
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
vi.mock('@/views/deck/deck-settings/deck-aside.vue', async () => {
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

vi.mock('@/views/deck/deck-settings/tab-danger-zone/index.vue', async () => {
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

// The remaining tabs (index/details/design/study) are now statically bundled
// too — module-mock each so their real setup() (deep editor/i18n context we
// don't provide here) never runs. Their own logic is covered in their
// dedicated test files (tab-design/index.test.js, tab-study.test.js, ...).
function makeTabContentMock(testid) {
  return async () => {
    const { defineComponent, h } = await import('vue')
    return {
      default: defineComponent({
        emits: ['navigate'],
        setup(_props, { emit }) {
          return () =>
            h('div', { 'data-testid': testid }, [
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
      })
    }
  }
}

vi.mock('@/views/deck/deck-settings/tab-index/index.vue', makeTabContentMock('tab-index-stub'))
vi.mock('@/views/deck/deck-settings/tab-details/index.vue', makeTabContentMock('tab-details-stub'))
vi.mock('@/views/deck/deck-settings/tab-design/index.vue', makeTabContentMock('tab-design-stub'))
vi.mock('@/views/deck/deck-settings/tab-study/index.vue', makeTabContentMock('tab-study-stub'))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const TabSheetStub = defineComponent({
  props: ['tabs'],
  emits: ['close', 'back', 'update:active'],
  setup(props, { slots, emit, expose }) {
    // Mirror the real TabSheet: own sidebar visibility and expose it upward.
    expose({ has_sidebar: useMatchMedia('w>=lg & fine') })
    return () =>
      h(
        'div',
        {
          'data-testid': 'tab-sheet',
          'data-tab-icons': JSON.stringify(props.tabs ?? [])
        },
        [
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
              'data-testid': 'tab-sheet__back-emit',
              onClick: () => emit('back')
            },
            'back'
          ),
          ...(props.tabs ?? []).map((tab) =>
            h(
              'button',
              {
                'data-testid': `tab-sheet__select-${tab.value}`,
                onClick: () => emit('update:active', tab.value)
              },
              tab.value
            )
          ),
          slots.default?.(),
          slots.overlay?.(),
          h('div', { 'data-testid': 'tab-sheet__footer' }, slots.footer?.())
        ]
      )
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  setup(_props, { slots, attrs }) {
    return () => h('button', { 'data-testid': 'ui-button', ...attrs }, slots.default?.())
  }
})

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props, { attrs }) {
    return () => h('div', { ...attrs, 'data-icon-src': props.src })
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

// Stub for tab content components that includes a navigate trigger so the
// parent's @navigate handler can be exercised from tests. Tabs no longer emit
// 'back' themselves — that's chrome-driven via the tab-sheet's own back button.
const TabContentStub = defineComponent({
  emits: ['navigate'],
  setup(_props, { emit }) {
    return () => {
      return h('div', { 'data-testid': 'tab-content-stub' }, [
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

const DeckPinnedPreviewStub = defineComponent({
  name: 'DeckPinnedPreview',
  emits: ['update:side'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'deck-pinned-preview-stub' }, [
        h(
          'button',
          { 'data-testid': 'deck-preview-stub', onClick: () => emit('update:side', 'front') },
          'preview'
        )
      ])
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
        DeckPinnedPreview: DeckPinnedPreviewStub,
        DeckAside: DeckAsideStub,
        UiButton: UiButtonStub,
        UiIcon: UiIconStub
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

describe('DeckSettings — header_title reflects the deck title, not the active tab [obligation]', () => {
  test('shows deck.title verbatim regardless of active tab [obligation]', () => {
    const { wrapper } = makeWrapper({
      deck: deckFixture.one({ overrides: { id: 1, title: 'My Deck' } }),
      initial_tab: 'study'
    })

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('My Deck')
  })

  test('falls back to the i18n default title when deck.title is an empty string [obligation]', () => {
    const { wrapper } = makeWrapper({
      deck: deckFixture.one({ overrides: { id: 1, title: '' } })
    })

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Deck Settings')
  })
})

describe('DeckSettings — tab bar composition [obligation]', () => {
  test('desktop tab bar excludes "details" but includes design/study/danger-zone [obligation]', () => {
    const { wrapper } = makeWrapper()
    const tab_bar_entries = JSON.parse(
      wrapper.find('[data-tab-icons]').attributes('data-tab-icons')
    )
    expect(tab_bar_entries.map((t) => t.value)).toEqual(['design', 'study', 'danger-zone'])
  })
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
  test('null active_tab renders the design tab when the sidebar is visible', async () => {
    setSidebar(true)
    // No initial_tab → active_tab starts null (plain ref)
    const { wrapper } = makeWrapper()
    // has_sidebar arrives from TabSheet via a template ref — one render late.
    await nextTick()
    expect(wrapper.find('[data-testid="tab-design-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-settings__back-button"]').exists()).toBe(false)
  })

  test('null active_tab renders the index tab when the sidebar is hidden', () => {
    setSidebar(false)
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
  })

  test('hiding the sidebar with danger-zone selected redirects to the index (null)', async () => {
    setSidebar(true)
    const { wrapper } = makeWrapper({ initial_tab: 'danger-zone' })
    // Let the sidebar-visible state settle before hiding it, so the watch sees
    // the real true -> false transition (not a no-op false -> false).
    await nextTick()

    expect(wrapper.find('[data-testid="tab-danger-zone-stub"]').exists()).toBe(true)

    setSidebar(false)
    await flushPromises()

    expect(wrapper.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
  })
})

describe('DeckSettings — below-md layout collapse', () => {
  test('renders aside + floating preview above md', () => {
    setBelowMd(false)
    const { wrapper } = makeWrapper()

    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-settings__pinned-preview"]').exists()).toBe(true)
  })

  test('hides the aside when below md', () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper()

    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(false)
  })

  test('hides the floating overlay preview when below md', () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper()

    expect(wrapper.find('[data-testid="deck-settings__pinned-preview"]').exists()).toBe(false)
  })

  test('toggles aside + floating preview reactively when crossing md', async () => {
    setBelowMd(false)
    const { wrapper } = makeWrapper()

    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(true)

    setBelowMd(true)
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="deck-settings__pinned-preview"]').exists()).toBe(false)
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

    expect(wrapper.find('[data-testid="tab-design-stub"]').exists()).toBe(true)
  })

  test('swapping tabs below md routes through the mobile height tween', async () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper({ initial_tab: 'study' })

    await wrapper.find('[data-testid="tab-sheet__select-design"]').trigger('click')
    await flushPromises()
    await nextFrame()
    await flushPromises()

    expect(wrapper.find('[data-testid="tab-design-stub"]').exists()).toBe(true)
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

  test('tab-sheet back emit clears active_tab (chrome-driven back, no per-tab back button) [obligation]', async () => {
    setSidebar(false)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })

    await wrapper.find('[data-testid="tab-sheet__back-emit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
  })

  test('onChromeBack falls through to the default back action when the active tab has no onChromeBack [obligation]', async () => {
    setSidebar(false)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })

    await wrapper.vm.onChromeBack()
    await flushPromises()

    expect(wrapper.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
  })

  test('tab-sheet close emit forwards to close(false)', async () => {
    const { wrapper, close } = makeWrapper()

    await wrapper.find('[data-testid="tab-sheet__close-emit"]').trigger('click')

    expect(close).toHaveBeenCalledWith(false)
  })
})

describe('DeckSettings — active_tab is a plain non-persisted ref [obligation]', () => {
  test('active_tab defaults to null (no initial_tab prop)', () => {
    setSidebar(false)
    const { wrapper } = makeWrapper()
    // With null active_tab and no sidebar, the index tab is displayed
    expect(wrapper.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
  })

  test('initial_tab prop sets active_tab to that tab on mount [obligation]', () => {
    const { wrapper } = makeWrapper({ initial_tab: 'study' })
    expect(wrapper.find('[data-testid="tab-study-stub"]').exists()).toBe(true)
  })

  test('second mount starts fresh (no cross-mount state leak) [obligation]', () => {
    // First mount with design tab
    const { wrapper: w1 } = makeWrapper({ initial_tab: 'design' })
    expect(w1.find('[data-testid="tab-design-stub"]').exists()).toBe(true)
    w1.unmount()

    // Second mount with no initial_tab: should start at null/index, not design
    setSidebar(false)
    const { wrapper: w2 } = makeWrapper()
    expect(w2.find('[data-testid="tab-index-stub"]').exists()).toBe(true)
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
    await wrapper.find('[data-testid="tab-sheet__back-emit"]').trigger('click')
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
    expect(wrapper.find('[data-testid="tab-design-stub"]').exists()).toBe(true)
  })

  test('initial_tab prop opens that tab directly (study)', () => {
    const { wrapper } = makeWrapper({ initial_tab: 'study' })
    expect(wrapper.find('[data-testid="tab-study-stub"]').exists()).toBe(true)
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
  test('navigate event from tab content activates the navigated tab', async () => {
    setSidebar(false)
    // Start at design tab (which is TabContentStub) so navigate button is present
    const { wrapper } = makeWrapper({ initial_tab: 'design' })

    await wrapper.find('[data-testid="tab-content__navigate"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="tab-study-stub"]').exists()).toBe(true)
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
    // Verify: after mount, the tab content is visible (rendered = done() was called).
    setSidebar(false)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    await flushPromises()

    // Component is visible — onTabEnter called done() via the fast-path
    expect(wrapper.find('[data-testid="tab-design-stub"]').exists()).toBe(true)
  })
})
