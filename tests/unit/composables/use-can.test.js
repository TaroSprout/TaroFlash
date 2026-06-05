import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

let planRef
let deckCountRef
let roleRef

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

const { useCan } = await import('@/composables/use-can')

describe('useCan', () => {
  beforeEach(() => {
    planRef.value = null
    deckCountRef.value = 0
    roleRef.value = null
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
    test('allows free user under the limit', () => {
      planRef.value = 'free'
      const can = useCan()
      deckCountRef.value = 0
      expect(can.createDeck.value).toBe(true)
      deckCountRef.value = 4
      expect(can.createDeck.value).toBe(true)
    })

    test('blocks free user at the limit', () => {
      planRef.value = 'free'
      const can = useCan()
      deckCountRef.value = 5
      expect(can.createDeck.value).toBe(false)
      deckCountRef.value = 99
      expect(can.createDeck.value).toBe(false)
    })

    test('allows paid user regardless of count', () => {
      planRef.value = 'paid'
      const can = useCan()
      deckCountRef.value = 0
      expect(can.createDeck.value).toBe(true)
      deckCountRef.value = 1_000_000
      expect(can.createDeck.value).toBe(true)
    })

    test('treats unset plan as free', () => {
      const can = useCan()
      deckCountRef.value = 4
      expect(can.createDeck.value).toBe(true)
      deckCountRef.value = 5
      expect(can.createDeck.value).toBe(false)
    })

    test('reactively updates when plan flips free → paid', () => {
      const can = useCan()
      planRef.value = 'free'
      deckCountRef.value = 10
      expect(can.createDeck.value).toBe(false)
      planRef.value = 'paid'
      expect(can.createDeck.value).toBe(true)
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
