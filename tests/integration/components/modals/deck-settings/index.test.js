import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, computed, ref, nextTick } from 'vue'
import DeckSettings from '@/views/deck/deck-settings/index.vue'
import { deck as deckFixture } from '../../../../fixtures/deck'

// Shared reactive layout mode the PagedWindowStub reads from — driven directly
// (not via wrapper.setProps, since VTU only allows setProps on the root
// mounted component) so tests can simulate crossing breakpoints mid-test.
const stub_layout_mode = ref('desktop')

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockAlertWarn,
  mockEditor,
  mockChromeTuck,
  mockChromeRestore,
  mockChromeSnap,
  chromeIsTucked,
  afterEnterControls
} = vi.hoisted(() => {
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
    mockEditor: {
      resetReviews: vi.fn().mockResolvedValue(true),
      deleteDeck: vi.fn().mockResolvedValue(true),
      saveDeck: vi.fn().mockResolvedValue(true)
    },
    mockChromeTuck: vi.fn().mockResolvedValue(undefined),
    mockChromeRestore: vi.fn().mockResolvedValue(undefined),
    mockChromeSnap: vi.fn(),
    chromeIsTucked: { value: false },
    afterEnterControls
  }
})

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: mockAlertWarn })
}))

// Mock the window-chrome composable directly — its own tuck/restore/snap
// contract (edge-on timing, no-op guards) is covered by
// tests/unit/views/deck/deck-settings/window-chrome.test.js. Here we only
// care that deck-settings calls it correctly.
vi.mock('@/views/deck/deck-settings/window-chrome', () => ({
  useWindowChrome: () => ({
    is_tucked: chromeIsTucked,
    tuck: mockChromeTuck,
    restore: mockChromeRestore,
    snap: mockChromeSnap
  })
}))

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
    draft: reactive({ cover_config: {}, card_attributes: { front: {}, back: {} } }),
    active_side: vueRef('cover'),
    preview_front_text: vueRef(undefined),
    preview_back_text: vueRef(undefined),
    is_dirty: vueRef(false),
    saveDeck: (...args) => mockEditor.saveDeck(...args),
    deleteDeck: (...args) => mockEditor.deleteDeck(...args),
    resetReviews: (...args) => mockEditor.resetReviews(...args),
    setActiveSide: () => {}
  }
  mockEditor.editor = editor
  return {
    useDeckEditor: () => editor,
    deckEditorKey: Symbol('deckEditor')
  }
})

vi.mock('@/composables/deck/danger-actions', () => ({
  useDeckDangerActions: () => ({
    onDelete: vi.fn(),
    onResetReviews: vi.fn(),
    deleting: { value: false },
    resetting_reviews: { value: false }
  }),
  deckDangerActionsKey: Symbol('deckDangerActions')
}))

// Tab content components are stubbed at the module level — their own logic
// is covered in their dedicated test files.
function makeTabStub(testid) {
  return async () => {
    const { defineComponent, h } = await import('vue')
    return {
      default: defineComponent({
        name: testid,
        setup(_p, { expose }) {
          expose({})
          return () => h('div', { 'data-testid': testid })
        }
      })
    }
  }
}
vi.mock('@/views/deck/deck-settings/tab-details/index.vue', makeTabStub('tab-details-stub'))
vi.mock('@/views/deck/deck-settings/tab-design/index.vue', makeTabStub('tab-design-stub'))
vi.mock(
  '@/views/deck/deck-settings/tab-review-pacing/index.vue',
  makeTabStub('tab-review-pacing-stub')
)
vi.mock(
  '@/views/deck/deck-settings/tab-review-history/index.vue',
  makeTabStub('tab-review-history-stub')
)
vi.mock('@/views/deck/deck-settings/tab-danger-zone/index.vue', makeTabStub('tab-danger-zone-stub'))

vi.mock('@/views/deck/deck-settings/deck-aside.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'DeckAside',
      setup(_props, { expose }) {
        expose({ validate: () => true })
        return () => h('div', { 'data-testid': 'deck-aside-stub' })
      }
    })
  }
})

vi.mock('@/views/deck/deck-settings/deck-save-button.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'DeckSaveButton',
      setup: () => () => h('div', { 'data-testid': 'deck-save-button-stub' })
    })
  }
})

vi.mock('@/components/deck/pinned-preview.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'DeckPinnedPreview',
      emits: ['update:side'],
      setup(_props, { emit }) {
        return () =>
          h(
            'button',
            { 'data-testid': 'deck-preview-stub', onClick: () => emit('update:side', 'front') },
            'preview'
          )
      }
    })
  }
})

vi.mock('@/components/ui-kit/scroll-bar.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ name: 'ScrollBar', setup: () => () => h('div') }) }
})

// ── PagedWindow stub ──────────────────────────────────────────────────────────
// Exposes a controllable layout_mode/displayed_page so tests can drive the
// desktop/tablet/phone crossing without fighting the real component's own
// media-query + Transition machinery (covered separately in
// tests/integration/components/layout-kit/paged-window/index.test.js).

const PagedWindowStub = defineComponent({
  name: 'PagedWindow',
  props: {
    active: { type: String, default: null },
    pages: { type: Array, default: () => [] },
    groups: { type: Array, default: () => [] },
    between: { type: Function, default: undefined }
  },
  emits: ['close', 'back', 'select', 'reselect', 'update:active'],
  setup(props, { slots, emit, expose }) {
    const layout_mode = computed(() => stub_layout_mode.value)
    const displayed_page = computed(() => props.active ?? 'directory')
    const has_sidebar = computed(() => layout_mode.value === 'desktop')
    expose({ layout_mode, displayed_page, has_sidebar })

    return () =>
      h('div', { 'data-testid': 'paged-window-stub' }, [
        h('div', { 'data-testid': 'pw__header-content' }, slots['header-content']?.()),
        h('button', { 'data-testid': 'pw__close', onClick: () => emit('close') }, 'close'),
        h('button', { 'data-testid': 'pw__back', onClick: () => emit('back') }, 'back'),
        h(
          'button',
          {
            'data-testid': 'pw__select-review-pacing',
            onClick: () => emit('update:active', 'review-pacing')
          },
          'review-pacing'
        ),
        h(
          'button',
          { 'data-testid': 'pw__select-design', onClick: () => emit('update:active', 'design') },
          'design'
        ),
        h('div', { 'data-testid': 'pw__scrollbar' }, slots.scrollbar?.()),
        h('div', { 'data-testid': 'pw__aside' }, slots.aside?.()),
        h('div', { 'data-testid': 'pw__directory-footer' }, slots['directory-footer']?.()),
        h('div', { 'data-testid': 'pw__overlay' }, slots.overlay?.()),
        h(
          'div',
          { 'data-testid': 'pw__default' },
          slots.default?.({ displayed_page: displayed_page.value })
        )
      ])
  }
})

// ── Factory ───────────────────────────────────────────────────────────────────

function makeWrapper(extraProps = {}) {
  const close = vi.fn()
  const wrapper = mount(DeckSettings, {
    props: { deck: deckFixture.one({ overrides: { id: 1 } }), close, ...extraProps },
    global: { stubs: { PagedWindow: PagedWindowStub } }
  })
  return { wrapper, close }
}

async function setLayout(mode) {
  stub_layout_mode.value = mode
  await nextTick()
  await nextTick()
}

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  stub_layout_mode.value = 'desktop'
  mockAlertWarn.mockReset()
  mockChromeTuck.mockReset().mockResolvedValue(undefined)
  mockChromeRestore.mockReset().mockResolvedValue(undefined)
  mockChromeSnap.mockReset()
  chromeIsTucked.value = false
  mockEditor.resetReviews.mockReset().mockResolvedValue(true)
  mockEditor.deleteDeck.mockReset().mockResolvedValue(true)
  mockEditor.saveDeck.mockReset().mockResolvedValue(true)
  if (mockEditor.editor) mockEditor.editor.active_side.value = 'cover'
  afterEnterControls.reset()
})

// ── Header + pages wiring ──────────────────────────────────────────────────────

describe('DeckSettings — header_title reflects the deck title, not the active tab', () => {
  test('shows deck.title verbatim regardless of active tab', () => {
    const { wrapper } = makeWrapper({
      deck: deckFixture.one({ overrides: { id: 1, title: 'My Deck' } }),
      initial_tab: 'review-pacing'
    })
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('My Deck')
  })

  test('falls back to the i18n default title when deck.title is an empty string', () => {
    const { wrapper } = makeWrapper({
      deck: deckFixture.one({ overrides: { id: 1, title: '' } })
    })
    expect(wrapper.find('[data-testid="deck-settings__header-title"]').text()).toBe('Deck Settings')
  })
})

describe('DeckSettings — pages prop composition [obligation]', () => {
  test('passes a Page[] with details excluded from the sidebar (sidebar: false)', () => {
    const { wrapper } = makeWrapper()
    const pw = wrapper.findComponent({ name: 'PagedWindow' })
    const values = pw.props('pages').map((p) => p.value)
    expect(values).toEqual(['details', 'design', 'review-pacing', 'review-history', 'danger-zone'])
    expect(pw.props('pages').find((p) => p.value === 'details').sidebar).toBe(false)
  })

  test('groups include "details" in the appearance group only on phone layout', async () => {
    const { wrapper } = makeWrapper()
    const pw = wrapper.findComponent({ name: 'PagedWindow' })

    await setLayout('desktop')
    const desktop_group = pw.props('groups').find((g) => g.key === 'appearance')
    expect(desktop_group.entries).not.toContain('details')

    await setLayout('phone')
    const phone_group = pw.props('groups').find((g) => g.key === 'appearance')
    expect(phone_group.entries).toContain('details')
  })
})

// ── initial_tab / initial_side ────────────────────────────────────────────────

describe('DeckSettings — initial_tab / initial_side [obligation]', () => {
  test('initial_tab prop opens that tab directly', () => {
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    expect(wrapper.find('[data-testid="tab-design-stub"]').exists()).toBe(true)
  })

  test('initial_side is NOT applied synchronously during setup', () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    makeWrapper({ initial_tab: 'design', initial_side: 'front' })
    expect(setActiveSide).not.toHaveBeenCalled()
    setActiveSide.mockRestore()
  })

  test('setActiveSide is called with the initial_side after the enter promise resolves', async () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    makeWrapper({ initial_tab: 'design', initial_side: 'front' })
    expect(setActiveSide).not.toHaveBeenCalled()

    afterEnterControls.resolve()
    await flushPromises()

    expect(setActiveSide).toHaveBeenCalledWith('front')
    setActiveSide.mockRestore()
  })

  test('omitting initial_side never calls setActiveSide, even after enter resolves', async () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    makeWrapper({ initial_tab: 'design' })
    afterEnterControls.resolve()
    await flushPromises()
    expect(setActiveSide).not.toHaveBeenCalled()
    setActiveSide.mockRestore()
  })
})

// ── active_side reset on back ──────────────────────────────────────────────────

describe('DeckSettings — active_side resets to cover when active_tab becomes null', () => {
  test('going back (null tab) resets editor.active_side to cover', async () => {
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    mockEditor.editor.active_side.value = 'front'

    await wrapper.find('[data-testid="pw__back"]').trigger('click')
    await flushPromises()

    expect(mockEditor.editor.active_side.value).toBe('cover')
  })

  test('navigating to a non-null tab does not reset active_side', async () => {
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    mockEditor.editor.active_side.value = 'front'

    await wrapper.find('[data-testid="pw__select-design"]').trigger('click')
    await flushPromises()

    expect(mockEditor.editor.active_side.value).toBe('front')
  })
})

// ── onClose unsaved-changes guard ──────────────────────────────────────────────

describe('DeckSettings — onClose unsaved-changes guard', () => {
  test('close while not dirty calls close(false) immediately with no alert', async () => {
    const { wrapper, close } = makeWrapper()
    await wrapper.find('[data-testid="pw__close"]').trigger('click')
    expect(mockAlertWarn).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledWith(false)
  })

  test('close while dirty shows the unsaved-changes alert and only closes on confirm', async () => {
    mockEditor.editor.is_dirty.value = true
    mockAlertWarn.mockReturnValue({ response: Promise.resolve(true) })
    const { wrapper, close } = makeWrapper()

    await wrapper.find('[data-testid="pw__close"]').trigger('click')
    await flushPromises()

    expect(mockAlertWarn).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledWith(false)
  })

  test('close while dirty and alert cancelled does not close', async () => {
    mockEditor.editor.is_dirty.value = true
    mockAlertWarn.mockReturnValue({ response: Promise.resolve(false) })
    const { wrapper, close } = makeWrapper()

    await wrapper.find('[data-testid="pw__close"]').trigger('click')
    await flushPromises()

    expect(close).not.toHaveBeenCalled()
  })
})

// ── onChromeBack delegation ────────────────────────────────────────────────────

describe('DeckSettings — onChromeBack falls through to the default back action', () => {
  test('the active tab has no onChromeBack, so back navigates to the index', async () => {
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    await wrapper.vm.onChromeBack()
    await flushPromises()
    expect(wrapper.vm.active_tab).toBe(null)
  })
})

// ── overlay actions ────────────────────────────────────────────────────────────

describe('DeckSettings — overlay preview forwards side changes only on the design tab', () => {
  test('floating preview click forwards the new side to editor.setActiveSide on the design tab', async () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    await nextTick()

    await wrapper.find('[data-testid="deck-preview-stub"]').trigger('click')

    expect(setActiveSide).toHaveBeenCalledWith('front')
    setActiveSide.mockRestore()
  })

  test('floating preview click is a no-op when not on the design tab', async () => {
    const setActiveSide = vi.spyOn(mockEditor.editor, 'setActiveSide').mockImplementation(() => {})
    const { wrapper } = makeWrapper({ initial_tab: 'review-pacing' })
    await nextTick()

    await wrapper.find('[data-testid="deck-preview-stub"]').trigger('click')

    expect(setActiveSide).not.toHaveBeenCalled()
    setActiveSide.mockRestore()
  })
})

// ── is_full_bleed [obligation] ─────────────────────────────────────────────────

describe('DeckSettings — is_full_bleed is phone-exempt regardless of TAB_META [obligation]', () => {
  test('a full-bleed tab (review-pacing) does not claim full-bleed on phone layout', async () => {
    const { wrapper } = makeWrapper({ initial_tab: 'review-pacing' })
    await setLayout('phone')
    expect(wrapper.vm.is_full_bleed).toBe(false)
  })

  test('the same tab claims full-bleed once the layout is tablet/desktop', async () => {
    const { wrapper } = makeWrapper({ initial_tab: 'review-pacing' })
    await setLayout('desktop')
    expect(wrapper.vm.is_full_bleed).toBe(true)
  })
})

// ── Chrome remount re-snap [obligation] ────────────────────────────────────────
// The preview/aside sit behind v-if on phone layout. Crossing desktop -> phone
// -> desktop while a full-bleed page is displayed must re-apply the tucked
// pose on remount, since the elements come back untucked by default.

describe('DeckSettings — chrome remount re-snap [obligation]', () => {
  test('first mount straight onto a full-bleed page snaps instead of animating', async () => {
    makeWrapper({ initial_tab: 'review-pacing' })
    await nextTick()
    expect(mockChromeSnap).toHaveBeenCalledWith(true)
    expect(mockChromeTuck).not.toHaveBeenCalled()
  })

  test('first mount onto a non-full-bleed page snaps to the untucked pose', async () => {
    makeWrapper({ initial_tab: 'design' })
    await nextTick()
    expect(mockChromeSnap).toHaveBeenCalledWith(false)
  })

  test('remounting the preview/aside while full-bleed re-snaps to tucked (desktop -> phone -> desktop)', async () => {
    makeWrapper({ initial_tab: 'review-pacing' })
    mockChromeSnap.mockClear()

    // Phone unmounts the preview/aside behind v-if.
    await setLayout('phone')
    // Back to desktop remounts them, untucked by default — the watcher must
    // re-apply the tucked pose rather than leaving them exposed.
    await setLayout('desktop')

    expect(mockChromeSnap).toHaveBeenCalledWith(true)
  })

  test('remounting the preview/aside while non-full-bleed re-snaps to untucked (desktop -> phone -> desktop)', async () => {
    makeWrapper({ initial_tab: 'design' })
    mockChromeSnap.mockClear()

    await setLayout('phone')
    await setLayout('desktop')

    expect(mockChromeSnap).toHaveBeenCalledWith(false)
  })
})

// ── between hook wiring (runChromeSync) ───────────────────────────────────────

describe('DeckSettings — between hook drives the chrome tuck/restore', () => {
  test('passes a `between` function to PagedWindow that tucks when moving into review-pacing', async () => {
    const { wrapper } = makeWrapper({ initial_tab: 'design' })
    const pw = wrapper.findComponent({ name: 'PagedWindow' })
    const between = pw.props('between')
    expect(typeof between).toBe('function')

    await wrapper.find('[data-testid="pw__select-review-pacing"]').trigger('click')
    await flushPromises()
    await between()

    expect(mockChromeTuck).toHaveBeenCalledOnce()
  })

  test('between restores the chrome when moving into a non-full-bleed page', async () => {
    const { wrapper } = makeWrapper({ initial_tab: 'review-pacing' })
    const pw = wrapper.findComponent({ name: 'PagedWindow' })
    const between = pw.props('between')

    await wrapper.find('[data-testid="pw__select-design"]').trigger('click')
    await flushPromises()
    await between()

    expect(mockChromeRestore).toHaveBeenCalledOnce()
  })
})

// ── Layout poses across breakpoints ───────────────────────────────────────────

describe('DeckSettings — layout poses across breakpoints', () => {
  test('tablet keeps the aside, scrollbar and preview in their tablet poses', async () => {
    const { wrapper } = makeWrapper()
    await setLayout('tablet')

    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-preview-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-settings__pinned-preview"]').exists()).toBe(true)
  })

  test('phone drops the aside and preview and shows the directory save button', async () => {
    const { wrapper } = makeWrapper()
    await setLayout('phone')

    expect(wrapper.find('[data-testid="deck-settings__aside"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="deck-preview-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="deck-save-button-stub"]').exists()).toBe(true)
  })
})
