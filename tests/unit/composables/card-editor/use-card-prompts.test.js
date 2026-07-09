import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useCardPrompts } from '@/composables/card/prompts'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { alertWarnMock, modalOpenMock, emitSfxMock } = vi.hoisted(() => ({
  alertWarnMock: vi.fn(),
  modalOpenMock: vi.fn(),
  emitSfxMock: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => (params ? `${key}(${JSON.stringify(params)})` : key) })
}))

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: alertWarnMock })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock
}))

vi.mock('@/components/card/move-cards-modal.vue', () => ({ default: {} }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return { id: 1, deck_id: 10, front_text: 'Q', back_text: 'A', ...overrides }
}

beforeEach(() => {
  alertWarnMock.mockReset()
  modalOpenMock.mockReset()
  emitSfxMock.mockReset()
})

// ── confirmDelete ─────────────────────────────────────────────────────────────

describe('useCardPrompts — confirmDelete [obligation]', () => {
  test('calls alert.warn with the pluralized delete-card keys (count=1) [obligation]', async () => {
    alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
    const { confirmDelete } = useCardPrompts()

    await confirmDelete(1)

    expect(alertWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('alert.delete-card.title'),
        message: expect.stringContaining('alert.delete-card.message'),
        confirmLabel: 'alert.delete-card.confirm'
      })
    )
  })

  test('calls alert.warn with count passed to i18n (count=3) [obligation]', async () => {
    alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(false) })
    const { confirmDelete } = useCardPrompts()

    await confirmDelete(3)

    const args = alertWarnMock.mock.calls[0][0]
    expect(args.title).toContain('"count":3')
    expect(args.message).toContain('"count":3')
  })

  test('resolves to true when user confirms [obligation]', async () => {
    alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(true) })
    const { confirmDelete } = useCardPrompts()

    const result = await confirmDelete(1)

    expect(result).toBe(true)
  })

  test('resolves to false when user dismisses [obligation]', async () => {
    alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(false) })
    const { confirmDelete } = useCardPrompts()

    const result = await confirmDelete(1)

    expect(result).toBe(false)
  })

  test('includes confirmAudio: trash_crumple_short', async () => {
    alertWarnMock.mockReturnValueOnce({ response: Promise.resolve(false) })
    const { confirmDelete } = useCardPrompts()

    await confirmDelete(1)

    expect(alertWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({ confirmAudio: 'trash_crumple_short' })
    )
  })
})

// ── openMoveModal ─────────────────────────────────────────────────────────────

describe('useCardPrompts — openMoveModal [obligation]', () => {
  test('opens the modal with the provided cards, count, and current_deck_id [obligation]', async () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
    modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
    const { openMoveModal } = useCardPrompts()

    await openMoveModal(cards, 2, 10)

    expect(modalOpenMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        props: { cards, count: 2, current_deck_id: 10 }
      })
    )
  })

  test('forwards the move callback into the modal props [obligation]', async () => {
    modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
    const { openMoveModal } = useCardPrompts()
    const move = async () => {}

    await openMoveModal([makeCard()], 1, 10, move)

    const [, options] = modalOpenMock.mock.calls[0]
    expect(options.props.move).toBe(move)
  })

  test('opens the modal with mode: popup', async () => {
    modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
    const { openMoveModal } = useCardPrompts()

    await openMoveModal([makeCard()], 1, 10)

    expect(modalOpenMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mode: 'popup' })
    )
  })

  test('emits double_pop_up before the modal opens [obligation]', async () => {
    modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
    const { openMoveModal } = useCardPrompts()

    await openMoveModal([makeCard()], 1, 10)

    expect(emitSfxMock).toHaveBeenCalledWith('double_pop_up')
  })

  test('emits double_pop_down once the modal settles [obligation]', async () => {
    modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
    const { openMoveModal } = useCardPrompts()

    await openMoveModal([makeCard()], 1, 10)

    expect(emitSfxMock).toHaveBeenCalledWith('double_pop_down')
  })

  test('resolves to the chosen deck when user confirms [obligation]', async () => {
    const target = { deck_id: 99 }
    modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(target) })
    const { openMoveModal } = useCardPrompts()

    const result = await openMoveModal([makeCard()], 1, 10)

    expect(result).toEqual(target)
  })

  test('resolves to undefined when modal is dismissed [obligation]', async () => {
    modalOpenMock.mockReturnValueOnce({ response: Promise.resolve(undefined) })
    const { openMoveModal } = useCardPrompts()

    const result = await openMoveModal([makeCard()], 1, 10)

    expect(result).toBeUndefined()
  })
})
