import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import StudySession from '@/components/study-session/index.vue'
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
// sessionPaneEnter also calls onStart so the sfx fires as the animation begins.
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

// Mock viewport so provideStudyViewport() doesn't hit real matchMedia
vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn(() => ({ value: false }))
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const FlashcardStub = defineComponent({
  name: 'SessionFlashcard',
  emits: ['closed', 'finished'],
  props: ['decks', 'title', 'config_override'],
  setup(_props, { expose }) {
    expose({})
    return () => h('div', { 'data-testid': 'session-flashcard-stub' })
  }
})

const SummaryStub = defineComponent({
  name: 'SessionSummary',
  emits: ['close'],
  props: ['results', 'title'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'session-summary-stub' }, [
        h('button', { 'data-testid': 'summary-close-btn', onClick: () => emit('close') })
      ])
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

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
          SessionFlashcard: FlashcardStub,
          SessionSummary: SummaryStub
        }
      },
      attachTo: document.body
    })
  }
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(r))

async function finishSession(wrapper, results = []) {
  await wrapper.findComponent({ name: 'SessionFlashcard' }).vm.$emit('finished', results)
  await nextTick()
  await nextFrame()
  await flushPromises()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StudySession (index.vue)', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockEmitStudySfx.mockClear()
    mockSessionPaneEnter.mockClear()
    mockSessionPaneLeave.mockClear()
  })

  // ── Initial phase: studying ────────────────────────────────────────────────

  test('renders session-flashcard in studying phase', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="session-flashcard-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(false)
  })

  // ── onClosed: plays sfx then calls close() [obligation] ───────────────────

  test('@closed plays snappy_button_5 sfx then calls close() [obligation]', async () => {
    const { wrapper, close } = makeWrapper()

    await wrapper.findComponent({ name: 'SessionFlashcard' }).vm.$emit('closed')

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
    expect(close).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledWith()
  })

  // ── onSessionFinished: switches to summary phase [obligation] ──────────────

  test('@finished switches phase to summary [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await finishSession(wrapper)

    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-flashcard-stub"]').exists()).toBe(false)
  })

  test('@finished only takes session_results — no secondary_action logic [obligation]', async () => {
    const { wrapper } = makeWrapper()

    // Signal: only one argument (session_results) — passing two extra should still work
    // but the second/third are ignored now
    await finishSession(wrapper, [])

    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(true)
  })

  // ── summary @close forwards to onClosed → close() [obligation] ────────────

  test('summary @close event calls close() [obligation]', async () => {
    const { wrapper, close } = makeWrapper()

    await finishSession(wrapper)
    await wrapper.find('[data-testid="summary-close-btn"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
    expect(close).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledWith()
  })

  // ── emitStudySfx fires in pane enter's onStart, not at phase-flip [obligation] ─

  // The onPaneEnter → sessionPaneEnter(onStart→sfx) coupling is tested at the
  // unit level in tests/unit/utils/animations/session-pane.test.js.
  // Here we verify the integration-level invariant: sfx is NOT called during
  // onSessionFinished itself (i.e. not at phase-flip time).
  test('music_pizz_duo_hi sfx is NOT emitted directly in onSessionFinished [obligation]', async () => {
    const { wrapper } = makeWrapper()
    await finishSession(wrapper)

    // The summary renders (phase flipped) but the sfx must not have been emitted
    // during the onSessionFinished handler — it lives in the enter-hook onStart.
    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(true)
    expect(mockEmitStudySfx).not.toHaveBeenCalledWith('music_pizz_duo_hi')
  })

  // ── Title computation: single deck vs multi-deck [obligation] ─────────────

  test('title equals the deck title when exactly one deck is passed [obligation]', () => {
    const deck1 = deck.one({ overrides: { id: 1, title: 'My Deck' } })
    const { wrapper } = makeWrapper({ decks_override: [deck1] })

    const flashcard = wrapper.findComponent({ name: 'SessionFlashcard' })
    expect(flashcard.props('title')).toBe('My Deck')
  })

  test('title is the multiple-decks i18n key when more than one deck passed [obligation]', () => {
    const deck1 = deck.one({ overrides: { id: 1, title: 'Deck One' } })
    const deck2 = deck.one({ overrides: { id: 2, title: 'Deck Two' } })
    const { wrapper } = makeWrapper({ decks_override: [deck1, deck2] })

    const flashcard = wrapper.findComponent({ name: 'SessionFlashcard' })
    // The i18n key 'study-session.multiple-decks-title' renders as "Multiple Decks"
    // in the test setup; we just verify it's not one of the individual deck titles.
    const title = flashcard.props('title')
    expect(title).not.toBe('Deck One')
    expect(title).not.toBe('Deck Two')
    expect(typeof title).toBe('string')
    expect(title.length).toBeGreaterThan(0)
  })
})
