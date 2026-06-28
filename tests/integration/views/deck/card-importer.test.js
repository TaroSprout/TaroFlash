import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { bulkInsertMock, guardAddCardsMock, handleLimitErrorMock, toastErrorMock } = vi.hoisted(
  () => ({
    bulkInsertMock: vi.fn().mockResolvedValue([]),
    guardAddCardsMock: vi.fn().mockResolvedValue(true),
    handleLimitErrorMock: vi.fn().mockReturnValue(false),
    toastErrorMock: vi.fn()
  })
)

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ error: toastErrorMock })
}))

vi.mock('@/api/cards', () => {
  const noop_mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn() })
  const noop_query = () => ({ data: { value: null }, refresh: vi.fn() })
  return {
    useBulkInsertCardsInDeckMutation: () => ({
      mutate: bulkInsertMock,
      mutateAsync: bulkInsertMock
    }),
    useAllCardsInDeckQuery: noop_query,
    useCardsInDeckInfiniteQuery: noop_query,
    useDeleteCardImageMutation: noop_mutation,
    useDeleteCardsInDeckMutation: noop_mutation,
    useDeleteCardsMutation: noop_mutation,
    useInsertCardAtMutation: noop_mutation,
    useMemberCardCountQuery: noop_query,
    useMoveCardMutation: noop_mutation,
    useMoveCardsToDeckMutation: noop_mutation,
    useSaveCardMutation: noop_mutation,
    useSetCardImageMutation: noop_mutation,
    useStudySessionCardsQuery: noop_query,
    useUpsertCardMutation: noop_mutation,
    useUpsertCardsMutation: noop_mutation
  }
})

import CardImporter from '@/views/deck/card-importer.vue'
import { cardEditorKey } from '@/views/deck/composables/list-controller'

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['disabled'],
  emits: ['press'],
  setup(_props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        { ...attrs, disabled: attrs.disabled, onClick: () => emit('press') },
        slots.default?.()
      )
  }
})

beforeEach(() => {
  bulkInsertMock.mockReset()
  bulkInsertMock.mockResolvedValue([])
  guardAddCardsMock.mockReset()
  guardAddCardsMock.mockResolvedValue(true)
  handleLimitErrorMock.mockReset()
  handleLimitErrorMock.mockReturnValue(false)
  toastErrorMock.mockReset()
})

function mount({ deck_id = 10 } = {}) {
  return shallowMount(CardImporter, {
    global: {
      stubs: { UiButton: UiButtonStub },
      provide: {
        [cardEditorKey]: {
          deck_id,
          guardAddCards: guardAddCardsMock,
          handleLimitError: handleLimitErrorMock
        }
      }
    }
  })
}

function importButton(wrapper) {
  return wrapper.findAllComponents({ name: 'UiButton' })[0]
}

function saveButton(wrapper) {
  return wrapper.findAllComponents({ name: 'UiButton' })[1]
}

describe('CardImporter', () => {
  // ── onImport: parses raw text into card drafts ─────────────────────────────

  test('splits raw_text by newline and the configured delimiter into card drafts', async () => {
    const wrapper = mount()
    await wrapper.find('textarea').setValue('front1::back1\nfront2::back2')
    await importButton(wrapper).trigger('click')
    // Each parsed line yields one front + one back Card preview, so two lines
    // = four Card stubs.
    const cardStubs = wrapper.findAllComponents({ name: 'Card' })
    expect(cardStubs).toHaveLength(4)
    expect(cardStubs[0].props('front_text')).toBe('front1')
    expect(cardStubs[1].props('back_text')).toBe('back1')
  })

  test('trims whitespace around each parsed field', async () => {
    const wrapper = mount()
    await wrapper.find('textarea').setValue('  hello  ::  world  ')
    await importButton(wrapper).trigger('click')
    // Parsed cards become previews; the trim is internal — we re-trigger save
    // and inspect the payload sent to the mutation.
    await saveButton(wrapper).trigger('click')
    const [args] = bulkInsertMock.mock.calls[0]
    expect(args.cards[0]).toEqual({ front_text: 'hello', back_text: 'world' })
  })

  // ── onSave: routes through useBulkInsertCardsInDeckMutation ────────────────

  test('passes deck_id from props through to the bulk-insert mutation', async () => {
    const wrapper = mount({ deck_id: 99 })
    await wrapper.find('textarea').setValue('a::b')
    await importButton(wrapper).trigger('click')
    await saveButton(wrapper).trigger('click')
    const [args] = bulkInsertMock.mock.calls[0]
    expect(args.deck_id).toBe(99)
  })

  test('sends every parsed card to the bulk-insert mutation in order', async () => {
    const wrapper = mount()
    await wrapper.find('textarea').setValue('a1::b1\na2::b2\na3::b3')
    await importButton(wrapper).trigger('click')
    await saveButton(wrapper).trigger('click')
    const [args] = bulkInsertMock.mock.calls[0]
    expect(args.cards).toEqual([
      { front_text: 'a1', back_text: 'b1' },
      { front_text: 'a2', back_text: 'b2' },
      { front_text: 'a3', back_text: 'b3' }
    ])
  })

  test('clears the parsed cards after a successful save', async () => {
    const wrapper = mount()
    await wrapper.find('textarea').setValue('a::b')
    await importButton(wrapper).trigger('click')
    await saveButton(wrapper).trigger('click')
    await wrapper.vm.$nextTick()
    // Save button re-disables once the parsed cards are cleared (back to the
    // empty state where has_unsaved_changes is false).
    expect(saveButton(wrapper).props('disabled')).toBe(true)
  })

  // ── Save button gating ─────────────────────────────────────────────────────

  test('disables the save button when there are no parsed cards', () => {
    const wrapper = mount()
    expect(saveButton(wrapper).props('disabled')).toBe(true)
  })

  test('enables the save button after import populates cards', async () => {
    const wrapper = mount()
    await wrapper.find('textarea').setValue('a::b')
    await importButton(wrapper).trigger('click')
    expect(saveButton(wrapper).props('disabled')).toBe(false)
  })

  test('does not call the mutation when save is clicked with nothing parsed', async () => {
    const wrapper = mount()
    await saveButton(wrapper).trigger('click')
    expect(bulkInsertMock).not.toHaveBeenCalled()
  })

  // ── Card-limit gate (obligation tests) ────────────────────────────────────

  test('passes cards.length to guardAddCards so a batch that crosses the cap is rejected', async () => {
    const wrapper = mount()
    await wrapper.find('textarea').setValue('a1::b1\na2::b2\na3::b3')
    await importButton(wrapper).trigger('click')
    await saveButton(wrapper).trigger('click')
    expect(guardAddCardsMock).toHaveBeenCalledWith(3)
  })

  test('does not call the mutation when guardAddCards resolves false', async () => {
    guardAddCardsMock.mockResolvedValue(false)
    const wrapper = mount()
    await wrapper.find('textarea').setValue('a::b')
    await importButton(wrapper).trigger('click')
    await saveButton(wrapper).trigger('click')
    expect(bulkInsertMock).not.toHaveBeenCalled()
  })

  test('calls handleLimitError on a failed save and skips the generic toast when it returns true', async () => {
    const pt402 = { code: 'PT402', message: 'limit exceeded' }
    bulkInsertMock.mockRejectedValueOnce(pt402)
    handleLimitErrorMock.mockReturnValue(true)
    const wrapper = mount()
    await wrapper.find('textarea').setValue('a::b')
    await importButton(wrapper).trigger('click')
    await saveButton(wrapper).trigger('click')
    expect(handleLimitErrorMock).toHaveBeenCalledWith(pt402)
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  test('shows the generic toast when handleLimitError returns false (non-PT402 error)', async () => {
    const generic = new Error('server error')
    bulkInsertMock.mockRejectedValueOnce(generic)
    handleLimitErrorMock.mockReturnValue(false)
    const wrapper = mount()
    await wrapper.find('textarea').setValue('a::b')
    await importButton(wrapper).trigger('click')
    await saveButton(wrapper).trigger('click')
    expect(handleLimitErrorMock).toHaveBeenCalledWith(generic)
    expect(toastErrorMock).toHaveBeenCalled()
  })
})
