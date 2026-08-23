import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { useVirtualCardList } from '@/views/deck/composables/virtual-list'

function makeCardsQuery(pages = []) {
  return {
    data: ref({ pages, pageParams: pages.map((_, i) => i) })
  }
}

describe('useVirtualCardList', () => {
  let list
  let cards_query

  beforeEach(() => {
    cards_query = makeCardsQuery([])
    list = useVirtualCardList(cards_query, 10)
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

  // ── promoted-placeholder retirement — the persisted refetch takes over ─────

  describe('retiring a promoted temp once the persisted list carries its card', () => {
    // [obligation] deleting a just-created card only removes the row from
    // screen if the promoted placeholder standing in for it is retired —
    // otherwise it renders the row right back once the persisted list drops it.
    test('drops the promoted entry from temp_entries once its real_id appears in the persisted list [obligation]', async () => {
      const client_id = list.addCard()
      const temp_id = list.findEntryByClientId(client_id).card.id
      list.promoteTemp(temp_id, 500, 'a0', { front_text: 'Q' })
      expect(list.temp_entries.value).toHaveLength(1)

      cards_query.data.value = {
        pages: [{ cards: [{ id: 500, front_text: 'Q', back_text: '' }], next_rank: null }],
        pageParams: [0]
      }
      await nextTick()

      expect(list.findEntryByClientId(client_id)).toBeUndefined()
      expect(list.temp_entries.value).toHaveLength(0)
    })

    test('renders the card exactly once after retirement, not duplicated by the leftover placeholder [obligation]', async () => {
      const client_id = list.addCard()
      const temp_id = list.findEntryByClientId(client_id).card.id
      list.promoteTemp(temp_id, 500, 'a0', { front_text: 'Q' })

      cards_query.data.value = {
        pages: [{ cards: [{ id: 500, front_text: 'Q', back_text: '' }], next_rank: null }],
        pageParams: [0]
      }
      await nextTick()

      expect(list.all_cards.value).toHaveLength(1)
      expect(list.all_cards.value[0].id).toBe(500)
    })

    // A delete on that same card removes it from the persisted list; the
    // retired placeholder must not resurrect it.
    test('a card removed from the persisted list after retirement does not come back via the placeholder [obligation]', async () => {
      const client_id = list.addCard()
      const temp_id = list.findEntryByClientId(client_id).card.id
      list.promoteTemp(temp_id, 500, 'a0', { front_text: 'Q' })

      cards_query.data.value = {
        pages: [{ cards: [{ id: 500, front_text: 'Q', back_text: '' }], next_rank: null }],
        pageParams: [0]
      }
      await nextTick()

      // The delete's optimistic cache write drops the card from the persisted page.
      cards_query.data.value = { pages: [{ cards: [], next_rank: null }], pageParams: [0] }
      await nextTick()

      expect(list.all_cards.value).toHaveLength(0)
    })

    test('leaves a not-yet-promoted temp in place when an unrelated card is persisted', async () => {
      const client_id = list.addCard()

      cards_query.data.value = {
        pages: [{ cards: [{ id: 999, front_text: '', back_text: '' }], next_rank: null }],
        pageParams: [0]
      }
      await nextTick()

      expect(list.findEntryByClientId(client_id)).toBeDefined()
      expect(list.all_cards.value.map((c) => c.client_id)).toContain(client_id)
    })
  })
})
