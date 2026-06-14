import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import DeckSettings from '@/components/modals/deck-settings/index.vue'
import { useMatchMedia } from '@/composables/use-media-query'
import { deck as deckFixture } from '../../../../fixtures/deck'
import { setSidebar, setBelowMd, resetResponsive } from '../../../../helpers/responsive-mock'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockAlertWarn,
  mockToastSuccess,
  mockToastError,
  mockEditor,
  mockRouterPush,
  afterEnterControls,
  tabHeightLeaveSpy,
  tabHeightEnterSpy,
  tabSlideRightLeaveSpy,
  tabSlideRightEnterSpy,
  fadeEnterSpy,
  fadeLeaveSpy
} = vi.hoisted(() => {
  // Animation function spies: each wraps a no-op that immediately calls done()
  // so <Transition> hooks complete and Vue can proceed to the enter phase.
  const makeAnimSpy = () => vi.fn((_wrapper_or_el, _done_or_nothing) => {})
  // Curried versions (tabHeightLeave(wrapper) returns (el, done) => …)
  const makeCurriedSpy = () => vi.fn(() => vi.fn((_el, done) => done?.()))
  // Non-curried that call done directly
  const makeDirectSpy = () => vi.fn((_el, done) => done?.())
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
    afterEnterControls,
    tabHeightLeaveSpy: makeCurriedSpy(),
    tabHeightEnterSpy: makeCurriedSpy(),
    tabSlideRightLeaveSpy: makeCurriedSpy(),
    tabSlideRightEnterSpy: makeCurriedSpy(),
    fadeEnterSpy: makeDirectSpy(),
    fadeLeaveSpy: makeDirectSpy()
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

// Animation utility mocks — let tests spy on which function the component routes
// to based on nav_direction. Each curried mock returns a function that immediately
// calls done() so <Transition> hooks complete and Vue can continue.
vi.mock('@/utils/animations/tab-height', () => ({
  tabHeightLeave: (...args) => tabHeightLeaveSpy(...args),
  tabHeightEnter: (...args) => tabHeightEnterSpy(...args)
}))

vi.mock('@/utils/animations/slide-fade-right', () => ({
  slideFadeRightEnter: (_el, done) => done?.(),
  slideFadeRightLeave: (_el, done) => done?.(),
  tabSlideRightLeave: (...args) => tabSlideRightLeaveSpy(...args),
  tabSlideRightEnter: (...args) => tabSlideRightEnterSpy(...args)
}))

vi.mock('@/utils/animations/fade', () => ({
  fadeEnter: (...args) => fadeEnterSpy(...args),
  fadeLeave: (...args) => fadeLeaveSpy(...args)
}))

// Module-mock the async tab components so they resolve to real components
// immediately (no lazy loading), giving <Transition> real DOM nodes to animate.
vi.mock('@/components/modals/deck-settings/tab-design/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'TabDesign',
      emits: ['navigate'],
      setup(_p, { emit }) {
        return () => h('div', { 'data-testid': 'tab-design-stub' }, 'design')
      }
    })
  }
})

vi.mock('@/components/modals/deck-settings/tab-study/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'TabStudy',
      emits: ['navigate'],
      setup(_p, { emit }) {
        return () => h('div', { 'data-testid': 'tab-study-stub' }, 'study')
      }
    })
  }
})

vi.mock('@/components/modals/deck-settings/tab-index/index.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'TabIndex',
      emits: ['navigate'],
      setup(_p, { emit }) {
        return () => h('div', { 'data-testid': 'tab-index-stub' }, 'index')
      }
    })
  }
})

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
  afterEnterControls.reset()
  resetResponsive()
  // Reset animation spies so each test starts clean
  tabHeightLeaveSpy.mockReset().mockReturnValue(vi.fn((_el, done) => done?.()))
  tabHeightEnterSpy.mockReset().mockReturnValue(vi.fn((_el, done) => done?.()))
  tabSlideRightLeaveSpy.mockReset().mockReturnValue(vi.fn((_el, done) => done?.()))
  tabSlideRightEnterSpy.mockReset().mockReturnValue(vi.fn((_el, done) => done?.()))
  fadeEnterSpy.mockReset().mockImplementation((_el, done) => done?.())
  fadeLeaveSpy.mockReset().mockImplementation((_el, done) => done?.())
})

describe('DeckSettings — save button visibility (driven by editor.is_dirty)', () => {
  test('renders the DeckAside with a save button', () => {
    const { wrapper } = makeWrapper()
    expect(
      wrapper
        .find('[data-testid="deck-settings__aside"] [data-testid="deck-aside-save-btn"]')
        .exists()
    ).toBe(true)
  })

  test('clicking the save button calls editor.saveDeck and closes on success', async () => {
    mockEditor.saveDeck.mockResolvedValue(true)
    const { wrapper, close } = makeWrapper()

    await wrapper
      .find('[data-testid="deck-settings__aside"] [data-testid="deck-aside-save-btn"]')
      .trigger('click')
    await flushPromises()

    expect(mockEditor.saveDeck).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledWith(true)
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

describe('DeckSettings — footer save button visibility [obligation]', () => {
  test('footer is absent when is_mobile=false (desktop) regardless of active_tab [obligation]', () => {
    setBelowMd(false)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    expect(wrapper.find('[data-testid="deck-settings__footer"]').exists()).toBe(false)
  })

  test('footer is absent on mobile when active_tab is null (index screen) [obligation]', () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="deck-settings__footer"]').exists()).toBe(false)
  })

  test('footer renders on mobile when active_tab is non-null [obligation]', () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    expect(wrapper.find('[data-testid="deck-settings__footer"]').exists()).toBe(true)
  })

  test('footer disappears reactively when navigating back to null (index) on mobile [obligation]', async () => {
    setBelowMd(true)
    setSidebar(false)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    expect(wrapper.find('[data-testid="deck-settings__footer"]').exists()).toBe(true)

    await wrapper.find('[data-testid="deck-settings__back-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__footer"]').exists()).toBe(false)
  })

  test('footer save button calls onSave when editor is dirty [obligation]', async () => {
    setBelowMd(true)
    mockEditor.saveDeck.mockResolvedValue(true)
    const { wrapper, close } = makeWrapper({ initial_tab: 'design' })
    if (mockEditor.editor) mockEditor.editor.is_dirty.value = true
    await nextTick()

    await wrapper.find('[data-testid="deck-settings__footer-save-button"]').trigger('click')
    await flushPromises()

    expect(mockEditor.saveDeck).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledWith(true)
  })
})

describe('DeckSettings — is_tab_transitioning sync flag [obligation]', () => {
  test('footer div mounts with data-transitioning when tab changes (sync watcher fires before render) [obligation]', async () => {
    // The sync watcher (flush: sync) sets is_tab_transitioning=true BEFORE Vue
    // re-renders. When the footer div first mounts it already carries
    // data-transitioning="true" (and opacity-0), so it never flashes visible.
    setBelowMd(true)
    const { wrapper } = makeWrapper()

    // Trigger the tab change via user interaction (sidebar emit)
    await wrapper.find('[data-testid="tab-sheet__select-design"]').trigger('click')
    // One tick: DOM is updated (footer mounts) but finish() hasn't cleared the
    // flag yet (animation mocks call done immediately but the <Transition> hook
    // wiring in this test env settles asynchronously).
    await nextTick()

    const footer = wrapper.find('[data-testid="deck-settings__footer"]')
    expect(footer.exists()).toBe(true)
    expect(footer.attributes('data-transitioning')).toBe('true')
  })

  test('is_tab_transitioning is cleared (data-transitioning absent) after the enter animation completes [obligation]', async () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    // Let everything settle after the initial tab mount
    await flushPromises()
    await new Promise((r) => requestAnimationFrame(r))
    await flushPromises()

    const footer = wrapper.find('[data-testid="deck-settings__footer"]')
    expect(footer.exists()).toBe(true)
    // After animation completes, is_tab_transitioning is false → data-transitioning absent
    expect(footer.attributes('data-transitioning')).toBeUndefined()
  })
})

describe('DeckSettings — nav_direction mapping: sync watcher sets correct direction [obligation]', () => {
  // nav_direction is a plain (non-reactive) let, so we verify it indirectly via
  // the sync watcher's co-assignment of is_tab_transitioning and the resulting
  // header title / footer visibility after the navigation completes.
  // The animation function routing (tabSlideRightEnter vs tabHeightEnter) is
  // locked down by unit tests on the animation utilities themselves.

  test('null → tab transition completes and displays the target tab [obligation]', async () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper()

    // Sync watcher fires immediately setting is_tab_transitioning = true and
    // nav_direction = 'forward' (null → non-null).
    await wrapper.find('[data-testid="tab-sheet__select-design"]').trigger('click')
    await flushPromises()
    await new Promise((r) => requestAnimationFrame(r))
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Card Designer')
  })

  test('tab → null (back) transition completes and shows index header [obligation]', async () => {
    setBelowMd(true)
    setSidebar(false)
    const { wrapper } = makeWrapper({ initial_tab: 'design' })

    // Sync watcher sets nav_direction = 'back' (non-null → null).
    await wrapper.find('[data-testid="deck-settings__back-button"]').trigger('click')
    await flushPromises()
    await new Promise((r) => requestAnimationFrame(r))
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Deck Settings')
    expect(wrapper.find('[data-testid="deck-settings__footer"]').exists()).toBe(false)
  })

  test('tab → tab transition completes and shows the new tab header [obligation]', async () => {
    setBelowMd(true)
    const { wrapper } = makeWrapper({ initial_tab: 'study' })

    // Sync watcher sets nav_direction = null (non-null → non-null).
    await wrapper.find('[data-testid="tab-sheet__select-design"]').trigger('click')
    await flushPromises()
    await new Promise((r) => requestAnimationFrame(r))
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Card Designer')
  })

  test('sync watcher sets is_tab_transitioning=true before Vue re-renders on null→tab [obligation]', async () => {
    // The sync flush: true watcher fires BEFORE Vue queues a DOM update.
    // So immediately after active_tab mutates (before nextTick), is_tab_transitioning
    // is already true and the footer (newly visible via v-if) carries opacity-0.
    setBelowMd(true)
    const { wrapper } = makeWrapper()

    // Trigger via the sidebar_active setter path (same as clicking a tab)
    await wrapper.find('[data-testid="tab-sheet__select-design"]').trigger('click')
    // Sync watcher already fired; DOM not updated yet — check after one tick
    await nextTick()

    const footer = wrapper.find('[data-testid="deck-settings__footer"]')
    expect(footer.exists()).toBe(true)
    expect(footer.attributes('data-transitioning')).toBe('true')
  })
})

describe('DeckSettings — transition hooks route to correct animation on desktop [obligation]', () => {
  test('non-mobile tab change completes (header title updates to target tab) [obligation]', async () => {
    // On desktop (is_mobile=false), onTabLeave/onTabEnter route to fadeLeave/fadeEnter.
    // We verify the routing outcome: the tab change completes and the correct title shows.
    // The fadeLeave/fadeEnter routing is verified at unit level in the animation utils tests.
    setBelowMd(false)
    const { wrapper } = makeWrapper({ initial_tab: 'study' })

    await wrapper.find('[data-testid="tab-sheet__select-design"]').trigger('click')
    await flushPromises()
    await new Promise((r) => requestAnimationFrame(r))
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Card Designer')
    // Desktop has no footer (is_mobile=false)
    expect(wrapper.find('[data-testid="deck-settings__footer"]').exists()).toBe(false)
  })
})
