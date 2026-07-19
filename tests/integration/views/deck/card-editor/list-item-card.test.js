import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent, h, ref, useAttrs } from 'vue'

// FaceEditor stub — renders a real contenteditable div (so focusin/focusout
// tests can dispatch events with e.target.isContentEditable === true) and
// forwards attrs so `data-testid="front-input"` / `back-input` make it
// through. Exposes `focus()` since the real component's exposed contract is
// `{ uploader, focus }`, not the inner TextEditor directly.
const FaceEditorStub = defineComponent({
  name: 'FaceEditor',
  inheritAttrs: false,
  props: {
    card: { type: Object, required: true },
    side: String,
    card_attributes: Object,
    text: String,
    card_key: [String, Number],
    disabled: Boolean,
    error: Boolean,
    placeholder: String,
    with_images: Boolean
  },
  emits: ['update'],
  setup(props, { attrs, expose }) {
    expose({ focus: vi.fn(), uploader: null })
    const editor_attrs = useAttrs()
    return () =>
      h('div', {
        ...editor_attrs,
        contenteditable: 'true',
        'data-testid': attrs['data-testid'] ?? `face-editor-stub-${props.side}`,
        'data-error': String(!!props.error)
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
import { cardEditorKey } from '@/views/deck/composables/list-controller'
import { useNoticeStore } from '@/stores/notice-store'

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
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      stubs: { FaceEditor: FaceEditorStub },
      provide: makeProvide({ is_selecting })
    }
  })
}

// Used for focusin/focusout tests — same stub (contenteditable), just a
// distinct helper name kept for readability with the original test names.
function mountWithFocusStubs(props = {}) {
  return shallowMount(ListItemCard, {
    attachTo: document.body,
    props: {
      ...props,
      card: makeCard(props.card)
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      stubs: { FaceEditor: FaceEditorStub },
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

  test('forwards is_selecting to both FaceEditors as the disabled prop', () => {
    const wrapper = mount({ is_selecting: ref(true), card: { id: 42 } })
    const editors = wrapper.findAllComponents(FaceEditorStub)
    expect(editors[0].props('disabled')).toBe(true)
    expect(editors[1].props('disabled')).toBe(true)
  })

  test('both faces enable with_images', () => {
    const wrapper = mount({ card: { id: 42 } })
    const editors = wrapper.findAllComponents(FaceEditorStub)
    expect(editors[0].props('with_images')).toBe(true)
    expect(editors[1].props('with_images')).toBe(true)
  })

  // ── Auto-save wiring ──────────────────────────────────────────────────────

  test('forwards text-editor updates to updateCard with both sides from local state', async () => {
    const wrapper = mount({ card: { id: 42, front_text: 'Q', back_text: 'A' } })
    const editors = wrapper.findAllComponents(FaceEditorStub)

    await editors[0].vm.$emit('update', 'front', 'new front')
    expect(mocks.updateCardMock).toHaveBeenCalledWith(42, {
      front_text: 'new front',
      back_text: 'A'
    })

    await editors[1].vm.$emit('update', 'back', 'new back')
    expect(mocks.updateCardMock).toHaveBeenLastCalledWith(42, {
      front_text: 'new front',
      back_text: 'new back'
    })
  })

  test('an edit to one side carries the other side, so a save cannot clobber it', async () => {
    // Regression: editing back then front used to send only the changed side,
    // and the save path merged it over the stale cached card — wiping the back.
    const wrapper = mount({ card: { id: 42, front_text: '', back_text: '' } })
    const editors = wrapper.findAllComponents(FaceEditorStub)

    await editors[1].vm.$emit('update', 'back', 'B')
    await editors[0].vm.$emit('update', 'front', 'F')

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
    const contenteditable = wrapper.find('[data-testid="front-input"]').element
    contenteditable.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('slide_up')
    wrapper.unmount()
  })

  test('emits ui.slide_up when focus enters from an element outside every card', async () => {
    const external = document.createElement('div')
    document.body.appendChild(external)
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const contenteditable = wrapper.find('[data-testid="front-input"]').element
    contenteditable.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: external })
    )
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('slide_up')
    external.remove()
    wrapper.unmount()
  })

  test('emits ui.click_04 when focus moves within the card (between sides)', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const first_editor = wrapper.find('[data-testid="front-input"]').element
    const second_editor = wrapper.find('[data-testid="back-input"]').element
    // Simulate focus moving from the first editor to the second.
    second_editor.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: first_editor })
    )
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('click_04')
    wrapper.unmount()
  })

  test('emits ui.click_04 when focus moves in from another card', async () => {
    const other = makeOtherCardEditor()
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const contenteditable = wrapper.find('[data-testid="front-input"]').element
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
    const contenteditable = wrapper.find('[data-testid="front-input"]').element
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
    const contenteditable = wrapper.find('[data-testid="front-input"]').element
    contenteditable.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: other.editor })
    )
    expect(mocks.emitSfxMock).not.toHaveBeenCalledWith('card_drop')
    other.card.remove()
    wrapper.unmount()
  })

  test('does NOT emit ui.card_drop when focus stays within the card (between sides)', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const first_editor = wrapper.find('[data-testid="front-input"]').element
    const second_editor = wrapper.find('[data-testid="back-input"]').element
    first_editor.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: second_editor })
    )
    expect(mocks.emitSfxMock).not.toHaveBeenCalledWith('card_drop')
    wrapper.unmount()
  })

  test('a window-blur/refocus round trip stays silent (no sfx) on the restoring focusin [obligation]', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const contenteditable = wrapper.find('[data-testid="front-input"]').element

    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    contenteditable.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    )
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)

    mocks.emitSfxMock.mockReset()
    contenteditable.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))

    expect(mocks.emitSfxMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('the programmatic autofocus from claimFocus stays silent on its own focusin [obligation]', () => {
    mocks.claimFocusMock.mockReturnValue(true)
    const wrapper = shallowMount(ListItemCard, {
      attachTo: document.body,
      props: { card: makeCard({ id: 77, client_id: 'c77' }) },
      global: {
        stubs: { FaceEditor: FaceEditorStub },
        provide: makeProvide()
      }
    })
    const contenteditable = wrapper.find('[data-testid="front-input"]').element

    mocks.emitSfxMock.mockReset()
    contenteditable.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))

    expect(mocks.emitSfxMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('focusout with relatedTarget inside the card keeps focused true, so the next focusin emits click_04', async () => {
    const wrapper = mountWithFocusStubs({ card: { id: 42 } })
    const first_editor = wrapper.find('[data-testid="front-input"]').element
    const second_editor = wrapper.find('[data-testid="back-input"]').element
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
    const contenteditable = wrapper.find('[data-testid="front-input"]').element
    // First gain focus so focused is true
    contenteditable.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))
    // Now focus leaves the card entirely
    contenteditable.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    )
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
    // Use mountWithFocusStubs so the front-input template ref resolves to a
    // stub exposing focus() so focusEditor() doesn't throw.
    const wrapper = shallowMount(ListItemCard, {
      attachTo: document.body,
      props: { card: makeCard({ id: 77, client_id: 'c77' }) },
      global: {
        stubs: { FaceEditor: FaceEditorStub },
        provide: makeProvide()
      }
    })
    expect(mocks.gsapFromMock).toHaveBeenCalledWith(wrapper.element)
    wrapper.unmount()
  })

  // ── Error state — red outline from local save failure ─────────────────────

  test('starts with error=false on both faces', () => {
    const wrapper = mount({ card: { id: 42 } })
    const editors = wrapper.findAllComponents(FaceEditorStub)
    expect(editors[0].props('error')).toBe(false)
    expect(editors[1].props('error')).toBe(false)
  })

  test('sets error=true on both faces when updateCard rejects', async () => {
    mocks.updateCardMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 42 } })
    await wrapper.findAllComponents(FaceEditorStub)[0].vm.$emit('update', 'front', 'X')
    await flushPromises()
    const editors = wrapper.findAllComponents(FaceEditorStub)
    expect(editors[0].props('error')).toBe(true)
    expect(editors[1].props('error')).toBe(true)
  })

  test('save_failed AND notice.error both fire when updateCard rejects [obligation]', async () => {
    mocks.updateCardMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 42 } })
    const notice = useNoticeStore()

    await wrapper.findAllComponents(FaceEditorStub)[0].vm.$emit('update', 'front', 'X')
    await flushPromises()

    expect(wrapper.findAllComponents(FaceEditorStub)[0].props('error')).toBe(true)
    expect(notice.notices).toHaveLength(1)
    expect(notice.notices[0].message).toBe('Something went wrong while trying to save your card')
  })

  test('clears error on the next update', async () => {
    mocks.updateCardMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 42 } })
    await wrapper.findAllComponents(FaceEditorStub)[0].vm.$emit('update', 'front', 'X')
    await flushPromises()
    expect(wrapper.findAllComponents(FaceEditorStub)[0].props('error')).toBe(true)

    await wrapper.findAllComponents(FaceEditorStub)[0].vm.$emit('update', 'front', 'XY')
    await flushPromises()
    expect(wrapper.findAllComponents(FaceEditorStub)[0].props('error')).toBe(false)
  })
})
