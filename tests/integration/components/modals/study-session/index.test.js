import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import StudySession from '@/views/study-session/index.vue'
import { MODAL_ID_KEY, request_close_handlers } from '@/composables/modal'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx, mockEmitStudySfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitStudySfx: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitStudySfx: mockEmitStudySfx,
  emitHoverSfx: vi.fn()
}))

const { mockClearPersistedSession } = vi.hoisted(() => ({
  mockClearPersistedSession: vi.fn()
}))

vi.mock('@/views/study-session/composables/session-persistence', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    clearPersistedSession: mockClearPersistedSession
  }
})

// Deterministic replacement for the real GSAP-driven pane transition — the
// real one delays `onStart` (and the jingle it triggers) by 150ms, which
// `nextFrame`'s 2x rAF never reaches. Mirrors dialog-card-pager.test.js.
const { mockSessionPaneEnter, mockSessionPaneLeave } = vi.hoisted(() => ({
  mockSessionPaneEnter: vi.fn((_el, done, options) => {
    Promise.resolve().then(() => {
      options?.onStart?.()
      done()
    })
  }),
  mockSessionPaneLeave: vi.fn((_el, done) => {
    Promise.resolve().then(() => done())
  })
}))

vi.mock('@/utils/animations/session-pane', () => ({
  sessionPaneEnter: mockSessionPaneEnter,
  sessionPaneLeave: mockSessionPaneLeave
}))

// Mock viewport so provideDialogCardViewport() doesn't hit real matchMedia.
const { mediaState, capturedQueries } = vi.hoisted(() => ({
  mediaState: { is_mobile: { value: false } },
  capturedQueries: []
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn((query) => {
    capturedQueries.push(query)
    return mediaState.is_mobile
  })
}))

// Mock the session controller entirely — index.vue's own responsibility is the
// shell (header slots + phase/page switch), not the FSRS session itself. The
// controller's own orchestration is unit-tested directly elsewhere.
const {
  state_ref,
  results_ref,
  is_cover_ref,
  can_edit_ref,
  active_page_ref,
  summary_category_ref,
  summary_editing_card_ref,
  is_selecting_ref,
  selected_count_ref,
  session_decks_ref,
  mockRequestClose,
  mockStartEdit,
  mockOnMove,
  mockOnDelete,
  mockOpenSettings,
  mockCloseSettings,
  mockOpenSummaryCategory,
  mockCloseSummaryCategory,
  mockStopSummaryEdit,
  mockEnterSelection,
  mockExitSelection,
  mockSelectAllSummaryCards,
  mockOnDeleteSummarySelected,
  mockOnMoveSummarySelected,
  controllerMock,
  capturedControllerOptions
} = await vi.hoisted(async () => {
  const { ref } = await import('vue')

  const state_ref = ref('studying')
  const results_ref = ref([])
  const is_cover_ref = ref(false)
  const can_edit_ref = ref(true)
  const active_page_ref = ref(null)
  const summary_category_ref = ref(null)
  const summary_editing_card_ref = ref(undefined)
  const is_selecting_ref = ref(false)
  const selected_count_ref = ref(0)
  const session_decks_ref = ref([{ id: 1, title: 'My Deck' }])
  const mockRequestClose = vi.fn()
  const mockStartEdit = vi.fn()
  const mockOnMove = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOpenSettings = vi.fn()
  const mockCloseSettings = vi.fn()
  const mockOpenSummaryCategory = vi.fn()
  const mockCloseSummaryCategory = vi.fn()
  const mockStopSummaryEdit = vi.fn()
  const mockEnterSelection = vi.fn()
  const mockExitSelection = vi.fn()
  const mockSelectAllSummaryCards = vi.fn()
  const mockOnDeleteSummarySelected = vi.fn()
  const mockOnMoveSummarySelected = vi.fn()

  const controllerMock = {
    state: state_ref,
    results: results_ref,
    is_cover: is_cover_ref,
    can_edit: can_edit_ref,
    sessionDecks: session_decks_ref,
    active_page: active_page_ref,
    summary_category: summary_category_ref,
    summary_editing_card: summary_editing_card_ref,
    summary_selection: {
      is_selecting: is_selecting_ref,
      selected_count: selected_count_ref,
      all_cards_selected: ref(false),
      enterSelection: mockEnterSelection,
      exitSelection: mockExitSelection,
      clearSelectedCards: vi.fn()
    },
    requestClose: mockRequestClose,
    startEdit: mockStartEdit,
    onMove: mockOnMove,
    onDelete: mockOnDelete,
    openSettings: mockOpenSettings,
    closeSettings: mockCloseSettings,
    openSummaryCategory: mockOpenSummaryCategory,
    closeSummaryCategory: mockCloseSummaryCategory,
    stopSummaryEdit: mockStopSummaryEdit,
    selectAllSummaryCards: mockSelectAllSummaryCards,
    onDeleteSummarySelected: mockOnDeleteSummarySelected,
    onMoveSummarySelected: mockOnMoveSummarySelected
  }

  return {
    state_ref,
    results_ref,
    is_cover_ref,
    can_edit_ref,
    active_page_ref,
    summary_category_ref,
    summary_editing_card_ref,
    is_selecting_ref,
    selected_count_ref,
    session_decks_ref,
    mockRequestClose,
    mockStartEdit,
    mockOnMove,
    mockOnDelete,
    mockOpenSettings,
    mockCloseSettings,
    mockOpenSummaryCategory,
    mockCloseSummaryCategory,
    mockStopSummaryEdit,
    mockEnterSelection,
    mockExitSelection,
    mockSelectAllSummaryCards,
    mockOnDeleteSummarySelected,
    mockOnMoveSummarySelected,
    controllerMock,
    capturedControllerOptions: { current: null }
  }
})

vi.mock('@/views/study-session/composables/session-controller', () => ({
  provideStudySessionController: (options) => {
    capturedControllerOptions.current = options
    return controllerMock
  },
  useInjectedStudySessionController: () => controllerMock
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const SessionStudyingStub = defineComponent({
  name: 'SessionStudying',
  setup() {
    return () => h('div', { 'data-testid': 'session-studying-stub' })
  }
})

const SessionSummaryStub = defineComponent({
  name: 'SessionSummary',
  props: ['results'],
  emits: ['open-category'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'session-summary-stub' }, [
        h('button', {
          'data-testid': 'summary-open-category-btn',
          onClick: () => emit('open-category', 'stuck')
        })
      ])
  }
})

const SessionSummaryCategoryStub = defineComponent({
  name: 'SessionSummaryCategory',
  props: ['results', 'category'],
  setup() {
    return () => h('div', { 'data-testid': 'session-summary-category-stub' })
  }
})

const SessionSettingsStub = defineComponent({
  name: 'SessionSettings',
  setup() {
    return () => h('div', { 'data-testid': 'session-settings-stub' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_MODAL_ID = 'study-session-modal'

function makeWrapper({ close = vi.fn(), deck_ids = [1] } = {}) {
  return {
    close,
    deck_ids,
    wrapper: mount(StudySession, {
      props: { deck_ids, close },
      global: {
        stubs: {
          SessionStudying: SessionStudyingStub,
          SessionSummary: SessionSummaryStub,
          SessionSummaryCategory: SessionSummaryCategoryStub,
          SessionSettings: SessionSettingsStub
        },
        provide: {
          [MODAL_ID_KEY]: TEST_MODAL_ID
        }
      },
      attachTo: document.body
    })
  }
}

// Vue Transition JS hooks use 2x rAF even with :css="false".
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

/** Simulates the engine reaching "summary" — the shell's own transition into the summary phase. */
async function finishSession(results = []) {
  results_ref.value = results
  state_ref.value = 'summary'
  await nextTick()
  await nextFrame()
}

/** Simulates the controller opening the settings page. */
async function openSettingsPage() {
  active_page_ref.value = 'settings'
  await nextTick()
  await nextFrame()
}

/** Simulates the controller opening a summary category page. */
async function openCategoryPage(category = 'stuck') {
  summary_category_ref.value = category
  await nextTick()
  await nextFrame()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StudySession (index.vue)', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockEmitStudySfx.mockClear()
    mockClearPersistedSession.mockClear()
    mockRequestClose.mockClear()
    mockStartEdit.mockClear()
    mockOnMove.mockClear()
    mockOnDelete.mockClear()
    mockOpenSettings.mockClear()
    mockCloseSettings.mockClear()
    mockOpenSummaryCategory.mockClear()
    mockCloseSummaryCategory.mockClear()
    mockStopSummaryEdit.mockClear()
    mockEnterSelection.mockClear()
    mockExitSelection.mockClear()
    mockSelectAllSummaryCards.mockClear()
    mockOnDeleteSummarySelected.mockClear()
    mockOnMoveSummarySelected.mockClear()
    state_ref.value = 'studying'
    results_ref.value = []
    is_cover_ref.value = false
    can_edit_ref.value = true
    active_page_ref.value = null
    summary_category_ref.value = null
    summary_editing_card_ref.value = undefined
    is_selecting_ref.value = false
    selected_count_ref.value = 0
    session_decks_ref.value = [{ id: 1, title: 'My Deck' }]
    capturedControllerOptions.current = null
    mediaState.is_mobile.value = false
    capturedQueries.length = 0
    request_close_handlers.clear()
  })

  // ── Initial phase: studying ────────────────────────────────────────────────

  test('renders session-studying in studying phase', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="session-studying-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="session-settings-stub"]').exists()).toBe(false)
  })

  // ── deck_ids wiring [obligation] ────────────────────────────────────────────

  test('passes the deck_ids prop straight through to provideStudySessionController [obligation]', () => {
    makeWrapper({ deck_ids: [4, 5] })
    expect(capturedControllerOptions.current.deck_ids).toEqual([4, 5])
  })

  // ── nav_mode: close vs stop vs back [obligation] ───────────────────────────

  describe('header-start nav_mode [obligation]', () => {
    test('renders "close" when is_cover is true (studying phase) [obligation]', () => {
      is_cover_ref.value = true
      const { wrapper } = makeWrapper()
      expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(true)
    })

    test('renders "stop" when not is_cover during studying [obligation]', () => {
      is_cover_ref.value = false
      const { wrapper } = makeWrapper()
      expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(true)
    })

    test('renders "close" during the summary phase, regardless of is_cover [obligation]', async () => {
      is_cover_ref.value = false
      const { wrapper } = makeWrapper()

      await finishSession([])

      expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(true)
    })

    test('renders "back" while the settings page is active, even mid-cover [obligation]', async () => {
      is_cover_ref.value = true
      const { wrapper } = makeWrapper()

      await openSettingsPage()

      expect(wrapper.find('[data-testid="session-header__back"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(false)
    })

    test('renders "back" while a summary category page is open [obligation]', async () => {
      const { wrapper } = makeWrapper()
      await finishSession([])
      await openCategoryPage()

      expect(wrapper.find('[data-testid="session-header__back"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(false)
    })
  })

  // ── header-end menu: only during studying, never on settings [obligation] ──

  test('header-end (menu) renders during the studying phase [obligation]', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(true)
  })

  test('header-end (menu) is absent during the summary phase [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await finishSession([])
    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(false)
  })

  test('header-end (menu) is absent while the settings page is active [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await openSettingsPage()
    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(false)
  })

  // ── header-end menu delegates to the controller ────────────────────────────

  test('menu edit/move/delete/settings delegate to the controller', async () => {
    const { wrapper } = makeWrapper()

    const menu = wrapper.findComponent({ name: 'SessionHeaderMenu' })
    menu.vm.$emit('edit')
    menu.vm.$emit('move')
    menu.vm.$emit('delete')
    menu.vm.$emit('settings')

    expect(mockStartEdit).toHaveBeenCalledOnce()
    expect(mockOnMove).toHaveBeenCalledOnce()
    expect(mockOnDelete).toHaveBeenCalledOnce()
    expect(mockOpenSettings).toHaveBeenCalledOnce()
  })

  // ── header-end select button: category page only [obligation] ─────────────

  describe('header-end select button [obligation]', () => {
    test('is absent during studying and on the summary landing page [obligation]', async () => {
      const { wrapper } = makeWrapper()
      expect(wrapper.find('[data-testid="session-summary__select-button"]').exists()).toBe(false)

      await finishSession([])
      expect(wrapper.find('[data-testid="session-summary__select-button"]').exists()).toBe(false)
    })

    test('renders on a summary category page [obligation]', async () => {
      const { wrapper } = makeWrapper()
      await finishSession([])
      await openCategoryPage()

      expect(wrapper.find('[data-testid="session-summary__select-button"]').exists()).toBe(true)
    })

    test('is absent on a category page while its card editor is open [obligation]', async () => {
      const { wrapper } = makeWrapper()
      await finishSession([])
      await openCategoryPage()
      summary_editing_card_ref.value = { id: 1, deck_id: 1 }
      await nextTick()

      expect(wrapper.find('[data-testid="session-summary__select-button"]').exists()).toBe(false)
    })

    test('pressing it calls enterSelection when not already selecting [obligation]', async () => {
      const { wrapper } = makeWrapper()
      await finishSession([])
      await openCategoryPage()

      await wrapper.find('[data-testid="session-summary__select-button"]').trigger('click')

      expect(mockEnterSelection).toHaveBeenCalledOnce()
      expect(mockExitSelection).not.toHaveBeenCalled()
    })

    test('pressing it calls exitSelection while already selecting [obligation]', async () => {
      const { wrapper } = makeWrapper()
      await finishSession([])
      await openCategoryPage()
      is_selecting_ref.value = true
      await nextTick()

      await wrapper.find('[data-testid="session-summary__select-button"]').trigger('click')

      expect(mockExitSelection).toHaveBeenCalledOnce()
      expect(mockEnterSelection).not.toHaveBeenCalled()
    })
  })

  // ── toolbar bulk-actions bar: category page while selecting [obligation] ──

  describe('toolbar bulk-actions bar [obligation]', () => {
    test('is absent on a category page while not selecting [obligation]', async () => {
      const { wrapper } = makeWrapper()
      await finishSession([])
      await openCategoryPage()

      expect(wrapper.find('[data-testid="session-summary__bulk-actions"]').exists()).toBe(false)
    })

    test('renders on a category page while selecting [obligation]', async () => {
      const { wrapper } = makeWrapper()
      await finishSession([])
      await openCategoryPage()
      is_selecting_ref.value = true
      await nextTick()

      expect(wrapper.find('[data-testid="session-summary__bulk-actions"]').exists()).toBe(true)
    })

    test('is absent on the summary landing page even while selecting [obligation]', async () => {
      const { wrapper } = makeWrapper()
      await finishSession([])
      is_selecting_ref.value = true
      await nextTick()

      expect(wrapper.find('[data-testid="session-summary__bulk-actions"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="session-summary__close"]').exists()).toBe(true)
    })
  })

  // ── onHeaderStop is page/phase-aware [obligation] ──────────────────────────

  describe('onHeaderStop: settings/category back vs phase-aware close/stop [obligation]', () => {
    test('while on the settings page, the back button calls closeSettings — not requestClose/onClosed [obligation]', async () => {
      const { wrapper, close } = makeWrapper()
      await openSettingsPage()

      await wrapper.find('[data-testid="session-header__back"]').trigger('click')

      expect(mockCloseSettings).toHaveBeenCalledOnce()
      expect(mockRequestClose).not.toHaveBeenCalled()
      expect(close).not.toHaveBeenCalled()
    })

    test('while a summary category page is open, the back button calls closeSummaryCategory [obligation]', async () => {
      const { wrapper, close } = makeWrapper()
      await finishSession([])
      await openCategoryPage()

      await wrapper.find('[data-testid="session-header__back"]').trigger('click')

      expect(mockCloseSummaryCategory).toHaveBeenCalledOnce()
      expect(mockRequestClose).not.toHaveBeenCalled()
      expect(close).not.toHaveBeenCalled()
    })

    test('while a summary card editor is open, the back button calls stopSummaryEdit — not closeSummaryCategory [obligation]', async () => {
      const { wrapper, close } = makeWrapper()
      await finishSession([])
      await openCategoryPage()
      summary_editing_card_ref.value = { id: 1, deck_id: 1 }
      await nextTick()

      await wrapper.find('[data-testid="session-header__back"]').trigger('click')

      expect(mockStopSummaryEdit).toHaveBeenCalledOnce()
      expect(mockCloseSummaryCategory).not.toHaveBeenCalled()
      expect(close).not.toHaveBeenCalled()
    })

    test('during studying, the stop button calls the controller requestClose(), not onClosed directly [obligation]', async () => {
      const { wrapper, close } = makeWrapper()

      await wrapper.find('[data-testid="session-header__stop"]').trigger('click')

      expect(mockRequestClose).toHaveBeenCalledOnce()
      expect(mockClearPersistedSession).not.toHaveBeenCalled()
      expect(close).not.toHaveBeenCalled()
    })

    test('during summary, the close button calls onClosed() directly — sfx, clear persisted session, close() [obligation]', async () => {
      const { wrapper, close } = makeWrapper()
      await finishSession([])

      await wrapper.find('[data-testid="session-header__close"]').trigger('click')

      expect(mockRequestClose).not.toHaveBeenCalled()
      expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
      expect(mockClearPersistedSession).toHaveBeenCalledOnce()
      expect(close).toHaveBeenCalledOnce()
    })
  })

  // ── useModalRequestClose (backdrop/esc) — settings/category-aware [obligation] ─

  describe('useModalRequestClose (backdrop/esc) [obligation]', () => {
    test('on the settings page while still on the cover, backdrop/esc dismisses the session (onClosed) [obligation]', async () => {
      is_cover_ref.value = true
      const { close } = makeWrapper()
      await openSettingsPage()

      request_close_handlers.get(TEST_MODAL_ID)()

      expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
      expect(mockClearPersistedSession).toHaveBeenCalledOnce()
      expect(close).toHaveBeenCalledOnce()
      expect(mockCloseSettings).not.toHaveBeenCalled()
    })

    test('on the settings page mid-session (not cover), backdrop/esc returns to the session (closeSettings) [obligation]', async () => {
      is_cover_ref.value = false
      const { close } = makeWrapper()
      await openSettingsPage()

      request_close_handlers.get(TEST_MODAL_ID)()

      expect(mockCloseSettings).toHaveBeenCalledOnce()
      expect(close).not.toHaveBeenCalled()
    })

    test('with a summary category page open, backdrop/esc returns to the summary stats list (closeSummaryCategory) [obligation]', async () => {
      const { close } = makeWrapper()
      await finishSession([])
      await openCategoryPage()

      request_close_handlers.get(TEST_MODAL_ID)()

      expect(mockCloseSummaryCategory).toHaveBeenCalledOnce()
      expect(mockRequestClose).not.toHaveBeenCalled()
      expect(close).not.toHaveBeenCalled()
    })

    test('with a summary card editor open, backdrop/esc returns to the category page (stopSummaryEdit) — not closeSummaryCategory [obligation]', async () => {
      const { close } = makeWrapper()
      await finishSession([])
      await openCategoryPage()
      summary_editing_card_ref.value = { id: 1, deck_id: 1 }
      await nextTick()

      request_close_handlers.get(TEST_MODAL_ID)()

      expect(mockStopSummaryEdit).toHaveBeenCalledOnce()
      expect(mockCloseSummaryCategory).not.toHaveBeenCalled()
      expect(close).not.toHaveBeenCalled()
    })

    test('during studying (no settings page), esc/backdrop calls the controller requestClose() [obligation]', () => {
      const { close } = makeWrapper()

      request_close_handlers.get(TEST_MODAL_ID)()

      expect(mockRequestClose).toHaveBeenCalledOnce()
      expect(close).not.toHaveBeenCalled()
    })

    test('during summary, esc/backdrop calls onClosed() — sfx + clearPersistedSession + close() [obligation]', async () => {
      const { close } = makeWrapper()
      await finishSession([])

      request_close_handlers.get(TEST_MODAL_ID)()

      expect(mockRequestClose).not.toHaveBeenCalled()
      expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
      expect(mockClearPersistedSession).toHaveBeenCalledOnce()
      expect(close).toHaveBeenCalledOnce()
    })
  })

  // ── current_page: settings/category takes precedence over phase [obligation] ─

  test('current_page renders the settings pane when active_page is "settings", regardless of phase [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await openSettingsPage()

    expect(wrapper.find('[data-testid="session-settings-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-studying-stub"]').exists()).toBe(false)
  })

  test('current_page renders the summary-category pane when summary_category is set [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await finishSession([])
    await openCategoryPage('new')

    expect(wrapper.find('[data-testid="session-summary-category-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(false)
  })

  test('state === "summary" switches phase to summary [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await finishSession([])

    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-studying-stub"]').exists()).toBe(false)
  })

  test('state === "loading" still renders the studying pane, not summary [obligation]', async () => {
    state_ref.value = 'loading'
    const { wrapper } = makeWrapper()
    await nextTick()

    expect(wrapper.find('[data-testid="session-studying-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(false)
  })

  test('state === "cover" still renders the studying pane, not summary [obligation]', async () => {
    state_ref.value = 'cover'
    const { wrapper } = makeWrapper()
    await nextTick()

    expect(wrapper.find('[data-testid="session-studying-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(false)
  })

  test('controller results are forwarded to session-summary [obligation]', async () => {
    const { wrapper } = makeWrapper()
    const results = [{ card_id: 1, passed: true }]

    await finishSession(results)

    expect(wrapper.findComponent({ name: 'SessionSummary' }).props('results')).toEqual(results)
  })

  test('controller results and the opened category are forwarded to session-summary-category [obligation]', async () => {
    const { wrapper } = makeWrapper()
    const results = [{ card_id: 1, passed: false }]

    await finishSession(results)
    await openCategoryPage('stuck')

    const category_page = wrapper.findComponent({ name: 'SessionSummaryCategory' })
    expect(category_page.props('results')).toEqual(results)
    expect(category_page.props('category')).toBe('stuck')
  })

  // ── summary open-category forwards to the controller [obligation] ─────────

  test('summary open-category event calls the controller openSummaryCategory [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await finishSession([])
    await wrapper.find('[data-testid="summary-open-category-btn"]').trigger('click')

    expect(mockOpenSummaryCategory).toHaveBeenCalledWith('stuck')
  })

  // ── Toolbar close button [obligation] ──────────────────────────────────────
  // The close button lives in study-session/index.vue's #toolbar now — moved
  // out of session-summary/index.vue, which no longer emits close.

  test('renders a toolbar close button only on the summary stats page, not on a category page [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await finishSession([])

    expect(wrapper.find('[data-testid="session-summary__close"]').exists()).toBe(true)

    await openCategoryPage()
    expect(wrapper.find('[data-testid="session-summary__close"]').exists()).toBe(false)
  })

  test('the toolbar close button calls onClosed (sfx + clear + close) [obligation]', async () => {
    const { wrapper, close } = makeWrapper()

    await finishSession([])
    await wrapper.find('[data-testid="session-summary__close"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
    expect(mockClearPersistedSession).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
  })

  // ── Title computation: settings vs category vs single-deck vs multi-deck ──

  test('title is the settings i18n key while the settings page is active [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await openSettingsPage()

    const title = wrapper.find('[data-testid="dialog-card-header__title"]').text()
    expect(title.length).toBeGreaterThan(0)
    expect(title).not.toBe('My Deck')
  })

  test('title is the category-specific i18n key while a summary category page is open [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await finishSession([])
    await openCategoryPage('stuck')

    const title = wrapper.find('[data-testid="dialog-card-header__title"]').text()
    expect(title.length).toBeGreaterThan(0)
    expect(title).not.toBe('My Deck')
  })

  test('title equals sessionDecks[0].title when exactly one session deck is resolved [obligation]', () => {
    session_decks_ref.value = [{ id: 1, title: 'My Deck' }]
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('My Deck')
  })

  test('title is the multiple-decks i18n key when more than one session deck is resolved [obligation]', () => {
    session_decks_ref.value = [
      { id: 1, title: 'Deck One' },
      { id: 2, title: 'Deck Two' }
    ]
    const { wrapper } = makeWrapper({ deck_ids: [1, 2] })

    const title = wrapper.find('[data-testid="dialog-card-header__title"]').text()
    expect(title).not.toBe('Deck One')
    expect(title).not.toBe('Deck Two')
    expect(title.length).toBeGreaterThan(0)
  })

  test('falls back to the multiple-decks i18n key before any session deck has resolved [obligation]', () => {
    session_decks_ref.value = []
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('Multiple Decks')
  })

  // ── dialog-card size="lg" sources full_bleed_at="w<sm | h<md" ──────────────

  test('size="lg" resolves full_bleed_at to "w<sm | h<md"', () => {
    makeWrapper()
    expect(capturedQueries).toContain('w<sm | h<md')
    expect(capturedQueries).not.toContain('w<sm | h<sm')
  })

  // ── emitStudySfx fires in pane enter's onStart, not at phase-flip [obligation] ─

  test('music_pizz_duo_hi sfx is NOT emitted directly when state flips to summary [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await finishSession([])

    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(true)
    expect(mockEmitStudySfx).not.toHaveBeenCalledWith('music_pizz_duo_hi')
  })

  // ── Jingle fires only on first summary entry [obligation] ─────────────────
  // The pager's own enter/leave hooks run through real GSAP-backed animation
  // helpers with a wall-clock delay — instead of waiting it out, drive the
  // pager's `enter-start` event directly (the same event onPaneEnterStart
  // wires up to) and assert the sfx it dispatches per page/summary_seen.

  test('the pager is not instant on the first arrival at the summary, and enter-start plays the jingle [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await finishSession([])

    const pager = wrapper.findComponent({ name: 'DialogCardPager' })
    expect(pager.props('instant')).toBe(false)

    pager.vm.$emit('enter-start')
    expect(mockEmitSfx).toHaveBeenCalledWith('music_pizz_duo_hi')
  })

  test('returning to the summary from a category page is instant and enter-start plays the light click, not the jingle again [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await finishSession([])

    // First arrival — stamps summary_seen.
    wrapper.findComponent({ name: 'DialogCardPager' }).vm.$emit('enter-start')
    mockEmitSfx.mockClear()

    await openCategoryPage()
    mockEmitSfx.mockClear()

    summary_category_ref.value = null
    await nextTick()
    await nextFrame()

    const pager = wrapper.findComponent({ name: 'DialogCardPager' })
    expect(pager.props('instant')).toBe(true)

    pager.vm.$emit('enter-start')
    expect(mockEmitSfx).not.toHaveBeenCalledWith('music_pizz_duo_hi')
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_2')
  })

  // ── regression: outlet must not clip the swipe/drag animation ──────────────

  test('study-session__outlet does not carry overflow-hidden', () => {
    const { wrapper } = makeWrapper()
    const classes = wrapper.find('[data-testid="study-session__outlet"]').classes()
    expect(classes).not.toContain('overflow-hidden')
  })
})
