import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import StudySession from '@/views/study-session/index.vue'
import { MODAL_ID_KEY, request_close_handlers } from '@/composables/modal'
import { deck } from '../../../../fixtures/deck'

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

// Pane animation hooks — call done() immediately so transitions complete synchronously.
const { mockSessionPaneEnter, mockSessionPaneLeave } = vi.hoisted(() => ({
  mockSessionPaneEnter: vi.fn((_el, done, onStart) => {
    onStart?.()
    done()
  }),
  mockSessionPaneLeave: vi.fn((_el, done) => done())
}))

vi.mock('@/utils/animations/session-pane', () => ({
  sessionPaneLeave: mockSessionPaneLeave,
  sessionPaneEnter: mockSessionPaneEnter
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
// shell (header slots + phase switch), not the FSRS session itself. The
// controller's own orchestration (requestClose / finishSession / onCardReviewed)
// is unit-tested directly in session-controller.test.js.
const {
  is_cover_ref,
  can_edit_ref,
  show_all_ratings_ref,
  mockRequestClose,
  mockStartEdit,
  mockOnMove,
  mockOnDelete,
  mockToggleRatings,
  capturedControllerOptions
} = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    is_cover_ref: ref(false),
    can_edit_ref: ref(true),
    show_all_ratings_ref: ref(false),
    mockRequestClose: vi.fn(),
    mockStartEdit: vi.fn(),
    mockOnMove: vi.fn(),
    mockOnDelete: vi.fn(),
    mockToggleRatings: vi.fn(),
    capturedControllerOptions: { current: null }
  }
})

vi.mock('@/views/study-session/composables/session-controller', () => ({
  provideStudySessionController: (options) => {
    capturedControllerOptions.current = options
    return {
      is_cover: is_cover_ref,
      can_edit: can_edit_ref,
      show_all_ratings: show_all_ratings_ref,
      requestClose: mockRequestClose,
      startEdit: mockStartEdit,
      onMove: mockOnMove,
      onDelete: mockOnDelete,
      toggleRatings: mockToggleRatings
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
  props: ['results', 'leech_threshold'],
  emits: ['close'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'session-summary-stub' }, [
        h('button', { 'data-testid': 'summary-close-btn', onClick: () => emit('close') })
      ])
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_MODAL_ID = 'study-session-modal'

function makeWrapper({ close = vi.fn(), decks_override } = {}) {
  const deck_data = deck.one({ overrides: { id: 1, title: 'My Deck' } })
  const decks = decks_override ?? [deck_data]
  return {
    close,
    deck_data,
    decks,
    wrapper: mount(StudySession, {
      props: { decks, close },
      global: {
        stubs: {
          SessionStudying: SessionStudyingStub,
          SessionSummary: SessionSummaryStub
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

/** Simulates the controller calling onFinished — the shell's own transition into summary. */
async function finishSession(results = []) {
  capturedControllerOptions.current.onFinished(results)
  await nextTick()
  await nextFrame()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StudySession (index.vue)', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockEmitStudySfx.mockClear()
    mockSessionPaneEnter.mockClear()
    mockSessionPaneLeave.mockClear()
    mockClearPersistedSession.mockClear()
    mockRequestClose.mockClear()
    mockStartEdit.mockClear()
    mockOnMove.mockClear()
    mockOnDelete.mockClear()
    mockToggleRatings.mockClear()
    is_cover_ref.value = false
    can_edit_ref.value = true
    show_all_ratings_ref.value = false
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
  })

  // ── header-start close button: is_cover wiring [obligation] ────────────────

  test('header-start renders the close-button variant (is_cover=true) when the controller reports is_cover [obligation]', () => {
    is_cover_ref.value = true
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(false)
  })

  test('header-start renders the stop-button variant (is_cover=false) during studying when the controller reports not-cover [obligation]', () => {
    is_cover_ref.value = false
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(false)
  })

  test('header-start renders the close-button variant during the summary phase, regardless of the controller is_cover value [obligation]', async () => {
    is_cover_ref.value = false
    const { wrapper } = makeWrapper()

    await finishSession([])

    expect(wrapper.find('[data-testid="session-header__close"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-header__stop"]').exists()).toBe(false)
  })

  // ── header-end menu: only during studying [obligation] ─────────────────────

  test('header-end (menu) renders during the studying phase [obligation]', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(true)
  })

  test('header-end (menu) is absent during the summary phase [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await finishSession([])

    expect(wrapper.find('[data-testid="session-header__menu"]').exists()).toBe(false)
  })

  // ── header-end menu delegates to the controller ────────────────────────────

  test('menu edit/move/delete/toggle-ratings delegate to the controller', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="session-header__menu"]').trigger('click')
    // The dropdown itself is exercised in session-header-menu.test.js; here we
    // only need the wiring, so invoke the component's emitted handlers directly.
    const menu = wrapper.findComponent({ name: 'SessionHeaderMenu' })
    menu.vm.$emit('edit')
    menu.vm.$emit('move')
    menu.vm.$emit('delete')
    menu.vm.$emit('toggle-ratings')

    expect(mockStartEdit).toHaveBeenCalledOnce()
    expect(mockOnMove).toHaveBeenCalledOnce()
    expect(mockOnDelete).toHaveBeenCalledOnce()
    expect(mockToggleRatings).toHaveBeenCalledOnce()
  })

  // ── onHeaderStop is phase-aware [obligation] ────────────────────────────────

  describe('onHeaderStop: phase-aware close-button handler [obligation]', () => {
    test('during studying, the close/stop button calls the controller requestClose(), not onClosed directly [obligation]', async () => {
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
      expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
      expect(mockClearPersistedSession).toHaveBeenCalledOnce()
      expect(close).toHaveBeenCalledOnce()
    })
  })

  // ── useModalRequestClose (backdrop/esc) routes through onHeaderStop, phase-aware [obligation] ─
  // Regression: before this refactor, useModalRequestClose only lived on the now-deleted
  // flashcard/index.vue, so esc/backdrop during the summary phase fell through to a raw
  // modal-stack pop() that skipped cleanup entirely. It's now registered at the shell level
  // for the whole session lifetime, so both phases route through onHeaderStop.

  describe('useModalRequestClose (backdrop/esc) [obligation]', () => {
    test('during studying, esc/backdrop calls the controller requestClose() [obligation]', () => {
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
      expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
      expect(mockClearPersistedSession).toHaveBeenCalledOnce()
      expect(close).toHaveBeenCalledOnce()
    })
  })

  // ── onSessionFinished: switches to summary phase [obligation] ──────────────

  test('controller onFinished switches phase to summary [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await finishSession([])

    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-studying-stub"]').exists()).toBe(false)
  })

  test('controller onFinished forwards the session results to session-summary [obligation]', async () => {
    const { wrapper } = makeWrapper()
    const results = [{ card_id: 1, passed: true }]

    await finishSession(results)

    expect(wrapper.findComponent({ name: 'SessionSummary' }).props('results')).toEqual(results)
  })

  // ── leech_threshold prop threading [obligation] ─────────────────────────────

  test('passes decks[0].leech_threshold as the session-summary leech_threshold prop [obligation]', async () => {
    const deck_data = deck.one({ overrides: { id: 1, title: 'My Deck', leech_threshold: 12 } })
    const { wrapper } = makeWrapper({ decks_override: [deck_data] })

    await finishSession([])

    expect(wrapper.findComponent({ name: 'SessionSummary' }).props('leech_threshold')).toBe(12)
  })

  test('falls back to DEFAULT_LEECH_THRESHOLD (8) when decks[0].leech_threshold is nullish [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await finishSession([])

    expect(wrapper.findComponent({ name: 'SessionSummary' }).props('leech_threshold')).toBe(8)
  })

  // ── summary @close forwards to onClosed → close() [obligation] ────────────

  test('summary @close event calls onClosed (sfx + clear + close) [obligation]', async () => {
    const { wrapper, close } = makeWrapper()

    await finishSession([])
    await wrapper.find('[data-testid="summary-close-btn"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
    expect(mockClearPersistedSession).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
  })

  // ── Title computation: single deck vs multi-deck ───────────────────────────

  test('title equals the deck title when exactly one deck is passed', () => {
    const deck1 = deck.one({ overrides: { id: 1, title: 'My Deck' } })
    const { wrapper } = makeWrapper({ decks_override: [deck1] })
    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('My Deck')
  })

  test('title is the multiple-decks i18n key when more than one deck passed', () => {
    const deck1 = deck.one({ overrides: { id: 1, title: 'Deck One' } })
    const deck2 = deck.one({ overrides: { id: 2, title: 'Deck Two' } })
    const { wrapper } = makeWrapper({ decks_override: [deck1, deck2] })

    const title = wrapper.find('[data-testid="dialog-card-header__title"]').text()
    expect(title).not.toBe('Deck One')
    expect(title).not.toBe('Deck Two')
    expect(title.length).toBeGreaterThan(0)
  })

  // ── dialog-card size="lg" sources full_bleed_at="w<sm | h<md" ──────────────

  test('size="lg" resolves full_bleed_at to "w<sm | h<md"', () => {
    makeWrapper()
    expect(capturedQueries).toContain('w<sm | h<md')
    expect(capturedQueries).not.toContain('w<sm | h<sm')
  })

  // ── emitStudySfx fires in pane enter's onStart, not at phase-flip [obligation] ─
  // The onPaneEnter → sessionPaneEnter(onStart→sfx) coupling is tested at the
  // unit level in tests/unit/utils/animations/session-pane.test.js. Here we
  // verify the integration-level invariant: sfx is NOT called directly inside
  // onSessionFinished itself (i.e. not at phase-flip time) — it only fires via
  // the pane's enter-hook onStart callback.
  test('music_pizz_duo_hi sfx is NOT emitted directly in onSessionFinished [obligation]', async () => {
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
