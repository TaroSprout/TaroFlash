import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { alertWarnMock, modalOpenMock } = vi.hoisted(() => ({
  alertWarnMock: vi.fn(),
  modalOpenMock: vi.fn()
}))

vi.mock('@/composables/alert', () => ({
  useAlert: () => ({ warn: alertWarnMock })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

vi.mock('@/components/modals/checkout.vue', () => ({ default: {} }))

// Member store sources plan from the member query data — use a reactive ref so
// tests can control the plan by setting memberDataRef.value.
const memberDataRef = ref(null)

vi.mock('@/api/members', () => ({
  useCurrentMemberQuery: () => ({ data: memberDataRef })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ user: null })
}))

import { useCardLimitGate } from '@/composables/use-card-limit-gate'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDeck(card_count = 0) {
  return ref({ id: 1, card_count })
}

function makeGate(deck_ref = ref(undefined)) {
  return useCardLimitGate(() => deck_ref.value)
}

function makePaidGate() {
  memberDataRef.value = { plan: 'paid' }
  return makeGate(makeDeck(999))
}

function makeFreeGate(card_count = 0) {
  memberDataRef.value = { plan: 'free' }
  return makeGate(makeDeck(card_count))
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  memberDataRef.value = null

  alertWarnMock.mockReset()
  // Default: user dismisses the alert (confirmed = false)
  alertWarnMock.mockReturnValue({ response: Promise.resolve(false) })

  modalOpenMock.mockReset()
})

// ── guardAddCards ─────────────────────────────────────────────────────────────

describe('guardAddCards', () => {
  test('resolves true for a paid member regardless of card_count', async () => {
    const { guardAddCards } = makePaidGate()
    expect(await guardAddCards()).toBe(true)
    expect(await guardAddCards(1000)).toBe(true)
  })

  test('resolves true for a free member when count + adding is within the 200 cap', async () => {
    const { guardAddCards } = makeFreeGate(100)
    expect(await guardAddCards(99)).toBe(true)
  })

  test('resolves true when count + adding equals the limit exactly (boundary must still pass)', async () => {
    const { guardAddCards } = makeFreeGate(199)
    expect(await guardAddCards(1)).toBe(true)
  })

  test('resolves false when count + adding would exceed the 200 cap', async () => {
    const { guardAddCards } = makeFreeGate(199)
    expect(await guardAddCards(2)).toBe(false)
  })

  test('resolves false at count = 200 + adding = 1', async () => {
    const { guardAddCards } = makeFreeGate(200)
    expect(await guardAddCards()).toBe(false)
  })

  test('honors the adding argument — a batch crossing the cap is rejected even when a single add passes', async () => {
    const { guardAddCards } = makeFreeGate(195)
    expect(await guardAddCards(1)).toBe(true)
    expect(await guardAddCards(6)).toBe(false)
  })

  test('defaults adding to 1 when not supplied', async () => {
    const { guardAddCards } = makeFreeGate(200)
    expect(await guardAddCards()).toBe(false)
  })

  test('treats card_count as 0 when the deck ref is undefined', async () => {
    memberDataRef.value = { plan: 'free' }
    const { guardAddCards } = makeGate(ref(undefined))
    // 0 + 200 = 200 = limit → should pass
    expect(await guardAddCards(200)).toBe(true)
  })

  test('treats card_count as 0 when the deck card_count is undefined', async () => {
    memberDataRef.value = { plan: 'free' }
    const deck = ref({ id: 1 }) // no card_count field
    const { guardAddCards } = useCardLimitGate(() => deck.value)
    expect(await guardAddCards(200)).toBe(true)
  })

  test('treats a null/undefined member.plan as the free plan', async () => {
    memberDataRef.value = null
    const { guardAddCards } = makeGate(makeDeck(200))
    expect(await guardAddCards()).toBe(false)
  })

  test('shows the upgrade alert when the cap is exceeded', async () => {
    const { guardAddCards } = makeFreeGate(200)
    await guardAddCards()
    expect(alertWarnMock).toHaveBeenCalledOnce()
  })

  test('resolves false after showing the alert regardless of whether confirmed', async () => {
    alertWarnMock.mockReturnValue({ response: Promise.resolve(false) })
    const { guardAddCards } = makeFreeGate(200)
    expect(await guardAddCards()).toBe(false)
  })

  test('opens the Checkout modal when the alert is confirmed', async () => {
    alertWarnMock.mockReturnValue({ response: Promise.resolve(true) })
    const { guardAddCards } = makeFreeGate(200)
    await guardAddCards()
    expect(modalOpenMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mode: 'mobile-sheet' })
    )
  })

  test('does not open the Checkout modal when the alert is dismissed', async () => {
    alertWarnMock.mockReturnValue({ response: Promise.resolve(false) })
    const { guardAddCards } = makeFreeGate(200)
    await guardAddCards()
    expect(modalOpenMock).not.toHaveBeenCalled()
  })
})

// ── handleLimitError ──────────────────────────────────────────────────────────

describe('handleLimitError', () => {
  test('returns true for a PT001 error code', () => {
    const { handleLimitError } = makeGate()
    expect(handleLimitError({ code: 'PT001' })).toBe(true)
  })

  test('returns false for a P0001 code (rank-precision retry — must NOT be swallowed)', () => {
    const { handleLimitError } = makeGate()
    expect(handleLimitError({ code: 'P0001' })).toBe(false)
  })

  test('returns false for a generic Error object', () => {
    const { handleLimitError } = makeGate()
    expect(handleLimitError(new Error('boom'))).toBe(false)
  })

  test('returns false for null', () => {
    const { handleLimitError } = makeGate()
    expect(handleLimitError(null)).toBe(false)
  })

  test('returns false for a string error', () => {
    const { handleLimitError } = makeGate()
    expect(handleLimitError('some error')).toBe(false)
  })

  test('shows the upgrade alert (fire-and-forget) when handling a PT001 error', () => {
    const { handleLimitError } = makeGate()
    handleLimitError({ code: 'PT001' })
    expect(alertWarnMock).toHaveBeenCalledOnce()
  })

  test('does not show the alert for non-PT001 errors', () => {
    const { handleLimitError } = makeGate()
    handleLimitError({ code: 'P0001' })
    handleLimitError(new Error('boom'))
    expect(alertWarnMock).not.toHaveBeenCalled()
  })
})

// ── Reactive deck getter ──────────────────────────────────────────────────────

describe('reactive deck getter', () => {
  test('card_count is read reactively — updating the deck ref updates the gate', async () => {
    memberDataRef.value = { plan: 'free' }
    const deck = ref({ id: 1, card_count: 100 })
    const { guardAddCards } = useCardLimitGate(() => deck.value)

    expect(await guardAddCards(100)).toBe(true)

    deck.value = { id: 1, card_count: 200 }
    expect(await guardAddCards(1)).toBe(false)
  })
})
