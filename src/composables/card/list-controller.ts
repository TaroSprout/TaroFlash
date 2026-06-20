import { computed, ref, type InjectionKey, type Ref } from 'vue'
import { useInfiniteScroll } from '@/composables/ui/infinite-scroll'
import { useCardsInDeckInfiniteQuery } from '@/api/cards'
import { useDeckQuery } from '@/api/decks'
import { useVirtualCardList, type CardEntry } from './virtual-list'
import { useCardSelection } from './selection'
import { useCardMutations } from './mutations'
import { useCardActions } from './actions'
import { useCardLimitGate } from '@/composables/card/limit-gate'
import { emitSfx } from '@/sfx/bus'
import type { DeckViewShell } from '../deck/view-shell'

export type CardListController = ReturnType<typeof useCardListController>

export const cardEditorKey = Symbol('cardEditor') as InjectionKey<CardListController>

type Options = {
  deck_id: number
  // intent actions hand control back to the shell: `exitMode` when a flow ends
  // editing, `setMode` when `newCard` drops the user into edit mode
  shell: Pick<DeckViewShell, 'exitMode' | 'setMode'>
}

/**
 * Single root composable for the deck-editor card list. Wires the infinite
 * cards query, deck query, virtual list, selection, mutations, and intent
 * actions together, and exposes the consolidated surface a single
 * `provide(cardEditorKey)` hands to every consumer (list, grid, list-item,
 * list-item-card, card-importer, mode-toolbar, deck-hero).
 *
 * Pure card-data concerns: which mode/pane is on screen lives in
 * `useDeckViewShell`. Selection is orthogonal to mode: `is_selecting` flips on
 * the moment any card is selected, regardless of which mode is active. Also
 * owns the `saving` flag and the INSERT-vs-UPDATE routing in `updateCard`.
 *
 * Calls `useDeckQuery` once internally and forwards `deck.card_count` into
 * `useCardSelection`. Pinia Colada dedupes by key, so other consumers (e.g.
 * the deck overview panel) holding the same handle share the cache entry.
 *
 * @param opts.deck_id - Numeric deck id this controller is scoped to.
 * @param opts.shell - The deck-view shell; intent actions call its `exitMode`
 *   when a flow ends editing (e.g. deleting the whole selection).
 *
 * @example
 * const shell = useDeckViewShell()
 * const editor = useCardListController({ deck_id, shell })
 * provide(cardEditorKey, editor)
 */
export function useCardListController(opts: Options) {
  const cards_query = useCardsInDeckInfiniteQuery(() => opts.deck_id)
  const deck_query = useDeckQuery(() => opts.deck_id)

  const card_count = computed(() => deck_query.data.value?.card_count ?? 0)

  const list = useVirtualCardList(cards_query, opts.deck_id)
  const selection = useCardSelection(card_count)
  const mutations = useCardMutations(opts.deck_id)
  const limit_gate = useCardLimitGate(() => deck_query.data.value)

  const saving = ref(false)

  // client_id of the card last staged via `addCardAtTop`, awaiting autofocus.
  // The matching row claims it on mount (see `claimFocus`) and focuses itself.
  const pending_focus_client_id = ref<string | null>(null)

  const card_attributes = computed<DeckCardAttributes>(() => ({
    front: deck_query.data.value?.card_attributes?.front ?? {},
    back: deck_query.data.value?.card_attributes?.back ?? {}
  }))

  /**
   * Stage a new temp card, gated on the deck's plan card cap. The single funnel
   * every editor "add card" intent (toolbar, empty-state, per-row append /
   * prepend) flows through, so the cap is enforced in one place. A capped free
   * member gets the upgrade alert and nothing is staged.
   *
   * @param left_card_id  - If given, the new card is placed `after` this id.
   * @param right_card_id - If given (and `left_card_id` is not), `before` it.
   */
  async function addCard(
    left_card_id?: number,
    right_card_id?: number
  ): Promise<string | undefined> {
    if (!(await limit_gate.guardAddCards())) return
    return list.addCard(left_card_id, right_card_id)
  }

  /** Gated stage of a new temp card immediately after the card with `card_id`. */
  function appendCard(card_id: number) {
    return addCard(card_id)
  }

  /** Gated stage of a new temp card immediately before the card with `card_id`. */
  function prependCard(card_id: number) {
    return addCard(undefined, card_id)
  }

  /**
   * Stage a new card at the very top of the deck and request autofocus on it,
   * so the toolbar's "new card" intent drops the user straight into typing.
   * Anchors before the first persisted card; on an empty deck it appends (the
   * lone card is still the top). No-op past the plan cap — `addCard` gates it.
   */
  async function addCardAtTop() {
    if (!(await limit_gate.guardAddCards())) return

    // Stage and record the autofocus target in the same synchronous block:
    // `list.addCardAtTop` pushes the temp and queues Vue's render, which flushes
    // before any later microtask. Assigning `pending_focus_client_id` after an
    // `await` here would lose the race — the row mounts and claims focus before
    // the target is set.
    pending_focus_client_id.value = list.addCardAtTop()
  }

  /**
   * The editor's "new card" intent: enter edit mode, play the add chime, then
   * stage a fresh card at the top for immediate typing. Shared by the toolbar
   * button and the empty-state CTA so the mode-switch + chime + autofocus flow
   * lives in one place.
   *
   * With cards already on screen the mode-stack is mounted, so we await its
   * edit-pane slide before staging — the new card's focus + scroll-into-view
   * then read final positions, not a mid-animation transform. On an empty deck
   * the mode-stack isn't mounted (the view shows the empty state), so nothing
   * reports the transition settled and awaiting would hang forever; the stack
   * mounts fresh in edit mode the instant the staged card flips the view out of
   * its empty state, so we just set the mode and stage synchronously.
   *
   * The add chime is `blocking` so it suppresses the `slide_up` that focusing
   * the new card would fire.
   */
  async function newCard() {
    const stack_mounted = list.all_cards.value.length > 0
    const entered = opts.shell.setMode('edit')

    if (stack_mounted) await entered

    emitSfx('snappy_button_2', { blocking: true })
    addCardAtTop()
  }

  /**
   * One-shot autofocus claim: returns true exactly once, for the card whose
   * `client_id` was last staged by `addCardAtTop`. The matching row calls this
   * on mount and focuses its editor; every other card gets false.
   */
  function claimFocus(client_id: string): boolean {
    if (pending_focus_client_id.value !== client_id) return false
    pending_focus_client_id.value = null
    return true
  }

  const actions = useCardActions({
    list,
    selection,
    mutations,
    deck_query,
    deck_id: opts.deck_id,
    shell: opts.shell
  })

  /**
   * Wire a template-ref sentinel element to the infinite-scroll loader.
   * Pages load when the sentinel intersects the viewport, gated on
   * `hasNextPage && !isLoading` to avoid duplicate fetches.
   */
  function observeSentinel(sentinel: Ref<HTMLElement | null>) {
    useInfiniteScroll(sentinel, () => cards_query.loadNextPage(), {
      enabled: () => cards_query.hasNextPage.value && !cards_query.isLoading.value
    })
  }

  /** Run an async write with the `saving` flag toggled on for the duration. */
  async function withSaving<T>(fn: () => Promise<T>): Promise<T> {
    saving.value = true
    try {
      return await fn()
    } finally {
      saving.value = false
    }
  }

  /**
   * Insert the staged temp via `insert_card_at` and promote it on success.
   *
   * `guardAddCards` already vetoes staging past the plan cap, but that check
   * runs when the temp is added — a stale `card_count` or a concurrent edit on
   * another device can still let a write reach `enforce_deck_card_limit` and be
   * rejected here. `handleLimitError` re-surfaces the upgrade alert for that
   * case and the temp stays staged (still `real_id: null`), so upgrading and
   * re-saving retries the same INSERT. Any other rejection propagates.
   */
  async function insertTemp(temp_id: number, entry: CardEntry, values: Partial<Card>) {
    try {
      const inserted = await mutations.insertCard({
        deck_id: opts.deck_id,
        anchor_id: entry.anchor_id,
        side: entry.side,
        front_text: values.front_text ?? entry.card.front_text ?? '',
        back_text: values.back_text ?? entry.card.back_text ?? ''
      })

      list.promoteTemp(temp_id, inserted.id, inserted.rank, values)
    } catch (error) {
      if (!limit_gate.handleLimitError(error)) throw error
    }
  }

  /**
   * Persist an edit. Routes to INSERT on the first save of an unpromoted
   * temp; otherwise UPDATE. No-op when the id matches nothing.
   */
  async function updateCard(id: number, values: Partial<Card>) {
    const entry = list.findEntryByCardId(id)

    if (entry && entry.real_id === null) return withSaving(() => insertTemp(id, entry, values))

    const card = entry?.card ?? list.findCard(id)
    if (!card) return

    return withSaving(() => mutations.saveCard(card, values))
  }

  /** Upload and attach an image to one face of a card, toggling `saving`. */
  function setCardImage(card_id: number, side: 'front' | 'back', file: File) {
    return withSaving(() => mutations.setCardImage(card_id, side, file))
  }

  /** Remove the image from one face of a card, toggling `saving`. */
  function deleteCardImage(card_id: number, side: 'front' | 'back') {
    return withSaving(() => mutations.deleteCardImage(card_id, side))
  }

  /**
   * Apply one face's pending image change, routing on the value: a `File`
   * sets it, `null` removes it, `undefined` is a no-op. Centralizes the
   * File/null/undefined → RPC mapping so callers don't branch on it.
   */
  function setFaceImage(card_id: number, side: 'front' | 'back', change: File | null | undefined) {
    if (change === undefined) return Promise.resolve()
    return change === null ? deleteCardImage(card_id, side) : setCardImage(card_id, side, change)
  }

  return {
    list,
    selection,
    actions,

    addCard,
    appendCard,
    prependCard,
    addCardAtTop,
    newCard,
    claimFocus,
    guardAddCards: limit_gate.guardAddCards,
    handleLimitError: limit_gate.handleLimitError,
    saving,
    updateCard,
    setCardImage,
    deleteCardImage,
    setFaceImage,
    card_attributes,
    card_count,
    deck_id: opts.deck_id,

    hasNextPage: cards_query.hasNextPage,
    isLoading: cards_query.isLoading,
    loadNextPage: cards_query.loadNextPage,
    observeSentinel
  }
}
