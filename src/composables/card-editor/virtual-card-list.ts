import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import uid from '@/utils/uid'
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

let next_temp_id = 0

/**
 * Mint a unique negative integer to fill the `Card.id` slot for a temp card.
 *
 * The id is purely a placeholder — branching logic uses `entry.real_id`,
 * never the sign of the id. The negative range is just a convenient
 * "definitely not a real bigserial id" sentinel for diagnostics.
 */
function tempPlaceholderId(): number {
  return --next_temp_id
}

/**
 * Merged read model for the deck-editor card list: persisted cards from the
 * Pinia Colada infinite query, interleaved with client-side temp cards that
 * the user is mid-creating.
 *
 * Every rendered card carries a stable `client_id` used as the v-for key.
 * client_ids survive the temp → persisted transition (seeded on promote,
 * reused when the persisted refetch arrives), so the text-editor stays
 * mounted across the handoff and the user does not lose focus.
 *
 * @param cards_query - The infinite query for the deck's persisted cards.
 * @param deck_id     - Reactive deck id, used when constructing new temp cards.
 *
 * @example
 * const list = useVirtualCardList(cards_query, deck_id)
 * for (const card of list.all_cards.value) {
 *   // card.client_id — stable v-for key
 *   // card.id        — placeholder (negative) until promoted, then real
 * }
 */
export function useVirtualCardList(
  cards_query: CardsQuery,
  deck_id: MaybeRefOrGetter<number | undefined>
) {
  const temp_entries = ref<CardEntry[]>([])

  // Persistent client_id for each persisted card so v-for keys stay stable
  // across refetches. Seeded on promote so a temp's client_id carries over to
  // its eventual persisted ingest — the only thing keeping the text-editor
  // mounted across the temp→persisted transition.
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
    return (cards_query.data.value?.pages ?? []).flat() as Card[]
  })

  const persisted_id_set = computed(() => {
    const set = new Set<number>()

    for (const c of persisted_cards.value) {
      if (c.id !== undefined) set.add(c.id)
    }

    return set
  })

  // Temps still in flight: not yet promoted, OR promoted but the persisted
  // refetch hasn't arrived. Once it has, the persisted copy renders in the
  // temp's place — same client_id, no remount.
  const live_temps = computed<CardEntry[]>(() =>
    temp_entries.value.filter((e) => e.real_id === null || !persisted_id_set.value.has(e.real_id))
  )

  /** Wrap each persisted card with its memoised client_id. */
  function wrapPersisted(): CardWithClientId[] {
    return persisted_cards.value.map((card) => ({
      ...card,
      client_id: card.id !== undefined ? clientIdFor(card.id) : uid()
    }))
  }

  /**
   * Return a new card list with `entry` inserted at the position implied by
   * its anchor. Pure — does not mutate `cards`.
   *
   * 1. No anchor                          → append to the tail.
   * 2. Anchor not in the loaded pages     → append to the tail (fallback —
   *    the user added a card next to one that lives on an unloaded page).
   * 3. Anchor found                       → insert before or after it,
   *    according to `entry.side`.
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

  /** Build the empty Card record that backs a freshly-staged temp entry. */
  function buildEmptyCard(): Card {
    return {
      id: tempPlaceholderId(),
      rank: 0,
      deck_id: toValue(deck_id),
      front_text: '',
      back_text: ''
    }
  }

  /**
   * Stage a new temp card. Resolves an anchor + side from the args (or falls
   * back to the tail of the persisted list) so the card appears in the right
   * place in `all_cards` immediately, before any insert RPC has fired.
   *
   * @param left_card_id  - If given, the new card is placed `after` this id.
   * @param right_card_id - If given (and `left_card_id` is not), the new card
   *                        is placed `before` this id.
   * @returns The stable `client_id` of the staged card, so the caller can later
   *          target it (e.g. to autofocus its editor once it mounts).
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
   * Stage a new temp card at the very top of the deck. Anchors `before` the
   * first *persisted* card — a real id the insert RPC can resolve, where a
   * still-unsaved temp's placeholder id can't — and `unshift`s the entry so it
   * renders above any temps already stacked at the top (repeated "add at top"
   * clicks each land newest-first). Appends with no anchor on an empty deck.
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
   * Look up the temp entry whose `card.id` matches `id`. Used by the mutation
   * layer to decide whether a save should INSERT (entry exists, `real_id`
   * still null) or UPDATE (no entry, or `real_id` already set).
   */
  function findEntryByCardId(id: number): CardEntry | undefined {
    return temp_entries.value.find((e) => e.card.id === id)
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
   * Apply the result of a successful INSERT to a staged temp entry. Called
   * by the mutation layer after `insert_card_at` returns, before the deck
   * refetch lands.
   *
   * Three things happen:
   *
   * 1. **Entry stops being a temp.** `real_id` is no longer null, so the
   *    next save on this card routes to UPDATE instead of INSERT. The card's
   *    `id` and `rank` are also overwritten with the server-assigned values,
   *    and the just-saved text is applied so the entry mirrors server state.
   *
   * 2. **Client_id is registered against the real id.** When the cache
   *    refetch eventually returns the same row, `wrapPersisted` will look up
   *    `client_id_by_real_id.get(real_id)` and find this entry's client_id,
   *    so the persisted copy inherits the same v-for key.
   *
   * 3. **The handoff stays seamless.** Same v-for key across the
   *    temp → persisted swap means Vue reuses the same DOM nodes — no
   *    remount, no focus loss while the user keeps typing.
   *
   * No-op if no entry matches `temp_id`.
   *
   * @param temp_id   - The id the temp had before this INSERT (the negative
   *                    placeholder originally minted by `addCard`).
   * @param real_id   - The real id returned by `insert_card_at`.
   * @param real_rank - The rank the server assigned.
   * @param values    - The text values that were just persisted, applied so
   *                    the entry's card mirrors what the server now holds.
   */
  function promoteTemp(temp_id: number, real_id: number, real_rank: number, values: Partial<Card>) {
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
    addCard,
    appendCard,
    prependCard,
    addCardAtTop,
    findEntryByCardId,
    findCard,
    promoteTemp
  }
}
