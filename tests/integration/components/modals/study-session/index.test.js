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
  session_decks_ref,
  mockRequestClose,
  mockStartEdit,
  mockOnMove,
  mockOnDelete,
  mockOpenSettings,
  mockCloseSettings,
  capturedControllerOptions
} = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    state_ref: ref('studying'),
    results_ref: ref([]),
    is_cover_ref: ref(false),
    can_edit_ref: ref(true),
    active_page_ref: ref(null),
    session_decks_ref: ref([{ id: 1, title: 'My Deck' }]),
    mockRequestClose: vi.fn(),
    mockStartEdit: vi.fn(),
    mockOnMove: vi.fn(),
    mockOnDelete: vi.fn(),
    mockOpenSettings: vi.fn(),
    mockCloseSettings: vi.fn(),
    capturedControllerOptions: { current: null }
  }
})

vi.mock('@/views/study-session/composables/session-controller', () => ({
  provideStudySessionController: (options) => {
    capturedControllerOptions.current = options
    return {
      state: state_ref,
      results: results_ref,
      is_cover: is_cover_ref,
      can_edit: can_edit_ref,
      sessionDecks: session_decks_ref,
      active_page: active_page_ref,
      requestClose: mockRequestClose,
      startEdit: mockStartEdit,
      onMove: mockOnMove,
      onDelete: mockOnDelete,
      openSettings: mockOpenSettings,
      closeSettings: mockCloseSettings
    }
  },
  useInjectedStudySessionController: vi.fn()
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
  emits: ['close'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'session-summary-stub' }, [
        h('button', { 'data-testid': 'summary-close-btn', onClick: () => emit('close') })
      ])
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
    state_ref.value = 'studying'
    results_ref.value = []
    is_cover_ref.value = false
    can_edit_ref.value = true
    active_page_ref.value = null
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

  // ── onHeaderStop is page/phase-aware [obligation] ──────────────────────────

  describe('onHeaderStop: settings back vs phase-aware close/stop [obligation]', () => {
    test('while on the settings page, the back button calls closeSettings — not requestClose/onClosed [obligation]', async () => {
      const { wrapper, close } = makeWrapper()
      await openSettingsPage()

      await wrapper.find('[data-testid="session-header__back"]').trigger('click')

      expect(mockCloseSettings).toHaveBeenCalledOnce()
      expect(mockRequestClose).not.toHaveBeenCalled()
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

  // ── useModalRequestClose (backdrop/esc) — settings-aware [obligation] ─────

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

  // ── current_page: settings takes precedence over phase [obligation] ───────

  test('current_page renders the settings pane when active_page is "settings", regardless of phase [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await openSettingsPage()

    expect(wrapper.find('[data-testid="session-settings-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-studying-stub"]').exists()).toBe(false)
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

  // ── summary @close forwards to onClosed → close() [obligation] ────────────

  test('summary @close event calls onClosed (sfx + clear + close) [obligation]', async () => {
    const { wrapper, close } = makeWrapper()

    await finishSession([])
    await wrapper.find('[data-testid="summary-close-btn"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_close')
    expect(mockClearPersistedSession).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
  })

  // ── Title computation: settings vs single-deck vs multi-deck [obligation] ─

  test('title is the settings i18n key while the settings page is active [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await openSettingsPage()

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

  // ── regression: outlet must not clip the swipe/drag animation ──────────────

  test('study-session__outlet does not carry overflow-hidden', () => {
    const { wrapper } = makeWrapper()
    const classes = wrapper.find('[data-testid="study-session__outlet"]').classes()
    expect(classes).not.toContain('overflow-hidden')
  })
})
