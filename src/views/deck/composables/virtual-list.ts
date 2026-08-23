import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import uid from '@/utils/uid'
import { resolveRankNeighbours, type RankNeighbours } from '@/utils/card/rank'
import type { useCardsInDeckInfiniteQuery } from '@/api/cards'

export type CardWithClientId = Card & { client_id: string }
export type VirtualCardList = ReturnType<typeof useVirtualCardList>

type CardsQuery = ReturnType<typeof useCardsInDeckInfiniteQuery>

export type CardEntry = {
  client_id: string
  card: Card
  anchor_id: number | null
  side: 'before' | 'after' | null
  real_id: number | null
}

/** A placeholder taken out of the list, with the slot it held. */
export type RetiredTemp = { index: number; entry: CardEntry }

let next_temp_id = 0

/** Mint a placeholder id for a temp card — diagnostics only, branching reads `entry.real_id`. */
function tempPlaceholderId(): number {
  return --next_temp_id
}

/**
 * Merged read model for the deck-editor card list: persisted cards from the
 * infinite query, interleaved with client-side temp cards mid-creation.
 * →[K:deck-temp-card-handoff]
 */
export function useVirtualCardList(
  cards_query: CardsQuery,
  deck_id: MaybeRefOrGetter<number | undefined>
) {
  const temp_entries = ref<CardEntry[]>([])

  // Stable client_id per persisted real id, so v-for keys survive a refetch.
  // →[K:deck-temp-card-handoff]
  const client_id_by_real_id = new Map<number, string>()

  /**
   * Memoised lookup: client_id for a given persisted-card real id. First call
   * for an id mints and stores a uid; subsequent calls return the same value.
   */
  function clientIdFor(real_id: number): string {
    let cid = client_id_by_real_id.get(real_id)

    if (!cid) {
      cid = uid()
      client_id_by_real_id.set(real_id, cid)
    }

    return cid
  }

  const persisted_cards = computed<Card[]>(() => {
    return (cards_query.data.value?.pages ?? []).flatMap((page) => page.cards)
  })

  // Rank of the first card on the next, not-yet-loaded page. A card dropped
  // below the last loaded row sits between it and this — without it the drop
  // would resolve "no next neighbour" and land at the end of the whole deck.
  const tail_rank = computed<string | null>(
    () => cards_query.data.value?.pages?.at(-1)?.next_rank ?? null
  )

  const persisted_id_set = computed(() => {
    const set = new Set<number>()

    for (const c of persisted_cards.value) {
      if (c.id !== undefined) set.add(c.id)
    }

    return set
  })

  // Temps not yet promoted, or promoted but the persisted refetch hasn't
  // landed yet. →[K:deck-temp-card-handoff]
  const live_temps = computed<CardEntry[]>(() =>
    temp_entries.value.filter((e) => e.real_id === null || !persisted_id_set.value.has(e.real_id))
  )

  // A promoted temp is retired the moment the persisted list carries its card:
  // the server's copy renders the row from then on, and an entry kept past that
  // point would put the card back on screen the next time it leaves the deck —
  // deleted, or moved somewhere else. →[K:deck-temp-card-handoff]
  watch(persisted_id_set, (ids) => {
    const kept = temp_entries.value.filter((e) => e.real_id === null || !ids.has(e.real_id))
    if (kept.length !== temp_entries.value.length) temp_entries.value = kept
  })

  /** Wrap each persisted card with its memoised client_id. */
  function wrapPersisted(): CardWithClientId[] {
    return persisted_cards.value.map((card) => ({
      ...card,
      client_id: card.id !== undefined ? clientIdFor(card.id) : uid()
    }))
  }

  /**
   * Return a new card list with `entry` inserted at the position implied by
   * its anchor. Pure — does not mutate `cards`. Falls back to the tail when
   * there's no anchor, or the anchor lives on a page not yet loaded.
   */
  function withTempInserted(cards: CardWithClientId[], entry: CardEntry): CardWithClientId[] {
    const wrapped: CardWithClientId = { ...entry.card, client_id: entry.client_id }
    const anchor_index = cards.findIndex((c) => c.id === entry.anchor_id)

    const should_append = entry.anchor_id === null || anchor_index === -1
    if (should_append) return [...cards, wrapped]

    const insert_at = entry.side === 'after' ? anchor_index + 1 : anchor_index
    return [...cards.slice(0, insert_at), wrapped, ...cards.slice(insert_at)]
  }

  /**
   * Dev-only invariant: every card in the rendered list has a unique
   * client_id. A duplicate means temp/persisted dedupe is broken — usually
   * because a promote forgot to seed `client_id_by_real_id`.
   */
  function assertUniqueClientIds(cards: CardWithClientId[]) {
    const seen = new Set<string>()

    for (const c of cards) {
      if (seen.has(c.client_id)) {
        throw new Error(
          `useVirtualCardList: duplicate client_id ${c.client_id} in all_cards — temp/persisted dedupe broken`
        )
      }
      seen.add(c.client_id)
    }
  }

  const all_cards = computed<CardWithClientId[]>(() => {
    const cards = live_temps.value.reduce(withTempInserted, wrapPersisted())

    if (import.meta.env.DEV) assertUniqueClientIds(cards)

    return cards
  })

  /**
   * Resolve where a new temp card should be anchored, given the optional
   * neighbour ids passed by the caller. Falls back to "after the last loaded
   * persisted card" when no neighbours are passed; falls back to "no anchor"
   * (`anchor_id: null`) when the deck is empty.
   */
  function resolveAnchor(
    left_card_id?: number,
    right_card_id?: number
  ): { anchor_id: number | null; side: 'before' | 'after' | null } {
    if (left_card_id !== undefined) {
      return { anchor_id: left_card_id, side: 'after' }
    }

    if (right_card_id !== undefined) {
      return { anchor_id: right_card_id, side: 'before' }
    }

    const last = persisted_cards.value.at(-1)
    if (last?.id !== undefined) {
      return { anchor_id: last.id, side: 'after' }
    }

    return { anchor_id: null, side: null }
  }

  /**
   * Build the empty Card record that backs a freshly-staged temp entry.
   * No rank — an absent rank is also what marks an entry as un-persisted.
   */
  function buildEmptyCard(): Card {
    return {
      id: tempPlaceholderId(),
      deck_id: toValue(deck_id),
      front_text: '',
      back_text: ''
    }
  }

  /**
   * Stage a new temp card, placed in `all_cards` immediately — before any
   * insert RPC has fired.
   *
   * @returns The stable `client_id` of the staged card.
   */
  function addCard(left_card_id?: number, right_card_id?: number): string {
    const { anchor_id, side } = resolveAnchor(left_card_id, right_card_id)
    const client_id = uid()

    temp_entries.value.push({
      client_id,
      card: buildEmptyCard(),
      anchor_id,
      side,
      real_id: null
    })

    return client_id
  }

  /** Stage a new temp card immediately after the card with `card_id`. */
  function appendCard(card_id: number) {
    return addCard(card_id)
  }

  /** Stage a new temp card immediately before the card with `card_id`. */
  function prependCard(card_id: number) {
    return addCard(undefined, card_id)
  }

  /**
   * Stage a new temp card at the very top of the deck, anchored before the
   * first persisted card so repeated clicks land newest-first.
   *
   * @returns The stable `client_id` of the staged card.
   */
  function addCardAtTop(): string {
    const first_persisted = persisted_cards.value[0]
    const client_id = uid()

    temp_entries.value.unshift({
      client_id,
      card: buildEmptyCard(),
      anchor_id: first_persisted?.id ?? null,
      side: first_persisted?.id !== undefined ? 'before' : null,
      real_id: null
    })

    return client_id
  }

  /**
   * The persisted keys either side of a staged card's slot in the rendered
   * list. Read against the rendered list, not the entry's anchor, so a run
   * of temps stacked in the same gap resolve past one another in order.
   */
  function neighbourRanksFor(client_id: string): RankNeighbours {
    const cards = all_cards.value
    const slot = cards.findIndex((c) => c.client_id === client_id)
    if (slot === -1) return { prev: null, next: tail_rank.value }

    const without = cards.filter((c) => c.client_id !== client_id)
    return resolveRankNeighbours(without, slot, tail_rank.value)
  }

  /**
   * Look up the temp entry whose `card.id` matches `id`. Used by the mutation
   * layer to decide whether a save should INSERT (entry exists, `real_id`
   * still null) or UPDATE (no entry, or `real_id` already set).
   */
  function findEntryByCardId(id: number): CardEntry | undefined {
    return temp_entries.value.find((e) => e.card.id === id)
  }

  /**
   * Look up the entry with `client_id`. Unlike `findEntryByCardId`, the key
   * survives promotion, so a caller can re-read the entry after an in-flight
   * insert resolves.
   */
  function findEntryByClientId(client_id: string): CardEntry | undefined {
    return temp_entries.value.find((e) => e.client_id === client_id)
  }

  /**
   * Merge `values` into an entry's own card record — a promoted temp is never
   * refetched, so `saveCard`'s optimistic patch can't reach it here.
   */
  function patchTemp(client_id: string, values: Partial<Card>) {
    const entry = findEntryByClientId(client_id)
    if (!entry) return

    Object.assign(entry.card, values)
  }

  /**
   * Drop a staged entry out of the list. The rollback for an insert the backend
   * refused (the deck's card cap) — the row never reached the server, so
   * nothing is orphaned by removing it.
   */
  function removeTemp(client_id: string) {
    temp_entries.value = temp_entries.value.filter((e) => e.client_id !== client_id)
  }

  /**
   * Take the placeholders standing in for `real_ids` back out of the list —
   * the cards they were promoted against have left the deck. A card created
   * blank this session never reaches the persisted list at all (its insert
   * skips that reload on purpose), so its placeholder is the only thing
   * rendering it and this is the only thing that ever takes it off screen.
   * →[K:deck-temp-card-handoff]
   *
   * @returns Each removed entry with the slot it held, for `restoreTemps`.
   */
  function retireTemps(real_ids: Iterable<number>): RetiredTemp[] {
    const ids = new Set(real_ids)
    const retired: RetiredTemp[] = []

    temp_entries.value = temp_entries.value.filter((entry, index) => {
      const leaving = entry.real_id !== null && ids.has(entry.real_id)
      if (leaving) retired.push({ index, entry })
      return !leaving
    })

    return retired
  }

  /**
   * Put retired placeholders back in the slots they held — the rollback for a
   * delete the server refused. Ascending slots, so each lands where it was.
   */
  function restoreTemps(retired: RetiredTemp[]) {
    if (retired.length === 0) return

    const entries = temp_entries.value.slice()
    for (const { index, entry } of retired) entries.splice(index, 0, entry)

    temp_entries.value = entries
  }

  /**
   * Resolve a card-id back to a Card. Searches persisted first, then live
   * temp entries — mirrors the merge order in `all_cards`. Returns the
   * underlying Card (no `client_id` wrapper) so callers can spread it into
   * write payloads without leaking the render-only field.
   */
  function findCard(id: number): Card | undefined {
    const persisted = persisted_cards.value.find((c) => c.id === id)
    if (persisted) return persisted
    return temp_entries.value.find((e) => e.card.id === id)?.card
  }

  /**
   * Syncs a local temp card to the real id the insert returned.
   *
   * The row keeps its identity through the swap, so it doesn't remount and
   * the user can carry on typing in it. →[K:deck-temp-card-handoff]
   *
   * @param temp_id - The negative placeholder id the temp was minted with.
   */
  function promoteTemp(temp_id: number, real_id: number, real_rank: string, values: Partial<Card>) {
    const entry = findEntryByCardId(temp_id)
    if (!entry) return

    entry.real_id = real_id
    entry.card.id = real_id
    entry.card.rank = real_rank
    Object.assign(entry.card, values)

    client_id_by_real_id.set(real_id, entry.client_id)
  }

  return {
    persisted_cards,
    all_cards,
    temp_entries,
    tail_rank,
    neighbourRanksFor,
    addCard,
    appendCard,
    prependCard,
    addCardAtTop,
    findEntryByCardId,
    findEntryByClientId,
    patchTemp,
    removeTemp,
    retireTemps,
    restoreTemps,
    findCard,
    promoteTemp
  }
}
