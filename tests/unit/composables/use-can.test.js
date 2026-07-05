import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

let planRef
let deckCountRef
let roleRef
let deckLimitRef
let cardsPerDeckLimitRef

vi.mock('@/stores/member', async () => {
  const { ref } = await vi.importActual('vue')
  planRef = ref(null)
  roleRef = ref(null)
  return {
    useMemberStore: () => ({
      get plan() {
        return planRef.value
      },
      get role() {
        return roleRef.value
      }
    })
  }
})

vi.mock('@/api/decks', async () => {
  const { ref } = await vi.importActual('vue')
  deckCountRef = ref(0)
  return {
    useMemberDeckCountQuery: () => ({ data: deckCountRef })
  }
})

vi.mock('@/composables/plan-limits', async () => {
  const { ref } = await vi.importActual('vue')
  deckLimitRef = ref(5)
  cardsPerDeckLimitRef = ref(200)
  return {
    usePlanLimits: () => ({ deckLimit: deckLimitRef, cardsPerDeckLimit: cardsPerDeckLimitRef })
  }
})

const { useCan } = await import('@/composables/can')

describe('useCan', () => {
  beforeEach(() => {
    planRef.value = null
    deckCountRef.value = 0
    roleRef.value = null
    deckLimitRef.value = 5
    cardsPerDeckLimitRef.value = 200
  })

  describe('useProFeature', () => {
    test('true when plan is paid', () => {
      planRef.value = 'paid'
      expect(useCan().useProFeature.value).toBe(true)
    })

    test('false when plan is free', () => {
      planRef.value = 'free'
      expect(useCan().useProFeature.value).toBe(false)
    })

    test('false when plan is unset', () => {
      expect(useCan().useProFeature.value).toBe(false)
    })

    test('reactively updates when plan changes', () => {
      const can = useCan()
      planRef.value = 'free'
      expect(can.useProFeature.value).toBe(false)
      planRef.value = 'paid'
      expect(can.useProFeature.value).toBe(true)
    })
  })

  describe('createDeck', () => {
    test('allows a user under the deckLimit', () => {
      const can = useCan()
      deckCountRef.value = 0
      expect(can.createDeck.value).toBe(true)
      deckCountRef.value = 4
      expect(can.createDeck.value).toBe(true)
    })

    test('blocks a user at the deckLimit', () => {
      const can = useCan()
      deckCountRef.value = 5
      expect(can.createDeck.value).toBe(false)
      deckCountRef.value = 99
      expect(can.createDeck.value).toBe(false)
    })

    test('allows a user regardless of count when deckLimit is null (unlimited)', () => {
      deckLimitRef.value = null
      const can = useCan()
      deckCountRef.value = 0
      expect(can.createDeck.value).toBe(true)
      deckCountRef.value = 1_000_000
      expect(can.createDeck.value).toBe(true)
    })

    test('reactively updates when deckLimit flips from a number to null', () => {
      const can = useCan()
      deckCountRef.value = 10
      expect(can.createDeck.value).toBe(false)
      deckLimitRef.value = null
      expect(can.createDeck.value).toBe(true)
    })
  })

  describe('addCards', () => {
    test('always true when cardsPerDeckLimit is null (unlimited)', () => {
      cardsPerDeckLimitRef.value = null
      expect(useCan().addCards(999)).toBe(true)
    })

    test('true when count + adding is under the limit', () => {
      expect(useCan().addCards(100, 1)).toBe(true)
    })

    test('true when count + adding equals the limit exactly (boundary)', () => {
      expect(useCan().addCards(199, 1)).toBe(true)
    })

    test('false when count + adding exceeds the limit', () => {
      expect(useCan().addCards(199, 2)).toBe(false)
    })

    test('defaults adding to 1 when not supplied', () => {
      expect(useCan().addCards(200)).toBe(false)
      expect(useCan().addCards(199)).toBe(true)
    })
  })

  describe('useCardImages', () => {
    test('true when plan is paid', () => {
      planRef.value = 'paid'
      expect(useCan().useCardImages.value).toBe(true)
    })

    test('false when plan is free', () => {
      planRef.value = 'free'
      expect(useCan().useCardImages.value).toBe(false)
    })

    test('false when plan is undefined', () => {
      planRef.value = null
      expect(useCan().useCardImages.value).toBe(false)
    })

    test('is a ComputedRef that re-evaluates when plan changes', () => {
      const can = useCan()
      planRef.value = 'free'
      expect(can.useCardImages.value).toBe(false)
      planRef.value = 'paid'
      expect(can.useCardImages.value).toBe(true)
      planRef.value = 'free'
      expect(can.useCardImages.value).toBe(false)
    })
  })

  describe('useAudioReader', () => {
    test('true when member role is admin', () => {
      roleRef.value = 'admin'
      expect(useCan().useAudioReader.value).toBe(true)
    })

    test('false when member role is not admin', () => {
      roleRef.value = 'member'
      expect(useCan().useAudioReader.value).toBe(false)
    })

    test('false when member role is null', () => {
      roleRef.value = null
      expect(useCan().useAudioReader.value).toBe(false)
    })

    test('is a ComputedRef that re-evaluates when role changes', () => {
      const can = useCan()
      roleRef.value = 'member'
      expect(can.useAudioReader.value).toBe(false)
      roleRef.value = 'admin'
      expect(can.useAudioReader.value).toBe(true)
      roleRef.value = 'member'
      expect(can.useAudioReader.value).toBe(false)
    })
  })
})
