import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import DeckSettings from '@/components/modals/deck-settings/index.vue'
import { useMatchMedia } from '@/composables/use-media-query'
import { deck as deckFixture } from '../../../../fixtures/deck'
import { setSidebar, setBelowMd, resetResponsive } from '../../../../helpers/responsive-mock'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockAlertWarn, mockToastSuccess, mockToastError, mockEditor, mockRouterPush } = vi.hoisted(
  () => ({
    mockAlertWarn: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockEditor: {
      resetReviews: vi.fn().mockResolvedValue(true),
      deleteDeck: vi.fn().mockResolvedValue(true),
      saveDeck: vi.fn().mockResolvedValue(true)
    },
    mockRouterPush: vi.fn()
  })
)

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
      props: ['deck'],
      setup(props) {
        return () =>
          h('div', {
            'data-testid': 'deck-aside-stub',
            'data-deck-id': props.deck?.id ?? ''
          })
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

const PassthroughStub = defineComponent({
  setup() {
    return () => h('div')
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
  props: ['deck'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'deck-aside-stub',
        'data-deck-id': props.deck?.id ?? ''
      })
  }
})

function makeWrapper(extraProps = {}) {
  const close = vi.fn()
  const wrapper = mount(DeckSettings, {
    props: { deck: deckFixture.one({ overrides: { id: 1 } }), close, ...extraProps },
    global: {
      stubs: {
        TabSheet: TabSheetStub,
        TabDesign: PassthroughStub,
        TabGeneral: PassthroughStub,
        TabStudy: PassthroughStub,
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
  resetResponsive()
})

describe('DeckSettings — save button visibility (driven by editor.is_dirty)', () => {
  test('hides the save button when the editor is not dirty', () => {
    mockEditor.editor.is_dirty.value = false
    const { wrapper } = makeWrapper()

    const footer = wrapper.find('[data-testid="tab-sheet__footer"]')
    expect(footer.find('[data-testid="ui-button"]').exists()).toBe(false)
  })

  test('shows the save button when the editor reports a dirty state', () => {
    mockEditor.editor.is_dirty.value = true
    const { wrapper } = makeWrapper()

    const footer = wrapper.find('[data-testid="tab-sheet__footer"]')
    expect(footer.find('[data-testid="ui-button"]').exists()).toBe(true)
  })

  test('clicking the save button calls editor.saveDeck and closes on success', async () => {
    mockEditor.editor.is_dirty.value = true
    mockEditor.saveDeck.mockResolvedValue(true)
    const { wrapper, close } = makeWrapper()

    await wrapper.find('[data-testid="ui-button"]').trigger('click')
    await flushPromises()

    expect(mockEditor.saveDeck).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledWith(true)
  })
})

describe('DeckSettings — header copy is tab-driven', () => {
  const cases = [
    { tab: 'general', title: 'Details & Settings' },
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
  test('renders the DeckAside with the deck prop forwarded', () => {
    const { wrapper } = makeWrapper()

    const aside = wrapper.find('[data-testid="deck-settings__aside"]')
    expect(aside.exists()).toBe(true)
    expect(aside.attributes('data-deck-id')).toBe('1')
  })
})

describe('DeckSettings — null active_tab tracks sidebar visibility', () => {
  // The default tab must be the strict inverse of whether TabSheet shows its
  // sidebar ('w>=lg & fine'): sidebar visible -> general, hidden -> index.
  test('null active_tab renders the general header when the sidebar is visible', async () => {
    setSidebar(true)
    // No initial_tab → active_tab starts null (plain ref)
    const { wrapper } = makeWrapper()
    // has_sidebar arrives from TabSheet via a template ref — one render late.
    await nextTick()
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe(
      'Details & Settings'
    )
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

  test('explicit general tab persists when the sidebar hides (no auto-collapse to index)', async () => {
    setSidebar(true)
    const { wrapper } = makeWrapper({ initial_tab: 'general' })

    setSidebar(false)
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe(
      'Details & Settings'
    )
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
    const { wrapper } = makeWrapper({ initial_tab: 'general' })

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
    const { wrapper } = makeWrapper({ initial_tab: 'general' })

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
    const { wrapper } = makeWrapper({ initial_tab: 'general' })

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

  test('initial_side calls editor.setActiveSide with the provided side [obligation]', () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    makeWrapper({ initial_tab: 'design', initial_side: 'front' })
    expect(setActiveSide).toHaveBeenCalledWith('front')
    setActiveSide.mockRestore()
  })

  test('initial_side=back calls editor.setActiveSide("back") [obligation]', () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    makeWrapper({ initial_tab: 'design', initial_side: 'back' })
    expect(setActiveSide).toHaveBeenCalledWith('back')
    setActiveSide.mockRestore()
  })

  test('omitting initial_side does not call editor.setActiveSide', () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    makeWrapper({ initial_tab: 'design' })
    expect(setActiveSide).not.toHaveBeenCalled()
    setActiveSide.mockRestore()
  })
})
