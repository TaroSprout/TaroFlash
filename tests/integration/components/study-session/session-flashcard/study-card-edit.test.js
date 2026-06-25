import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import { DeckContextKey } from '@/components/study-session/deck-context'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// FaceEditor stub — renders the root with data-testid forwarded from attrs (inheritAttrs),
// and renders a child for the input testid.
const FaceEditorStub = defineComponent({
  name: 'FaceEditor',
  inheritAttrs: true,
  props: ['card', 'side', 'card_attributes', 'placeholder', 'input_testid'],
  setup(props, { attrs }) {
    return () =>
      h('div', { ...attrs }, [
        h('div', { 'data-testid': props.input_testid ?? 'face-editor__input' })
      ])
  }
})

// ── Imports ───────────────────────────────────────────────────────────────────

import StudyCardEdit from '@/components/study-session/session-flashcard/study-card-edit.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return { id: 1, front_text: 'q', back_text: 'a', deck_id: 1, ...overrides }
}

function mountStudyCardEdit({ props = {}, deck_context = {} } = {}) {
  return shallowMount(StudyCardEdit, {
    props: { side: 'front', ...props },
    global: {
      stubs: { FaceEditor: FaceEditorStub },
      provide: { [DeckContextKey]: ref(deck_context) }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StudyCardEdit', () => {
  // ── Testid obligations [obligation] ────────────────────────────────────────

  test('root element carries data-testid="study-card-edit" [obligation]', () => {
    const wrapper = mountStudyCardEdit()
    expect(wrapper.find('[data-testid="study-card-edit"]').exists()).toBe(true)
  })

  test('input element carries data-testid="study-card-edit__input" [obligation]', () => {
    const wrapper = mountStudyCardEdit()
    expect(wrapper.find('[data-testid="study-card-edit__input"]').exists()).toBe(true)
  })

  // ── Card and side forwarding ──────────────────────────────────────────────

  test('forwards the card prop to face-editor', () => {
    const card = makeCard({ id: 7 })
    const wrapper = mountStudyCardEdit({ props: { card } })
    const stub = wrapper.findComponent(FaceEditorStub)
    expect(stub.props('card')).toEqual(card)
  })

  test('forwards the side prop to face-editor', () => {
    const wrapper = mountStudyCardEdit({ props: { side: 'back' } })
    const stub = wrapper.findComponent(FaceEditorStub)
    expect(stub.props('side')).toBe('back')
  })

  // ── Placeholder [obligation] ──────────────────────────────────────────────

  test('shows front placeholder when side is front', () => {
    const wrapper = mountStudyCardEdit({ props: { side: 'front' } })
    const stub = wrapper.findComponent(FaceEditorStub)
    expect(stub.props('placeholder')).toBeTruthy()
    expect(stub.props('placeholder')).not.toBe('')
  })

  test('shows back placeholder when side is back', () => {
    const wrapper = mountStudyCardEdit({ props: { side: 'back' } })
    const stub = wrapper.findComponent(FaceEditorStub)
    // Different placeholder for back vs front
    const front_wrapper = mountStudyCardEdit({ props: { side: 'front' } })
    expect(stub.props('placeholder')).not.toBe(
      front_wrapper.findComponent(FaceEditorStub).props('placeholder')
    )
  })

  // ── Deck context forwarding ───────────────────────────────────────────────

  test('passes card_attributes from deck context to face-editor', () => {
    const card_attributes = { front: { horizontal_alignment: 'left' }, back: {} }
    const wrapper = mountStudyCardEdit({ deck_context: { card_attributes } })
    const stub = wrapper.findComponent(FaceEditorStub)
    expect(stub.props('card_attributes')).toEqual(card_attributes)
  })

  test('falls back to empty front/back attributes when deck context has none', () => {
    const wrapper = mountStudyCardEdit({ deck_context: {} })
    const stub = wrapper.findComponent(FaceEditorStub)
    expect(stub.props('card_attributes')).toEqual({ front: {}, back: {} })
  })

  // ── Update event forwarding ───────────────────────────────────────────────

  test('re-emits update event from face-editor with side and text', async () => {
    const wrapper = mountStudyCardEdit({ props: { side: 'front' } })
    await wrapper.findComponent(FaceEditorStub).vm.$emit('update', 'front', 'new text')
    expect(wrapper.emitted('update')).toEqual([['front', 'new text']])
  })
})
