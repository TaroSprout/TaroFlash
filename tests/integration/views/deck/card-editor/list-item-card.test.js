import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

// Stub CardFaceUploader so its editor slot renders under shallowMount.
// Forward attrs so `data-testid="front-input"` / `back-input` make it through,
// and declare `error` so the save-failure tests can read the forwarded prop.
const CardFaceUploaderStub = defineComponent({
  name: 'CardFaceUploader',
  inheritAttrs: false,
  props: {
    card: { type: Object, required: true },
    side: String,
    disabled: Boolean,
    error: Boolean
  },
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () => h('div', attrs, slots.editor?.())
  }
})

// Stub TextEditor as a real contenteditable div so focusin/focusout
// tests can dispatch events with e.target.isContentEditable === true.
const TextEditorStub = defineComponent({
  name: 'TextEditor',
  props: ['content', 'attributes', 'placeholder'],
  setup(_props, { attrs }) {
    return () =>
      h('div', {
        ...attrs,
        contenteditable: 'true',
        'data-testid': 'text-editor-stub'
      })
  }
})

const mocks = vi.hoisted(() => ({
  updateCardMock: vi.fn(),
  emitSfxMock: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mocks.emitSfxMock }))

import ListItemCard from '@/views/deck/card-editor/list-item-card.vue'
import textEditor from '@/components/text-editor/text-editor.vue'

function makeCard(overrides = {}) {
  return {
    id: 1,
    deck_id: 10,
    front_text: 'Q',
    back_text: 'A',
    rank: 1000,
    ...overrides
  }
}

function makeProvide({ is_selecting = ref(false) } = {}) {
  return {
    'card-editor': {
      selection: { is_selecting },
      updateCard: mocks.updateCardMock,
      card_attributes: { front: {}, back: {} }
    }
  }
}

function mount(props = {}) {
  const { is_selecting, ...rest } = props
  return shallowMount(ListItemCard, {
    props: {
      duplicate: false,
      ...rest,
      card: makeCard(rest.card)
    },
    global: {
      stubs: { CardFaceUploader: CardFaceUploaderStub },
      provide: makeProvide({ is_selecting })
    }
  })
}

// Used for focusin/focusout tests — TextEditor stub renders a real contenteditable
// div so e.target.isContentEditable is true when events bubble to the root.
function mountWithFocusStubs(props = {}) {
  return shallowMount(ListItemCard, {
    attachTo: document.body,
    props: {
      duplicate: false,
      ...props,
      card: makeCard(props.card)
    },
    global: {
      stubs: { CardFaceUploader: CardFaceUploaderStub, TextEditor: TextEditorStub },
      provide: makeProvide()
    }
  })
}

beforeEach(() => {
  mocks.updateCardMock.mockReset()
  mocks.updateCardMock.mockResolvedValue(undefined)
  mocks.emitSfxMock.mockReset()
})

describe('ListItemCard', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  test('renders a front and a back card', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="front-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="back-input"]').exists()).toBe(true)
  })

  test('forwards is_selecting to both uploaders as the disabled prop', () => {
    const wrapper = mount({ is_selecting: ref(true), card: { id: 42 } })
    const uploaders = wrapper.findAllComponents(CardFaceUploaderStub)
    expect(uploaders[0].props('disabled')).toBe(true)
    expect(uploaders[1].props('disabled')).toBe(true)
  })

  // ── Auto-save wiring ──────────────────────────────────────────────────────

  test('forwards text-editor updates to updateCard with the matching side key', async () => {
    const wrapper = mount({ card: { id: 42 } })
    const editors = wrapper.findAllComponents(textEditor)
    await editors[0].vm.$emit('update', 'new front')
    expect(mocks.updateCardMock).toHaveBeenCalledWith(42, { front_text: 'new front' })

    await editors[1].vm.$emit('update', 'new back')
    expect(mocks.updateCardMock).toHaveBeenLastCalledWith(42, { back_text: 'new back' })
  })

  // ── Focus sound effects via native focusin/focusout ───────────────────────
  // These tests use mountWithFocusStubs which renders contenteditable divs so
  // e.target.isContentEditable is true when events bubble to the root handler.

  // A detached card editor used as relatedTarget to simulate focus arriving from
  // or leaving to another card in the list.
  function makeOtherCardEditor() {
    const card = document.createElement('div')
    card.dataset.testid = 'list-item-card'
    const editor = document.createElement('div')
    editor.contentEditable = 'true'
    card.appendChild(editor)
    document.body.appendChild(card)
    return { card, editor }
  }

  test('emits ui.slide_up when a card is activated from outside every card (relatedTarget null)', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const contenteditable = wrapper.find('[data-testid="text-editor-stub"]').element
    contenteditable.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.slide_up')
    wrapper.unmount()
  })

  test('emits ui.slide_up when focus enters from an element outside every card', async () => {
    const external = document.createElement('div')
    document.body.appendChild(external)
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const contenteditable = wrapper.find('[data-testid="text-editor-stub"]').element
    contenteditable.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: external })
    )
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.slide_up')
    external.remove()
    wrapper.unmount()
  })

  test('emits ui.click_04 when focus moves within the card (between sides)', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const editors = wrapper.findAll('[data-testid="text-editor-stub"]')
    // Simulate focus moving from the first editor to the second.
    const first_editor = editors[0].element
    const second_editor = editors[1].element
    second_editor.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: first_editor })
    )
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.click_04')
    wrapper.unmount()
  })

  test('emits ui.click_04 when focus moves in from another card', async () => {
    const other = makeOtherCardEditor()
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const contenteditable = wrapper.find('[data-testid="text-editor-stub"]').element
    contenteditable.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: other.editor })
    )
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.click_04')
    other.card.remove()
    wrapper.unmount()
  })

  test('does NOT emit a sfx when a non-contenteditable element (e.g. image button) gains focus', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    // Create a non-contenteditable element to simulate an image button gaining focus.
    const button = document.createElement('button')
    wrapper.element.appendChild(button)
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))
    // e.target.isContentEditable is false → handler returns early
    expect(mocks.emitSfxMock).not.toHaveBeenCalled()
    button.remove()
    wrapper.unmount()
  })

  test('emits ui.card_drop when an editor blurs to outside every card', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const contenteditable = wrapper.find('[data-testid="text-editor-stub"]').element
    contenteditable.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    )
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.card_drop')
    wrapper.unmount()
  })

  test('does NOT emit ui.card_drop when a non-contenteditable element blurs to outside every card', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    // A non-contenteditable element (e.g. the image button) losing focus must not trigger the drop sfx.
    const button = document.createElement('button')
    wrapper.element.appendChild(button)
    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    // e.target.isContentEditable is false → card_drop guard skipped
    expect(mocks.emitSfxMock).not.toHaveBeenCalledWith('ui.card_drop')
    button.remove()
    wrapper.unmount()
  })

  test('does NOT emit ui.card_drop when focus moves out to another card', async () => {
    const other = makeOtherCardEditor()
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const contenteditable = wrapper.find('[data-testid="text-editor-stub"]').element
    contenteditable.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: other.editor })
    )
    expect(mocks.emitSfxMock).not.toHaveBeenCalledWith('ui.card_drop')
    other.card.remove()
    wrapper.unmount()
  })

  test('does NOT emit ui.card_drop when focus stays within the card (between sides)', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const editors = wrapper.findAll('[data-testid="text-editor-stub"]')
    editors[0].element.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: editors[1].element })
    )
    expect(mocks.emitSfxMock).not.toHaveBeenCalledWith('ui.card_drop')
    wrapper.unmount()
  })

  test('focusout with relatedTarget inside the card keeps focused true, so the next focusin emits click_04', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const editors = wrapper.findAll('[data-testid="text-editor-stub"]')
    const first_editor = editors[0].element
    const second_editor = editors[1].element
    // 1. Focus enters the card from outside — focused becomes true
    first_editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))
    // 2. Focus moves within the card (first→second) — focusout with relatedTarget inside
    first_editor.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: second_editor })
    )
    // 3. The second editor now fires focusin — focus stayed within the card
    mocks.emitSfxMock.mockReset()
    second_editor.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: first_editor })
    )
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.click_04')
    wrapper.unmount()
  })

  test('focused ref becomes false when focusout relatedTarget is null (focus left the card)', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const contenteditable = wrapper.find('[data-testid="text-editor-stub"]').element
    // First gain focus so focused is true
    contenteditable.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))
    // Now focus leaves the card entirely
    contenteditable.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    )
    // wrapper.element.contains(null) === false → focused becomes false
    // A subsequent focusEditor() call should try to focus the front-input
    // (we can't assert wrapper.vm.focused directly per blackbox rules, but we can
    // verify the side effect: emitSfx slides up again next time focus enters)
    mocks.emitSfxMock.mockReset()
    contenteditable.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.slide_up')
    wrapper.unmount()
  })

  // ── Error state — red outline from local save failure ─────────────────────

  test('starts with error=false on both faces', () => {
    const wrapper = mount({ card: { id: 42 } })
    const uploaders = wrapper.findAllComponents(CardFaceUploaderStub)
    expect(uploaders[0].props('error')).toBe(false)
    expect(uploaders[1].props('error')).toBe(false)
  })

  test('sets error=true on both faces when updateCard rejects', async () => {
    mocks.updateCardMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 42 } })
    await wrapper.findAllComponents(textEditor)[0].vm.$emit('update', 'X')
    await flushPromises()
    const uploaders = wrapper.findAllComponents(CardFaceUploaderStub)
    expect(uploaders[0].props('error')).toBe(true)
    expect(uploaders[1].props('error')).toBe(true)
  })

  test('clears error on the next update', async () => {
    mocks.updateCardMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 42 } })
    await wrapper.findAllComponents(textEditor)[0].vm.$emit('update', 'X')
    await flushPromises()
    expect(wrapper.findAllComponents(CardFaceUploaderStub)[0].props('error')).toBe(true)

    await wrapper.findAllComponents(textEditor)[0].vm.$emit('update', 'XY')
    await flushPromises()
    expect(wrapper.findAllComponents(CardFaceUploaderStub)[0].props('error')).toBe(false)
  })
})
