import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
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

// Pane animation hooks — call done() immediately so transitions don't hang.
vi.mock('@/utils/animations/session-pane', () => ({
  sessionPaneLeave: vi.fn((_el, done) => done()),
  sessionPaneEnter: vi.fn((_el, done) => done())
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const FlashcardStub = defineComponent({
  name: 'SessionFlashcard',
  emits: ['closed', 'finished'],
  setup(_props, { expose }) {
    expose({})
    return () => h('div', { 'data-testid': 'session-flashcard-stub' })
  }
})

const SummaryStub = defineComponent({
  name: 'SessionSummary',
  emits: ['action'],
  props: ['results', 'secondary_action'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'session-summary-stub', 'data-action': props.secondary_action }, [
        h('button', { 'data-testid': 'summary-action-btn', onClick: () => emit('action') })
      ])
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper({ close = vi.fn() } = {}) {
  const deck_data = deck.one({ overrides: { id: 1, title: 'My Deck' } })
  return {
    close,
    deck_data,
    wrapper: shallowMount(StudySession, {
      props: { deck: deck_data, close },
      global: {
        stubs: {
          SessionFlashcard: FlashcardStub,
          SessionSummary: SummaryStub
        }
      }
    })
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StudySession (index.vue)', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockEmitStudySfx.mockClear()
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

    await wrapper.findComponent({ name: 'SessionFlashcard' }).vm.$emit('finished', [], 0, false)

    expect(wrapper.find('[data-testid="session-summary-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-flashcard-stub"]').exists()).toBe(false)
  })

  // ── secondary_action logic [obligation] ────────────────────────────────────

  test('study_all_used=true → secondary_action is "study-again" [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await wrapper
      .findComponent({ name: 'SessionFlashcard' })
      .vm.$emit('finished', [], 0, true /* study_all_used */)

    const summary = wrapper.find('[data-testid="session-summary-stub"]')
    expect(summary.attributes('data-action')).toBe('study-again')
  })

  test('study_all_used=false, remaining_due>0 → secondary_action is "study-more" [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await wrapper
      .findComponent({ name: 'SessionFlashcard' })
      .vm.$emit('finished', [], 5 /* remaining_due */, false)

    const summary = wrapper.find('[data-testid="session-summary-stub"]')
    expect(summary.attributes('data-action')).toBe('study-more')
  })

  test('study_all_used=false, remaining_due=0 → secondary_action is "study-all" [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await wrapper
      .findComponent({ name: 'SessionFlashcard' })
      .vm.$emit('finished', [], 0 /* remaining_due */, false)

    const summary = wrapper.find('[data-testid="session-summary-stub"]')
    expect(summary.attributes('data-action')).toBe('study-all')
  })

  // ── Summary @action forwards to close [obligation] ─────────────────────────

  test('summary @action event calls close() [obligation]', async () => {
    const { wrapper, close } = makeWrapper()

    await wrapper.findComponent({ name: 'SessionFlashcard' }).vm.$emit('finished', [], 0, false)

    await wrapper.findComponent({ name: 'SessionSummary' }).vm.$emit('action', 'study-all')

    expect(close).toHaveBeenCalledWith('study-all')
  })

  // ── emitStudySfx on finished ───────────────────────────────────────────────

  test('@finished plays music_pizz_duo_hi sfx', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.findComponent({ name: 'SessionFlashcard' }).vm.$emit('finished', [], 0, false)

    expect(mockEmitStudySfx).toHaveBeenCalledWith('music_pizz_duo_hi')
  })
})
