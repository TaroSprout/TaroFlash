import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

// Stub ImageUploader so its editor slot renders under shallowMount.
// Forward attrs so `data-testid="front-input"` / `back-input` make it through,
// and declare `error` so the save-failure tests can read the forwarded prop.
const ImageUploaderStub = defineComponent({
  name: 'ImageUploader',
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
// Exposes focus() so useTemplateRef('front-input')?.focus() doesn't throw when
// the onMounted claimFocus branch runs.
const TextEditorStub = defineComponent({
  name: 'TextEditor',
  props: ['content', 'attributes', 'placeholder'],
  setup(_props, { attrs, expose }) {
    expose({ focus: vi.fn() })
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
  emitSfxMock: vi.fn(),
  claimFocusMock: vi.fn(),
  gsapFromMock: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mocks.emitSfxMock, emitHoverSfx: vi.fn() }))

vi.mock('@/utils/animations/list-item', () => ({
  expandListItemIn: mocks.gsapFromMock
}))

import ListItemCard from '@/views/deck/card-editor/list-item-card.vue'
import textEditor from '@/components/card/text-editor.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'

function makeCard(overrides = {}) {
  return {
    id: 1,
    client_id: 'c1',
    deck_id: 10,
    front_text: 'Q',
    back_text: 'A',
    rank: 1000,
    ...overrides
  }
}

function makeProvide({ is_selecting = ref(false) } = {}) {
  return {
    [cardEditorKey]: {
      selection: { is_selecting },
      updateCard: mocks.updateCardMock,
      card_attributes: { front: {}, back: {} },
      claimFocus: mocks.claimFocusMock
    }
  }
}

function mount(props = {}) {
  const { is_selecting, ...rest } = props
  return shallowMount(ListItemCard, {
    props: {
      ...rest,
      card: makeCard(rest.card)
    },
    global: {
      stubs: { ImageUploader: ImageUploaderStub },
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
      ...props,
      card: makeCard(props.card)
    },
    global: {
      stubs: { ImageUploader: ImageUploaderStub, TextEditor: TextEditorStub },
      provide: makeProvide()
    }
  })
}

beforeEach(() => {
  mocks.updateCardMock.mockReset()
  mocks.updateCardMock.mockResolvedValue(undefined)
  mocks.emitSfxMock.mockReset()
  mocks.claimFocusMock.mockReset()
  mocks.claimFocusMock.mockReturnValue(false)
  mocks.gsapFromMock.mockReset()
  // The runner's window isn't focused, so document.hasFocus() is false and the
  // window-blur guard would swallow every focusout. Simulate a focused window.
  vi.spyOn(document, 'hasFocus').mockReturnValue(true)
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
    const uploaders = wrapper.findAllComponents(ImageUploaderStub)
    expect(uploaders[0].props('disabled')).toBe(true)
    expect(uploaders[1].props('disabled')).toBe(true)
  })

  // ── Auto-save wiring ──────────────────────────────────────────────────────

  test('forwards text-editor updates to updateCard with both sides from local state', async () => {
    const wrapper = mount({ card: { id: 42, front_text: 'Q', back_text: 'A' } })
    const editors = wrapper.findAllComponents(textEditor)

    await editors[0].vm.$emit('update', 'new front')
    expect(mocks.updateCardMock).toHaveBeenCalledWith(42, {
      front_text: 'new front',
      back_text: 'A'
    })

    await editors[1].vm.$emit('update', 'new back')
    expect(mocks.updateCardMock).toHaveBeenLastCalledWith(42, {
      front_text: 'new front',
      back_text: 'new back'
    })
  })

  test('an edit to one side carries the other side, so a save cannot clobber it', async () => {
    // Regression: editing back then front used to send only the changed side,
    // and the save path merged it over the stale cached card — wiping the back.
    const wrapper = mount({ card: { id: 42, front_text: '', back_text: '' } })
    const editors = wrapper.findAllComponents(textEditor)

    await editors[1].vm.$emit('update', 'B')
    await editors[0].vm.$emit('update', 'F')

    expect(mocks.updateCardMock).toHaveBeenLastCalledWith(42, { front_text: 'F', back_text: 'B' })
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
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('slide_up')
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
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('slide_up')
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
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('click_04')
    wrapper.unmount()
  })

  test('emits ui.click_04 when focus moves in from another card', async () => {
    const other = makeOtherCardEditor()
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const contenteditable = wrapper.find('[data-testid="text-editor-stub"]').element
    contenteditable.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: other.editor })
    )
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('click_04')
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
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('card_drop')
    wrapper.unmount()
  })

  test('does NOT emit ui.card_drop when a non-contenteditable element blurs to outside every card', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    // A non-contenteditable element (e.g. the image button) losing focus must not trigger the drop sfx.
    const button = document.createElement('button')
    wrapper.element.appendChild(button)
    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    // e.target.isContentEditable is false → card_drop guard skipped
    expect(mocks.emitSfxMock).not.toHaveBeenCalledWith('card_drop')
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
    expect(mocks.emitSfxMock).not.toHaveBeenCalledWith('card_drop')
    other.card.remove()
    wrapper.unmount()
  })

  test('does NOT emit ui.card_drop when focus stays within the card (between sides)', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const editors = wrapper.findAll('[data-testid="text-editor-stub"]')
    editors[0].element.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: editors[1].element })
    )
    expect(mocks.emitSfxMock).not.toHaveBeenCalledWith('card_drop')
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
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('click_04')
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
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('slide_up')
    wrapper.unmount()
  })

  // ── onMounted autofocus — claimFocus true branch ──────────────────────────

  test('does NOT run expandListItemIn when claimFocus returns false (scroll-mounted row) [obligation]', () => {
    mocks.claimFocusMock.mockReturnValue(false)
    mount({ card: { id: 99, client_id: 'c99' } })
    expect(mocks.gsapFromMock).not.toHaveBeenCalled()
  })

  test('runs expandListItemIn on the root element when claimFocus returns true [obligation]', async () => {
    mocks.claimFocusMock.mockReturnValue(true)
    // Use mountWithFocusStubs so the front-input template ref resolves to a real
    // contenteditable element whose .focus() exists; otherwise focusEditor() throws.
    const wrapper = shallowMount(ListItemCard, {
      attachTo: document.body,
      props: { card: makeCard({ id: 77, client_id: 'c77' }) },
      global: {
        stubs: { ImageUploader: ImageUploaderStub, TextEditor: TextEditorStub },
        provide: makeProvide()
      }
    })
    expect(mocks.gsapFromMock).toHaveBeenCalledWith(wrapper.element)
    wrapper.unmount()
  })

  // ── Error state — red outline from local save failure ─────────────────────

  test('starts with error=false on both faces', () => {
    const wrapper = mount({ card: { id: 42 } })
    const uploaders = wrapper.findAllComponents(ImageUploaderStub)
    expect(uploaders[0].props('error')).toBe(false)
    expect(uploaders[1].props('error')).toBe(false)
  })

  test('sets error=true on both faces when updateCard rejects', async () => {
    mocks.updateCardMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 42 } })
    await wrapper.findAllComponents(textEditor)[0].vm.$emit('update', 'X')
    await flushPromises()
    const uploaders = wrapper.findAllComponents(ImageUploaderStub)
    expect(uploaders[0].props('error')).toBe(true)
    expect(uploaders[1].props('error')).toBe(true)
  })

  test('clears error on the next update', async () => {
    mocks.updateCardMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 42 } })
    await wrapper.findAllComponents(textEditor)[0].vm.$emit('update', 'X')
    await flushPromises()
    expect(wrapper.findAllComponents(ImageUploaderStub)[0].props('error')).toBe(true)

    await wrapper.findAllComponents(textEditor)[0].vm.$emit('update', 'XY')
    await flushPromises()
    expect(wrapper.findAllComponents(ImageUploaderStub)[0].props('error')).toBe(false)
  })
})
