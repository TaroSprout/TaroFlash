import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, nextTick } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, mockOpen, mockClose } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockOpen: vi.fn(),
  mockClose: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: mockOpen })
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import {
  useMobileCardEditor,
  mobileCardEditorKey
} from '@/views/deck/mobile-editor/use-mobile-card-editor'
import MobileEditor from '@/views/deck/mobile-editor/index.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return {
    id: null,
    client_id: 'cid-1',
    front_text: '',
    back_text: '',
    front_image_path: null,
    back_image_path: null,
    deck_id: 1,
    ...overrides
  }
}

// Minimal controller stub — the composable only touches list.all_cards,
// updateCard, actions.onMoveCards, actions.onDeleteCards, card_attributes, and saving.
function makeController(cards = []) {
  const all_cards = ref(cards)
  const updateCard = vi.fn().mockResolvedValue(undefined)
  const onMoveCards = vi.fn().mockResolvedValue(undefined)
  const onDeleteCards = vi.fn().mockResolvedValue(undefined)
  const addCard = vi.fn().mockResolvedValue(undefined)
  return {
    list: { all_cards },
    card_attributes: { front: {}, back: {} },
    saving: ref(false),
    updateCard,
    addCard,
    actions: { onMoveCards, onDeleteCards }
  }
}

function makeEditor(cards = []) {
  const controller = makeController(cards)
  const editor = useMobileCardEditor(controller)
  return { editor, controller }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockEmitSfx.mockClear()
  mockOpen.mockClear()
  mockClose.mockClear()
  mockOpen.mockReturnValue({ response: Promise.resolve(), close: mockClose })
})

describe('useMobileCardEditor — initial state', () => {
  test('current is undefined when no cursor is set', () => {
    const { editor } = makeEditor([makeCard()])
    expect(editor.current.value).toBeUndefined()
  })

  test('side defaults to front', () => {
    const { editor } = makeEditor()
    expect(editor.side.value).toBe('front')
  })
})

describe('useMobileCardEditor — open_at', () => {
  test('open_at opens the editor via useModal().open with MobileEditor, mode popup, and the editor context', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')

    expect(mockOpen).toHaveBeenCalledWith(MobileEditor, {
      mode: 'popup',
      backdrop: true,
      context: { key: mobileCardEditorKey, value: editor }
    })
  })

  test('open_at sets cursor to the given client_id', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    expect(editor.current.value?.client_id).toBe('cid-1')
  })

  test('open_at resets side to front', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.side.value = 'back'
    editor.open_at('cid-1')
    expect(editor.side.value).toBe('front')
  })

  test('open_at emits dialog.open', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open')
  })

  test('open_at with no arg opens at the first card', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const c2 = makeCard({ client_id: 'cid-2' })
    const { editor } = makeEditor([c1, c2])
    editor.open_at()
    expect(editor.current.value?.client_id).toBe('cid-1')
  })

  test('open_at is a no-op when the deck is empty', () => {
    const { editor } = makeEditor([])
    editor.open_at()
    expect(mockOpen).not.toHaveBeenCalled()
  })

  test('calling open_at again while already open does not push a second modal', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const c2 = makeCard({ client_id: 'cid-2' })
    const { editor } = makeEditor([c1, c2])

    editor.open_at('cid-1')
    editor.open_at('cid-2')

    expect(mockOpen).toHaveBeenCalledTimes(1)
    expect(editor.current.value?.client_id).toBe('cid-2')
  })

  test('reopening after onClosed pushes a new modal', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([c1])

    editor.open_at('cid-1')
    editor.close()
    editor.onClosed()
    editor.open_at('cid-1')

    expect(mockOpen).toHaveBeenCalledTimes(2)
  })
})

describe('useMobileCardEditor — openNewCard', () => {
  test('openNewCard stages via controller.addCard and opens the editor on the returned client_id', async () => {
    const card = makeCard({ client_id: 'cid-new' })
    const { editor, controller } = makeEditor([card])
    controller.addCard.mockResolvedValue('cid-new')

    await editor.openNewCard()

    expect(controller.addCard).toHaveBeenCalledOnce()
    expect(editor.current.value?.client_id).toBe('cid-new')
    expect(mockOpen).toHaveBeenCalledOnce()
  })

  test('openNewCard is a no-op when addCard stages nothing (plan cap gated)', async () => {
    const { editor, controller } = makeEditor([])
    controller.addCard.mockResolvedValue(undefined)

    await editor.openNewCard()

    expect(mockOpen).not.toHaveBeenCalled()
  })
})

describe('useMobileCardEditor — close', () => {
  test('close invokes the close function returned by modal.open', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    editor.close()
    expect(mockClose).toHaveBeenCalled()
  })

  test('close is a no-op (does not throw) when the editor was never opened', () => {
    const { editor } = makeEditor([])
    expect(() => editor.close()).not.toThrow()
    expect(mockClose).not.toHaveBeenCalled()
  })
})

describe('useMobileCardEditor — onClosed', () => {
  test('onClosed emits ui.press', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    mockEmitSfx.mockClear()
    editor.onClosed()
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
  })

  test('onClosed resets internal state so a later open_at reopens the editor', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    editor.onClosed()
    editor.open_at('cid-1')
    expect(mockOpen).toHaveBeenCalledTimes(2)
  })
})

describe('useMobileCardEditor — flip', () => {
  test('flip toggles side from front to back', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    editor.flip()
    expect(editor.side.value).toBe('back')
  })

  test('flip toggles side from back to front', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    editor.flip()
    editor.flip()
    expect(editor.side.value).toBe('front')
  })

  test('flip emits card.flip-away when landing on back', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    mockEmitSfx.mockClear()
    editor.flip()
    expect(mockEmitSfx).toHaveBeenCalledWith('card.flip-away')
  })

  test('flip emits card.flip-back when landing on front', () => {
    const card = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    editor.flip()
    mockEmitSfx.mockClear()
    editor.flip()
    expect(mockEmitSfx).toHaveBeenCalledWith('card.flip-back')
  })
})

describe('useMobileCardEditor — prev/next', () => {
  test('next steps cursor to the next card by client_id', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const c2 = makeCard({ client_id: 'cid-2' })
    const { editor } = makeEditor([c1, c2])
    editor.open_at('cid-1')
    editor.next()
    expect(editor.current.value?.client_id).toBe('cid-2')
  })

  test('next resets side to front', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const c2 = makeCard({ client_id: 'cid-2' })
    const { editor } = makeEditor([c1, c2])
    editor.open_at('cid-1')
    editor.flip()
    editor.next()
    expect(editor.side.value).toBe('front')
  })

  test('next is a no-op at the last card (has_next is false)', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([c1])
    editor.open_at('cid-1')
    editor.next()
    expect(editor.current.value?.client_id).toBe('cid-1')
    expect(editor.has_next.value).toBe(false)
  })

  test('prev steps cursor to the previous card by client_id', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const c2 = makeCard({ client_id: 'cid-2' })
    const { editor } = makeEditor([c1, c2])
    editor.open_at('cid-2')
    editor.prev()
    expect(editor.current.value?.client_id).toBe('cid-1')
  })

  test('prev resets side to front', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const c2 = makeCard({ client_id: 'cid-2' })
    const { editor } = makeEditor([c1, c2])
    editor.open_at('cid-2')
    editor.flip()
    editor.prev()
    expect(editor.side.value).toBe('front')
  })

  test('prev is a no-op at the first card (has_prev is false)', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const { editor } = makeEditor([c1])
    editor.open_at('cid-1')
    editor.prev()
    expect(editor.current.value?.client_id).toBe('cid-1')
    expect(editor.has_prev.value).toBe(false)
  })

  test('has_prev is true when index > 0', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const c2 = makeCard({ client_id: 'cid-2' })
    const { editor } = makeEditor([c1, c2])
    editor.open_at('cid-2')
    expect(editor.has_prev.value).toBe(true)
  })

  test('has_next is true when not at the last card', () => {
    const c1 = makeCard({ client_id: 'cid-1' })
    const c2 = makeCard({ client_id: 'cid-2' })
    const { editor } = makeEditor([c1, c2])
    editor.open_at('cid-1')
    expect(editor.has_next.value).toBe(true)
  })
})

describe('useMobileCardEditor — cursor re-derives on id change', () => {
  test('current re-derives to the promoted card when id changes but client_id is stable', async () => {
    const card = makeCard({ id: null, client_id: 'cid-stable' })
    const { editor, controller } = makeEditor([card])
    editor.open_at('cid-stable')

    // Simulate temp→real id promotion: same client_id, now has a real id
    const promoted = { ...card, id: 42 }
    controller.list.all_cards.value = [promoted]
    await nextTick()

    expect(editor.current.value?.id).toBe(42)
    expect(editor.current.value?.client_id).toBe('cid-stable')
  })
})

describe('useMobileCardEditor — update', () => {
  test('update calls controller.updateCard with the card id and only the edited side', async () => {
    const card = makeCard({ id: 10, client_id: 'cid-1' })
    const { editor, controller } = makeEditor([card])
    editor.open_at('cid-1')

    editor.update('front', 'new front text')

    expect(controller.updateCard).toHaveBeenCalledWith(10, { front_text: 'new front text' })
  })

  test('update for back side sends only back_text', () => {
    const card = makeCard({ id: 10, client_id: 'cid-1' })
    const { editor, controller } = makeEditor([card])
    editor.open_at('cid-1')

    editor.update('back', 'new back text')

    expect(controller.updateCard).toHaveBeenCalledWith(10, { back_text: 'new back text' })
  })

  test('update is a no-op when no current card', () => {
    const { editor, controller } = makeEditor([])
    editor.update('front', 'text')
    expect(controller.updateCard).not.toHaveBeenCalled()
  })
})

describe('useMobileCardEditor — has_image', () => {
  test('has_image is true on front side when front_image_path is set', () => {
    const card = makeCard({ client_id: 'cid-1', front_image_path: 'img/f.jpg' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    expect(editor.side.value).toBe('front')
    expect(editor.has_image.value).toBe(true)
  })

  test('has_image is false on front side when front_image_path is null', () => {
    const card = makeCard({ client_id: 'cid-1', front_image_path: null })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    expect(editor.has_image.value).toBe(false)
  })

  test('has_image is true on back side when back_image_path is set', () => {
    const card = makeCard({ client_id: 'cid-1', back_image_path: 'img/b.jpg' })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    editor.flip() // side → back
    expect(editor.has_image.value).toBe(true)
  })

  test('has_image is false on back side when back_image_path is null', () => {
    const card = makeCard({ client_id: 'cid-1', back_image_path: null })
    const { editor } = makeEditor([card])
    editor.open_at('cid-1')
    editor.flip() // side → back
    expect(editor.has_image.value).toBe(false)
  })
})

describe('useMobileCardEditor — moveCard/deleteCard', () => {
  test('moveCard calls controller.actions.onMoveCards with current card id', async () => {
    const card = makeCard({ id: 5, client_id: 'cid-1' })
    const { editor, controller } = makeEditor([card])
    editor.open_at('cid-1')

    await editor.moveCard()

    expect(controller.actions.onMoveCards).toHaveBeenCalledWith(5)
  })

  test('deleteCard calls controller.actions.onDeleteCards with current card id', async () => {
    const card = makeCard({ id: 5, client_id: 'cid-1' })
    const { editor, controller } = makeEditor([card])
    editor.open_at('cid-1')

    await editor.deleteCard()

    expect(controller.actions.onDeleteCards).toHaveBeenCalledWith(5)
  })

  test('deleteCard is a no-op when no current card', async () => {
    const { editor, controller } = makeEditor([])
    await editor.deleteCard()
    expect(controller.actions.onDeleteCards).not.toHaveBeenCalled()
  })
})

describe('useMobileCardEditor — reconcileCursor after delete', () => {
  test('lands on card at the old slot when the deleted card is gone', async () => {
    const c1 = makeCard({ id: 1, client_id: 'cid-1' })
    const c2 = makeCard({ id: 2, client_id: 'cid-2' })
    const c3 = makeCard({ id: 3, client_id: 'cid-3' })
    const { editor, controller } = makeEditor([c1, c2, c3])
    editor.open_at('cid-2') // index = 1

    // Simulate the card being deleted (removed from the list by the action)
    controller.actions.onDeleteCards.mockImplementationOnce(async () => {
      controller.list.all_cards.value = [c1, c3]
    })

    await editor.deleteCard()
    await nextTick()

    // Old index was 1; after deletion the list is [c1, c3], so index 1 = c3
    expect(editor.current.value?.client_id).toBe('cid-3')
  })

  test('lands on the last card when deleting the last one', async () => {
    const c1 = makeCard({ id: 1, client_id: 'cid-1' })
    const c2 = makeCard({ id: 2, client_id: 'cid-2' })
    const { editor, controller } = makeEditor([c1, c2])
    editor.open_at('cid-2') // index = 1 (last)

    controller.actions.onDeleteCards.mockImplementationOnce(async () => {
      controller.list.all_cards.value = [c1]
    })

    await editor.deleteCard()
    await nextTick()

    // Old index was 1; new last is index 0 → c1
    expect(editor.current.value?.client_id).toBe('cid-1')
  })

  test('closes (via modal close) when the deck becomes empty after delete', async () => {
    const card = makeCard({ id: 1, client_id: 'cid-1' })
    const { editor, controller } = makeEditor([card])
    editor.open_at('cid-1')

    controller.actions.onDeleteCards.mockImplementationOnce(async () => {
      controller.list.all_cards.value = []
    })

    await editor.deleteCard()
    await nextTick()

    expect(mockClose).toHaveBeenCalled()
  })

  test('reconcileCursor is a no-op when the card is still present (user dismissed modal)', async () => {
    const c1 = makeCard({ id: 1, client_id: 'cid-1' })
    const { editor, controller } = makeEditor([c1])
    editor.open_at('cid-1')

    // onDeleteCards resolves without removing the card (dismiss path)
    controller.actions.onDeleteCards.mockResolvedValueOnce(undefined)
    mockClose.mockClear()

    await editor.deleteCard()
    await nextTick()

    // Card is still in the list, cursor stays on it, and the modal was not closed
    expect(editor.current.value?.client_id).toBe('cid-1')
    expect(mockClose).not.toHaveBeenCalled()
  })
})
