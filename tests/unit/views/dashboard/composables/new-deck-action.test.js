import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

const { mockCreateDeck, mockEmitSfx } = vi.hoisted(() => ({
  mockCreateDeck: vi.fn(),
  mockEmitSfx: vi.fn()
}))

vi.mock('@/composables/deck/actions', () => ({
  useDeckActions: () => ({ createDeck: mockCreateDeck })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

import { useNewDeckAction } from '@/views/dashboard/composables/new-deck-action'

describe('useNewDeckAction', () => {
  beforeEach(() => {
    mockCreateDeck.mockReset()
    mockCreateDeck.mockResolvedValue({ id: 1, title: 'New Deck' })
    mockEmitSfx.mockClear()
  })

  test('calls deck_actions.createDeck with openSettingsAfterCreate: true', async () => {
    const { createNewDeck } = useNewDeckAction()

    await createNewDeck()

    expect(mockCreateDeck).toHaveBeenCalledWith(expect.any(Object), {
      openSettingsAfterCreate: true
    })
  })

  test('sets creating_deck to true while the create is in flight, then back to false', async () => {
    let resolveCreate
    mockCreateDeck.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )
    const { creating_deck, createNewDeck } = useNewDeckAction()

    const pending = createNewDeck()
    expect(creating_deck.value).toBe(true)

    resolveCreate({ id: 1, title: 'New Deck' })
    await pending

    expect(creating_deck.value).toBe(false)
  })

  test('createNewDeck is a no-op when creating_deck is already true [obligation]', async () => {
    let resolveCreate
    mockCreateDeck.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )
    const { creating_deck, createNewDeck } = useNewDeckAction()

    const first = createNewDeck()
    expect(creating_deck.value).toBe(true)

    const second = createNewDeck()

    resolveCreate({ id: 1, title: 'New Deck' })
    await Promise.all([first, second])

    expect(mockCreateDeck).toHaveBeenCalledTimes(1)
  })

  test('emits pop_up_pop sfx when a new deck creation starts', async () => {
    const { createNewDeck } = useNewDeckAction()

    await createNewDeck()

    expect(mockEmitSfx).toHaveBeenCalledWith('pop_up_pop')
  })
})
