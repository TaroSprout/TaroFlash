import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { useVirtualCardList } from '@/views/deck/composables/virtual-list'

function makeCardsQuery(pages = []) {
  return {
    data: { value: { pages, pageParams: pages.map((_, i) => i) } }
  }
}

describe('useVirtualCardList', () => {
  let list

  beforeEach(() => {
    list = useVirtualCardList(makeCardsQuery([]), 10)
  })

  // ── findEntryByClientId ───────────────────────────────────────────────────

  describe('findEntryByClientId', () => {
    test('returns undefined when nothing has been staged', () => {
      expect(list.findEntryByClientId('missing')).toBeUndefined()
    })

    test('finds a staged temp entry by its client_id', () => {
      const client_id = list.addCard()
      const entry = list.findEntryByClientId(client_id)
      expect(entry?.client_id).toBe(client_id)
    })

    test('the same client_id still resolves after the entry is promoted [obligation]', () => {
      const client_id = list.addCard()
      const entry = list.findEntryByClientId(client_id)
      list.promoteTemp(entry.card.id, 555, 'a0', { front_text: 'Q' })

      const promoted = list.findEntryByClientId(client_id)
      expect(promoted?.real_id).toBe(555)
    })
  })

  // ── patchTemp ──────────────────────────────────────────────────────────────

  describe('patchTemp', () => {
    test('is a no-op when the client_id matches nothing', () => {
      expect(() => list.patchTemp('missing', { front_text: 'X' })).not.toThrow()
    })

    test('merges values into the entry card record', () => {
      const client_id = list.addCard()
      list.patchTemp(client_id, { front_text: 'Q' })
      expect(list.findEntryByClientId(client_id)?.card.front_text).toBe('Q')
    })

    // [obligation] the eager-insert entry never enters the persisted cache, so
    // patchTemp is the only mechanism keeping both sides of a two-step save —
    // this is the regression this branch closes.
    test('a second patch preserves the first field, so both sides of a two-step save survive [obligation]', () => {
      const client_id = list.addCard()
      list.patchTemp(client_id, { front_text: 'Q' })
      list.patchTemp(client_id, { back_text: 'A' })

      const entry = list.findEntryByClientId(client_id)
      expect(entry?.card.front_text).toBe('Q')
      expect(entry?.card.back_text).toBe('A')
    })
  })

  // ── removeTemp ─────────────────────────────────────────────────────────────

  describe('removeTemp', () => {
    test('drops the staged entry out of all_cards', () => {
      const client_id = list.addCard()
      expect(list.all_cards.value).toHaveLength(1)

      list.removeTemp(client_id)

      expect(list.all_cards.value).toHaveLength(0)
    })

    test('is a no-op when the client_id matches nothing', () => {
      list.addCard()
      list.removeTemp('missing')
      expect(list.all_cards.value).toHaveLength(1)
    })

    test('only removes the matching entry, leaving siblings intact', () => {
      const first = list.addCard()
      list.addCard()

      list.removeTemp(first)

      expect(list.all_cards.value).toHaveLength(1)
      expect(list.all_cards.value[0].client_id).not.toBe(first)
    })
  })

  // ── addCard eager-insert regression seam — persisted refetch never arrives ──

  describe('eager-created entries', () => {
    // [obligation] negative: nothing in the composable removes a staged temp
    // just because it stays empty. Removal only ever happens via explicit
    // removeTemp — never a side effect of reading the list.
    test('a staged, never-edited temp is never auto-removed by reading all_cards [obligation]', () => {
      const client_id = list.addCard()
      // Read the list repeatedly, as a render loop would.
      void list.all_cards.value
      void list.all_cards.value
      void list.all_cards.value

      expect(list.findEntryByClientId(client_id)).toBeDefined()
      expect(list.all_cards.value).toHaveLength(1)
    })
  })
})
