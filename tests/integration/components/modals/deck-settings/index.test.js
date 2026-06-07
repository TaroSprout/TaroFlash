import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import DeckSettings from '@/components/modals/deck-settings/index.vue'
import { useMatchMedia } from '@/composables/use-media-query'
import { deck as deckFixture } from '../../../../fixtures/deck'
import { setSidebar, setBelowMd, resetResponsive } from '../../../../helpers/responsive-mock'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockAlertWarn, mockToastSuccess, mockToastError, mockEditor, mockRouterPush, initialTab } =
  vi.hoisted(() => ({
    mockAlertWarn: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockEditor: {
      resetReviews: vi.fn().mockResolvedValue(true),
      deleteDeck: vi.fn().mockResolvedValue(true),
      saveDeck: vi.fn().mockResolvedValue(true)
    },
    mockRouterPush: vi.fn(),
    initialTab: { value: 'danger-zone' }
  }))

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

vi.mock('@/composables/use-session-ref', () => ({
  // The deck-settings active tab is driven by `initialTab.value` from the
  // hoisted block — tests can flip it before mount to render any tab.
  useSessionRef: (key, initial) =>
    ref(key === 'deck-settings.active-tab' ? initialTab.value : initial)
}))

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

function makeWrapper() {
  const close = vi.fn()
  const wrapper = mount(DeckSettings, {
    props: { deck: deckFixture.one({ overrides: { id: 1 } }), close },
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
      },
      mocks: { $t: (k) => k }
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
  initialTab.value = 'danger-zone'
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
    {
      tab: 'general',
      title: 'Details & Settings',
      description: 'Name, description, and visibility.'
    },
    { tab: 'design', title: 'Card Designer', description: 'Cover art and card layout.' },
    { tab: 'study', title: 'Study Preferences', description: 'Pacing and daily limits.' },
    { tab: 'danger-zone', title: 'Danger Zone', description: 'Delete or reset this deck.' }
  ]

  for (const { tab, title, description } of cases) {
    test(`renders the ${tab} title + description`, () => {
      initialTab.value = tab
      const { wrapper } = makeWrapper()

      expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe(title)
      expect(wrapper.find('[data-testid="deck-settings__header-description"]').text()).toBe(
        description
      )
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
    initialTab.value = null
    setSidebar(true)
    const { wrapper } = makeWrapper()
    // has_sidebar arrives from TabSheet via a template ref — one render late.
    await nextTick()
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe(
      'Details & Settings'
    )
    expect(wrapper.find('[data-testid="deck-settings__back-button"]').exists()).toBe(false)
  })

  test('null active_tab renders the index header when the sidebar is hidden', () => {
    initialTab.value = null
    setSidebar(false)
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Deck Settings')
  })

  test('hiding the sidebar with danger-zone selected redirects to the index (null)', async () => {
    initialTab.value = 'danger-zone'
    setSidebar(true)
    const { wrapper } = makeWrapper()
    // Let the sidebar-visible state settle before hiding it, so the watch sees
    // the real true -> false transition (not a no-op false -> false).
    await nextTick()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Danger Zone')

    setSidebar(false)
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Deck Settings')
  })

  test('explicit general tab persists when the sidebar hides (no auto-collapse to index)', async () => {
    initialTab.value = 'general'
    setSidebar(true)
    const { wrapper } = makeWrapper()

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
    initialTab.value = 'general'
    setBelowMd(false)
    const { wrapper } = makeWrapper()

    initialTab.value = 'design'
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
    initialTab.value = 'general'
    setBelowMd(true)
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="tab-sheet__select-design"]').trigger('click')
    await flushPromises()
    await nextFrame()
    await flushPromises()

    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Card Designer')
  })
})

describe('DeckSettings — overlay actions', () => {
  test('floating preview click forwards the new side to editor.setActiveSide on the design tab', async () => {
    initialTab.value = 'design'
    setBelowMd(false)
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="deck-preview-stub"]').trigger('click')

    expect(setActiveSide).toHaveBeenCalledWith('front')
    setActiveSide.mockRestore()
  })

  test('floating preview click is a no-op when not on the design tab', async () => {
    initialTab.value = 'general'
    setBelowMd(false)
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="deck-preview-stub"]').trigger('click')

    expect(setActiveSide).not.toHaveBeenCalled()
    setActiveSide.mockRestore()
  })

  test('back button shows and clears active_tab when the sidebar is hidden', async () => {
    initialTab.value = 'design'
    setSidebar(false)
    const { wrapper } = makeWrapper()

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
    // @ts-ignore — drop rIC to force the setTimeout fallback path in onMounted
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
    // @ts-ignore — intercept the rIC call so the prefetch runs synchronously
    window.requestIdleCallback = idleSpy

    makeWrapper()
    await flushPromises()

    expect(idleSpy).toHaveBeenCalledTimes(1)
    expect(idleSpy.mock.calls[0][0]).toBeTypeOf('function')

    window.requestIdleCallback = originalIdle
  })
})
