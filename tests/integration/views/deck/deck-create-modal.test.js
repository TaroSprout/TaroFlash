import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'

vi.mock('@/composables/ui/media-query', async () => {
  const m = await import('../../../helpers/responsive-mock')
  return m.responsiveMockModule
})

const { mockEmitSfx, mockNoticeError, mockPush, mockSaveDeck } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockNoticeError: vi.fn(),
  mockPush: vi.fn(),
  mockSaveDeck: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))
vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => ({ error: mockNoticeError, success: vi.fn(), warn: vi.fn() })
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }))
vi.mock('@/utils/cover', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, randomCoverConfig: () => ({}) }
})

let editorSettings

vi.mock('@/composables/deck/editor', () => ({
  deckEditorKey: Symbol('deck-editor'),
  useDeckEditor: () => ({
    settings: editorSettings,
    cover: reactive({}),
    card_attributes: reactive({ front: {}, back: {} }),
    saveDeck: mockSaveDeck
  })
}))

import { setBelowMd, resetResponsive } from '../../../helpers/responsive-mock'
import DeckCreateModal from '@/views/deck/deck-create-modal.vue'

const MobileSheetStub = defineComponent({
  name: 'MobileSheet',
  inheritAttrs: false,
  emits: ['close'],
  setup(_p, { slots, emit }) {
    return () =>
      h('div', { 'data-testid': 'mobile-sheet-stub' }, [
        h('button', {
          'data-testid': 'mobile-sheet-stub__close',
          onClick: () => emit('close')
        }),
        slots['header-content']?.(),
        slots.overlay?.(),
        slots.default?.()
      ])
  }
})

const InputStub = defineComponent({
  name: 'UiInput',
  props: {
    placeholder: String,
    error: String,
    value: String,
    maxLength: Number,
    size: String,
    textAlign: String
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        'data-testid': 'ui-kit-input',
        maxlength: props.maxLength,
        value: props.value ?? '',
        onInput: (e) => emit('update:value', e.target.value)
      })
  }
})

const ButtonStub = defineComponent({
  name: 'UiButton',
  props: { disabled: Boolean },
  emits: ['press'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': 'ui-kit-button',
          'data-disabled': String(!!props.disabled),
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

function makeModal({ title = '' } = {}) {
  editorSettings = reactive({ title, description: '' })
  const close = vi.fn()
  const wrapper = mount(DeckCreateModal, {
    props: { close },
    global: {
      stubs: {
        MobileSheet: MobileSheetStub,
        CoverDesigner: true,
        DeckDesignPreview: true,
        DeckPinnedPreview: true,
        UiInput: InputStub,
        UiTextarea: true,
        UiButton: ButtonStub
      }
    }
  })
  return { wrapper, close, settings: editorSettings }
}

describe('DeckCreateModal', () => {
  beforeEach(() => {
    resetResponsive()
    mockEmitSfx.mockReset()
    mockNoticeError.mockReset()
    mockPush.mockReset()
    mockSaveDeck.mockReset()
  })

  // ── layout ─────────────────────────────────────────────────────────────────

  test('renders the aside inputs in tablet layout', () => {
    setBelowMd(false)
    const { wrapper } = makeModal()
    expect(wrapper.find('[data-testid="deck-create__aside-inputs"]').exists()).toBe(true)
  })

  test('renders the mobile inputs in sheet layout', () => {
    setBelowMd(true)
    const { wrapper } = makeModal()
    expect(wrapper.find('[data-testid="deck-create__mobile-inputs"]').exists()).toBe(true)
  })

  // ── title max length ───────────────────────────────────────────────────────

  test('title input carries DECK_TITLE_MAX_LENGTH as maxlength', () => {
    setBelowMd(false)
    const { wrapper } = makeModal()
    expect(wrapper.find('[data-testid="ui-kit-input"]').attributes('maxlength')).toBe('15')
  })

  // ── save validation ────────────────────────────────────────────────────────

  test('pressing submit with no title sets a validation error and does not save [obligation]', async () => {
    setBelowMd(false)
    const { wrapper } = makeModal({ title: '' })

    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')

    expect(mockSaveDeck).not.toHaveBeenCalled()
    expect(mockEmitSfx).toHaveBeenCalledWith('etc_woodblock_stuck')
  })

  test('pressing submit with a title saves the deck and closes with true [obligation]', async () => {
    setBelowMd(false)
    mockSaveDeck.mockResolvedValueOnce({ id: 42 })
    const { wrapper, close } = makeModal({ title: 'My Deck' })

    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')
    await vi.waitFor(() => expect(mockSaveDeck).toHaveBeenCalled())

    expect(close).toHaveBeenCalledWith(true)
    expect(mockPush).toHaveBeenCalledWith({ name: 'deck', params: { id: 42 } })
  })

  test('shows an error notice and does not close when saveDeck fails [obligation]', async () => {
    setBelowMd(false)
    mockSaveDeck.mockResolvedValueOnce(null)
    const { wrapper, close } = makeModal({ title: 'My Deck' })

    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')
    await vi.waitFor(() => expect(mockSaveDeck).toHaveBeenCalled())

    expect(mockNoticeError).toHaveBeenCalledWith("Couldn't save this deck. Please try again.")
    expect(close).not.toHaveBeenCalled()
  })

  // ── title error reset watcher ──────────────────────────────────────────────

  test('editing the title after a validation error clears title_error [obligation]', async () => {
    setBelowMd(false)
    const { wrapper, settings } = makeModal({ title: '' })

    await wrapper.find('[data-testid="deck-create__aside-submit"]').trigger('click')
    expect(wrapper.find('[data-testid="ui-kit-input"]').attributes('data-error')).toBeUndefined()

    settings.title = 'New title'
    await wrapper.vm.$nextTick()

    expect(mockNoticeError).not.toHaveBeenCalled()
  })

  // ── model bindings ─────────────────────────────────────────────────────────

  test('typing into the title input updates editor.settings.title in tablet layout', async () => {
    setBelowMd(false)
    const { wrapper, settings } = makeModal({ title: '' })

    await wrapper.find('[data-testid="ui-kit-input"]').setValue('Tablet title')

    expect(settings.title).toBe('Tablet title')
  })

  test('typing into the title input updates editor.settings.title in sheet layout', async () => {
    setBelowMd(true)
    const { wrapper, settings } = makeModal({ title: '' })

    await wrapper.find('[data-testid="ui-kit-input"]').setValue('Sheet title')

    expect(settings.title).toBe('Sheet title')
  })

  // ── cancel ─────────────────────────────────────────────────────────────────

  test('pressing cancel in sheet mode closes with false', async () => {
    setBelowMd(true)
    const { wrapper, close } = makeModal()

    const cancelBtn = wrapper.findAll('[data-testid="ui-kit-button"]')[0]
    await cancelBtn.trigger('click')

    expect(close).toHaveBeenCalledWith(false)
  })

  test('closing the mobile sheet closes the modal with false', async () => {
    setBelowMd(false)
    const { wrapper, close } = makeModal()

    await wrapper.find('[data-testid="mobile-sheet-stub__close"]').trigger('click')

    expect(close).toHaveBeenCalledWith(false)
  })
})
