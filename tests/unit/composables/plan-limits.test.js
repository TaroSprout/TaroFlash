import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

let planRef
let dataRef

vi.mock('@/stores/member', async () => {
  const { ref } = await vi.importActual('vue')
  planRef = ref(undefined)
  return {
    useMemberStore: () => ({
      get plan() {
        return planRef.value
      }
    })
  }
})

vi.mock('@/api/plans', async () => {
  const { ref } = await vi.importActual('vue')
  dataRef = ref(undefined)
  return {
    usePlanLimitsQuery: () => ({ data: dataRef })
  }
})

const { usePlanLimits } = await import('@/composables/plan-limits')

describe('usePlanLimits', () => {
  beforeEach(() => {
    planRef.value = undefined
    dataRef.value = undefined
  })

  test('defaults to the "free" plan row when member.plan is undefined', () => {
    dataRef.value = [
      { id: 'free', deck_limit: 10, cards_per_deck_limit: 500 },
      { id: 'paid', deck_limit: null, cards_per_deck_limit: null }
    ]
    const { deckLimit, cardsPerDeckLimit } = usePlanLimits()
    expect(deckLimit.value).toBe(10)
    expect(cardsPerDeckLimit.value).toBe(500)
  })

  test('sources limits from the row matching the member plan', () => {
    planRef.value = 'paid'
    dataRef.value = [
      { id: 'free', deck_limit: 10, cards_per_deck_limit: 500 },
      { id: 'paid', deck_limit: null, cards_per_deck_limit: null }
    ]
    const { deckLimit, cardsPerDeckLimit } = usePlanLimits()
    expect(deckLimit.value).toBeNull()
    expect(cardsPerDeckLimit.value).toBeNull()
  })

  test('returns null for both limits when no matching plan row is found', () => {
    planRef.value = 'paid'
    dataRef.value = [{ id: 'free', deck_limit: 10, cards_per_deck_limit: 500 }]
    const { deckLimit, cardsPerDeckLimit } = usePlanLimits()
    expect(deckLimit.value).toBeNull()
    expect(cardsPerDeckLimit.value).toBeNull()
  })

  test('returns null for both limits when the query has no data yet', () => {
    dataRef.value = undefined
    const { deckLimit, cardsPerDeckLimit } = usePlanLimits()
    expect(deckLimit.value).toBeNull()
    expect(cardsPerDeckLimit.value).toBeNull()
  })

  test('is reactive to the query data resolving after the composable is called', () => {
    const { deckLimit } = usePlanLimits()
    expect(deckLimit.value).toBeNull()

    dataRef.value = [{ id: 'free', deck_limit: 10, cards_per_deck_limit: 500 }]
    expect(deckLimit.value).toBe(10)
  })

  test('is reactive to the member plan changing', () => {
    dataRef.value = [
      { id: 'free', deck_limit: 10, cards_per_deck_limit: 500 },
      { id: 'paid', deck_limit: null, cards_per_deck_limit: null }
    ]
    const { deckLimit } = usePlanLimits()
    expect(deckLimit.value).toBe(10)

    planRef.value = 'paid'
    expect(deckLimit.value).toBeNull()
  })
})
