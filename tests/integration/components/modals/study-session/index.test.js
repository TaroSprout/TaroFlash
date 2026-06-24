import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import StudySession from '@/components/study-session/index.vue'
import { deck } from '../../../../fixtures/deck'

// Minimal MobileSheet stub that surfaces named slots so we can assert on them
// and emit the `close` event from tests. Uses a render function because the
// runtime template compiler isn't available in browser mode.
const MobileSheetStub = defineComponent({
  name: 'MobileSheet',
  emits: ['close'],
  setup(_props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'mobile-sheet-stub' }, [
        slots['header-content']?.(),
        slots.default?.()
      ])
  }
})

// SessionFlashcard stub — exposes requestClose and can relay `closed`/`finished`
// so we can verify index.vue wires them to the `close` prop.
function makeFlashcardStub({ hasRequestClose = true } = {}) {
  const requestClose = vi.fn()
  const component = defineComponent({
    name: 'SessionFlashcard',
    emits: ['closed', 'finished'],
    setup(_props, { expose }) {
      expose(hasRequestClose ? { requestClose } : {})
      return () => h('div', { 'data-testid': 'session-flashcard-stub' })
    }
  })
  component.__requestClose = requestClose
  return component
}

function makeWrapper({ close = vi.fn(), flashcardStub = makeFlashcardStub() } = {}) {
  const deck_data = deck.one({ overrides: { id: 1, title: 'My Deck' } })
  return {
    close,
    wrapper: shallowMount(StudySession, {
      props: { deck: deck_data, close },
      global: {
        stubs: { mobileSheet: MobileSheetStub, SessionFlashcard: flashcardStub }
      }
    })
  }
}

describe('StudySession (index.vue)', () => {
  test('renders the deck title in header-content slot', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.findComponent(MobileSheetStub).text()).toContain('My Deck')
  })

  test('renders session-flashcard in body slot', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="session-flashcard-stub"]').exists()).toBe(true)
  })

  test('mobile-sheet close event delegates to mode.requestClose when available', async () => {
    const flashcardStub = makeFlashcardStub()
    const { wrapper, close } = makeWrapper({ flashcardStub })

    await wrapper.findComponent(MobileSheetStub).vm.$emit('close')

    expect(flashcardStub.__requestClose).toHaveBeenCalledOnce()
    expect(close).not.toHaveBeenCalled()
  })

  test('mobile-sheet close event falls back to close() when mode has no requestClose', async () => {
    const { wrapper, close } = makeWrapper({
      flashcardStub: makeFlashcardStub({ hasRequestClose: false })
    })

    await wrapper.findComponent(MobileSheetStub).vm.$emit('close')

    expect(close).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledWith()
  })

  test('session-flashcard `closed` event calls close prop with no args', async () => {
    const { wrapper, close } = makeWrapper()

    await wrapper.findComponent({ name: 'SessionFlashcard' }).vm.$emit('closed')

    expect(close).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledWith()
  })

  test('session-flashcard `finished` event calls close with {results, remaining_due, study_all_used}', async () => {
    const { wrapper, close } = makeWrapper()

    const results = [
      { card_id: 1, is_new: false, before_interval: 3, after_interval: 7, lapses: 0, passed: true }
    ]
    await wrapper.findComponent({ name: 'SessionFlashcard' }).vm.$emit('finished', results, 2, true)

    expect(close).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledWith({
      results,
      remaining_due: 2,
      study_all_used: true
    })
  })
})
