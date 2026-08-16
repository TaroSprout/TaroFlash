import { computed, ref, shallowRef, toValue, type InjectionKey, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInfiniteScroll } from '@/composables/ui/infinite-scroll'
import { useCardsInDeckInfiniteQuery } from '@/api/cards'
import { useDeckQuery } from '@/api/decks'
import { useVirtualCardList, type CardEntry } from './virtual-list'
import { useCardActions } from './actions'
import { useCardSelection, useCardMutations, useCardLimitGate } from '@/composables/card'
import { useNoticeStore } from '@/stores/notice-store'
import { rankBetween, resolveRankNeighbours } from '@/utils/card/rank'
import { emitSfx } from '@/sfx/bus'
import type { DeckViewShell } from './view-shell'

export type CardListController = ReturnType<typeof useCardListController>

export const cardEditorKey = Symbol('cardEditor') as InjectionKey<CardListController>

type Options = {
  deck_id: number
  shell: Pick<DeckViewShell, 'exitMode' | 'setMode' | 'sort_by'>
  search_query: Ref<string>
}

/**
 * Root composable for the deck-editor card list — wires the cards query, deck
 * query, virtual list, selection, mutations, and intent actions into the one
 * surface `provide(cardEditorKey)` hands to every consumer.
 *
 * Selection is orthogonal to mode: `is_selecting` flips on regardless of
 * which mode is active.
 */
export function useCardListController(opts: Options) {
  const { t } = useI18n()
  const notice = useNoticeStore()

  const cards_query = useCardsInDeckInfiniteQuery(
    () => opts.deck_id,
    opts.shell.sort_by,
    opts.search_query
  )
  const deck_query = useDeckQuery(() => opts.deck_id)

  const card_count = computed(() => deck_query.data.value?.card_count ?? 0)

  const list = useVirtualCardList(cards_query, opts.deck_id)
  const selection = useCardSelection(card_count)
  const mutations = useCardMutations(opts.deck_id)
  const limit_gate = useCardLimitGate(() => deck_query.data.value)

  const saving = ref(false)

  // `updateCard` awaits a staged card's entry here, so a keystroke landing
  // mid-insert becomes an UPDATE on the row it created, never a second INSERT.
  const pending_inserts = new Map<string, Promise<void>>()

  // Chains eager inserts one after another, so a key is always minted against
  // neighbours whose own insert already resolved.
  let insert_queue: Promise<void> = Promise.resolve()

  // client_id awaiting autofocus + grow-in, claimed once on mount. →[K:deck-editor-focus-claim]
  const pending_focus_client_id = ref<string | null>(null)

  // client_id awaiting its grow-in reveal only — never set by `editCard`, which
  // must not animate an existing card's height. →[K:deck-editor-focus-claim]
  const pending_grow_client_id = ref<string | null>(null)

  // Registered by the mounted editor list so `editCard` can scroll to a card
  // without a template-ref chain through mode-stack's dynamic pane.
  const list_scroller = shallowRef<{ scrollToCard: (client_id: string) => void } | null>(null)

  // False only on mobile mid-edit, where the dock keeps the sort control
  // reachable — drag would otherwise run over rendered neighbours that aren't
  // rank neighbours.
  const can_reorder = computed(() => toValue(opts.shell.sort_by) === 'default')

  const card_attributes = computed<DeckCardAttributes>(() => ({
    front: deck_query.data.value?.card_attributes?.front ?? {},
    back: deck_query.data.value?.card_attributes?.back ?? {}
  }))

  /**
   * The single create seam every "add card" intent funnels through — desktop
   * toolbar, per-row append / prepend, the empty-state CTA, the mobile dock
   * editor. Stages the temp via `insert`, optionally marks it as the focus
   * target, then fires its INSERT in the background. No-op past the plan cap.
   *
   * @param focus - Off for the mobile dock editor, which opens its own
   *   focused surface over the staged card and would fight the row's own
   *   autofocus.
   * @returns The staged `client_id`, or `undefined` when the cap vetoes staging.
   */
  async function stageCard(insert: () => string, focus = false): Promise<string | undefined> {
    if (!(await limit_gate.guardAddCards())) return

    const client_id = insert()

    // Assign in the same tick as insert — the row mounts before any later
    // microtask. →[K:deck-focus-microtask-ordering]
    if (focus) {
      pending_focus_client_id.value = client_id
      pending_grow_client_id.value = client_id
    }

    insertStaged(client_id)
    return client_id
  }

  /**
   * Stage a new card without autofocus — the mobile dock editor's create path.
   *
   * @param left_card_id  - If given, the new card is placed `after` this id.
   * @param right_card_id - If given (and `left_card_id` is not), `before` it.
   */
  function addCard(left_card_id?: number, right_card_id?: number) {
    return stageCard(() => list.addCard(left_card_id, right_card_id))
  }

  /** Stage a new card that lands focused and grows in — every desktop create path. */
  function addFocusedCard(insert: () => string) {
    return stageCard(insert, true)
  }

  /** Stage a focused new temp card immediately after the card with `card_id`. */
  function appendCard(card_id: number) {
    return addFocusedCard(() => list.appendCard(card_id))
  }

  /** Stage a focused new temp card immediately before the card with `card_id`. */
  function prependCard(card_id: number) {
    return addFocusedCard(() => list.prependCard(card_id))
  }

  /**
   * Stage a focused new card at the very top of the deck, so the toolbar's "new
   * card" intent (and the editor empty-state CTA) drops the user straight into
   * typing. Anchors before the first persisted card; on an empty deck it appends
   * (the lone card is still the top). No-op past the plan cap.
   */
  function addCardAtTop() {
    return addFocusedCard(() => list.addCardAtTop())
  }

  /**
   * The editor's "new card" intent: enter edit mode, play the add chime, then
   * stage a fresh card at the top for immediate typing. Shared by the toolbar
   * button and the empty-state CTA.
   */
  async function newCard() {
    const stack_mounted = list.all_cards.value.length > 0
    const entered = opts.shell.setMode('edit')

    // Only await the edit-pane slide when it's mounted to slide — an empty
    // deck has no mode-stack yet, and awaiting would hang forever.
    if (stack_mounted) await entered

    // The new row's autofocus is programmatic and stays silent, so the chime
    // plays alone.
    emitSfx('ui.press')
    addCardAtTop()
  }

  /** One-shot autofocus claim, true exactly once for the pending client_id. →[K:deck-editor-focus-claim] */
  function claimFocus(client_id: string): boolean {
    if (pending_focus_client_id.value !== client_id) return false
    pending_focus_client_id.value = null
    return true
  }

  /** One-shot grow-in claim, true exactly once for the pending client_id. →[K:deck-editor-focus-claim] */
  function claimGrow(client_id: string): boolean {
    if (pending_grow_client_id.value !== client_id) return false
    pending_grow_client_id.value = null
    return true
  }

  /** Called by the mounted editor list on mount/unmount to publish its scroller. */
  function registerScroller(scroller: { scrollToCard: (client_id: string) => void } | null) {
    list_scroller.value = scroller
  }

  /** The grid dropdown's "Edit" intent: switch to edit mode, then scroll the chosen card into view. */
  async function editCard(card_id: number) {
    const entry = list.all_cards.value.find((c) => c.id === card_id)
    if (!entry) return

    // No grow-in — that stays reserved for freshly-added cards (`claimGrow`).
    pending_focus_client_id.value = entry.client_id

    // mode-stack owns the window scroll + pane transforms while sliding, so
    // scroll only once the transition settles.
    await opts.shell.setMode('edit')
    list_scroller.value?.scrollToCard(entry.client_id)
  }

  /**
   * Reposition a persisted card within the deck by drag index, `from`/`to`
   * indexing `list.all_cards`. No-op on a temp row — it has no key yet.
   */
  function reorderCard(from: number, to: number) {
    const cards = list.all_cards.value
    const dragged = cards[from]
    if (!dragged?.rank) return

    const without = cards.filter((_, i) => i !== from)
    const rank = rankBetween(resolveRankNeighbours(without, to, list.tail_rank.value))

    mutations
      .reorderCard({ card_id: dragged.id, deck_id: opts.deck_id, rank })
      .catch(() => notice.warn(t('toast.warn.reorder-failed')))
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
   * Insert the staged temp at its rendered position and promote it on success.
   * The key is minted here, not at stage time, so it reflects the temp's
   * neighbours as of the actual save.
   *
   * @returns `false` when a race let the write reach the plan cap after
   *   `guardAddCards` already passed it — `handleLimitError` re-surfaces the
   *   upgrade alert and the entry is left staged. Any other rejection propagates.
   */
  async function insertTemp(
    temp_id: number,
    entry: CardEntry,
    values: Partial<Card>
  ): Promise<boolean> {
    try {
      const inserted = await mutations.insertCard({
        deck_id: opts.deck_id,
        rank: rankBetween(list.neighbourRanksFor(entry.client_id)),
        front_text: values.front_text ?? entry.card.front_text ?? '',
        back_text: values.back_text ?? entry.card.back_text ?? ''
      })

      list.promoteTemp(temp_id, inserted.id, inserted.rank, values)
      return true
    } catch (error) {
      if (!limit_gate.handleLimitError(error)) throw error
      return false
    }
  }

  /**
   * Fire the eager INSERT for a just-staged card, queued behind any insert
   * already in flight so successive creates mint their keys in render order.
   *
   * Failures are swallowed — the staged card is still empty, so nothing the
   * user typed is lost and the next edit re-inserts it. A cap rejection is
   * the exception: the row comes back out of the list.
   */
  function insertStaged(client_id: string) {
    const entry = list.findEntryByClientId(client_id)
    if (!entry) return

    const temp_id = entry.card.id

    const run = insert_queue
      .then(async () => {
        const inserted = await insertTemp(temp_id, entry, {})
        if (!inserted) list.removeTemp(client_id)
      })
      .catch(() => {})
      .finally(() => pending_inserts.delete(client_id))

    insert_queue = run
    pending_inserts.set(client_id, run)
  }

  /**
   * Route a resolved edit to INSERT or UPDATE.
   *
   * @param staged - The card's entry before any in-flight eager insert
   *   resolved, re-read by client_id since that insert may have promoted it
   *   or, at the cap, rolled it out of the list.
   */
  function persistEdit(id: number, staged: CardEntry | undefined, values: Partial<Card>) {
    const entry = staged && list.findEntryByClientId(staged.client_id)
    if (staged && !entry) return

    if (entry?.real_id === null) return insertTemp(id, entry, values)

    const card = entry?.card ?? list.findCard(id)
    if (!card) return

    if (entry) list.patchTemp(entry.client_id, values)
    return mutations.saveCard(card, values)
  }

  /**
   * Persist an edit. Waits out the card's eager INSERT when one is still in
   * flight, so typing into a brand-new card yields exactly one card carrying
   * the text. No-op when the id matches nothing.
   */
  function updateCard(id: number, values: Partial<Card>) {
    const staged = list.findEntryByCardId(id)
    const pending = staged && pending_inserts.get(staged.client_id)

    return withSaving(async () => {
      await pending
      return persistEdit(id, staged, values)
    })
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
    reorderCard,
    can_reorder,
    claimFocus,
    claimGrow,
    pending_focus_client_id,
    registerScroller,
    editCard,
    guardAddCards: limit_gate.guardAddCards,
    handleLimitError: limit_gate.handleLimitError,
    saving,
    updateCard,
    card_attributes,
    card_count,
    deck_id: opts.deck_id,

    hasNextPage: cards_query.hasNextPage,
    isLoading: cards_query.isLoading,
    loadNextPage: cards_query.loadNextPage,
    observeSentinel
  }
}
