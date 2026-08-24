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

// creating_deck is module-scoped with no setter — reset it between tests by
// re-importing the module fresh each time, per test-authoring's fallback.
async function loadUseNewDeckAction() {
  vi.resetModules()
  const mod = await import('@/views/dashboard/composables/new-deck-action')
  return mod.useNewDeckAction
}

describe('useNewDeckAction', () => {
  beforeEach(() => {
    mockCreateDeck.mockReset()
    mockCreateDeck.mockResolvedValue({ id: 1, title: 'New Deck' })
    mockEmitSfx.mockClear()
  })

  test('calls deck_actions.createDeck with a single argument, no options object [obligation]', async () => {
    const useNewDeckAction = await loadUseNewDeckAction()
    const { createNewDeck } = useNewDeckAction()

    await createNewDeck()

    expect(mockCreateDeck).toHaveBeenCalledTimes(1)
    expect(mockCreateDeck.mock.calls[0]).toHaveLength(1)
  })

  test('sets creating_deck to true while the create is in flight, then back to false', async () => {
    let resolveCreate
    mockCreateDeck.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )
    const useNewDeckAction = await loadUseNewDeckAction()
    const { creating_deck, createNewDeck } = useNewDeckAction()

    const pending = createNewDeck()
    expect(creating_deck.value).toBe(true)

    resolveCreate({ id: 1, title: 'New Deck' })
    await pending

    expect(creating_deck.value).toBe(false)
  })

  test('createNewDeck is a no-op when creating_deck is already true', async () => {
    let resolveCreate
    mockCreateDeck.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )
    const useNewDeckAction = await loadUseNewDeckAction()
    const { creating_deck, createNewDeck } = useNewDeckAction()

    const first = createNewDeck()
    expect(creating_deck.value).toBe(true)

    const second = createNewDeck()

    resolveCreate({ id: 1, title: 'New Deck' })
    await Promise.all([first, second])

    expect(mockCreateDeck).toHaveBeenCalledTimes(1)
  })

  test('emits dialog.open sfx when a new deck creation starts', async () => {
    const useNewDeckAction = await loadUseNewDeckAction()
    const { createNewDeck } = useNewDeckAction()

    await createNewDeck()

    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open')
  })

  describe('module-scoped single-flight guard across separate instances [obligation]', () => {
    test('a create started via one useNewDeckAction() instance blocks another instance', async () => {
      let resolveCreate
      mockCreateDeck.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveCreate = resolve
        })
      )
      const useNewDeckAction = await loadUseNewDeckAction()

      const grid_card_instance = useNewDeckAction()
      const mobile_footer_instance = useNewDeckAction()

      const first = grid_card_instance.createNewDeck()
      expect(mobile_footer_instance.creating_deck.value).toBe(true)

      await mobile_footer_instance.createNewDeck()
      expect(mockCreateDeck).toHaveBeenCalledTimes(1)

      resolveCreate({ id: 1, title: 'New Deck' })
      await first
    })

    test('creating_deck flips back to false on every instance once the create settles', async () => {
      const useNewDeckAction = await loadUseNewDeckAction()
      const instance_a = useNewDeckAction()
      const instance_b = useNewDeckAction()

      await instance_a.createNewDeck()

      expect(instance_a.creating_deck.value).toBe(false)
      expect(instance_b.creating_deck.value).toBe(false)
    })
  })
})
