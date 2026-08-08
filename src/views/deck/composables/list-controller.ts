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
  // intent actions hand control back to the shell: `exitMode` when a flow ends
  // editing, `setMode` when `newCard` drops the user into edit mode
  shell: Pick<DeckViewShell, 'exitMode' | 'setMode' | 'sort_by'>
  search_query: Ref<string>
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

  // In-flight eager insert per staged card, keyed by client_id. `updateCard`
  // awaits the entry's promise so a keystroke landing mid-insert becomes an
  // UPDATE on the row it created, never a second INSERT.
  const pending_inserts = new Map<string, Promise<void>>()

  // Eager inserts run one at a time. A card's key is minted against its
  // rendered neighbours, and a sibling staged moments earlier only carries one
  // once its own insert resolved — minting concurrently hands both the same key.
  let insert_queue: Promise<void> = Promise.resolve()

  // client_id of the card last staged through the create seam (`addFocusedCard`),
  // awaiting autofocus + grow-in. The matching row claims it on mount (see
  // `claimFocus`) and focuses itself.
  const pending_focus_client_id = ref<string | null>(null)

  // client_id of a freshly-added card awaiting its grow-in reveal. Set by the
  // create seam (`addFocusedCard`) — never by `editCard`, which navigates to an
  // existing card and must not animate its height. Claimed once on mount.
  const pending_grow_client_id = ref<string | null>(null)

  // The mounted editor list registers its `scrollToCard` here so `editCard`
  // can reach it without a template-ref chain through the mode-stack's
  // dynamic `<component :is>` panes (see list.vue).
  const list_scroller = shallowRef<{ scrollToCard: (client_id: string) => void } | null>(null)

  // Backstop, not the mechanism: entering edit mode forces the deck's own order,
  // so the editor is normally always reorderable. The gap it closes is mobile,
  // where the dock keeps page settings reachable mid-edit — change the sort
  // there, widen to desktop, and drag would otherwise come back over a list
  // whose rendered neighbours aren't rank neighbours.
  const can_reorder = computed(() => toValue(opts.shell.sort_by) === 'default')

  const card_attributes = computed<DeckCardAttributes>(() => ({
    front: deck_query.data.value?.card_attributes?.front ?? {},
    back: deck_query.data.value?.card_attributes?.back ?? {}
  }))

  /**
   * The single create seam every "add card" intent funnels through — desktop
   * toolbar, per-row append / prepend, the editor's empty-state CTA, and the
   * mobile dock editor. Guards the plan cap, stages the temp via `insert`,
   * optionally records it as the autofocus + grow-in target, then fires its
   * INSERT in the background so the card is a real, saved card before a single
   * key is pressed. No-op past the cap.
   *
   * The focus target is assigned in the same synchronous block as `insert()`,
   * after the sole `await` (the cap guard): the list insert queues Vue's render,
   * which flushes before any later microtask, so assigning
   * `pending_focus_client_id` after a *further* `await` would lose the race —
   * the row would mount and claim focus before the target is set.
   *
   * @param insert - Virtual-list insert to run once the guard passes; returns
   *   the staged temp's `client_id`.
   * @param focus - Whether the new row should autofocus and grow in. Off for the
   *   mobile dock editor, which opens its own focused surface over the staged
   *   card and would fight the desktop row's autofocus.
   * @returns The staged `client_id`, or `undefined` when the cap vetoes staging.
   */
  async function stageCard(insert: () => string, focus = false): Promise<string | undefined> {
    if (!(await limit_gate.guardAddCards())) return

    const client_id = insert()

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
   * The add chime plays alone: the new row's autofocus is programmatic, which
   * list-item-card's onFocusIn detects and stays silent for, so the card's own
   * focus `slide_up` never fires to collide with it.
   */
  async function newCard() {
    const stack_mounted = list.all_cards.value.length > 0
    const entered = opts.shell.setMode('edit')

    if (stack_mounted) await entered

    emitSfx('snappy_button_2')
    addCardAtTop()
  }

  /**
   * One-shot autofocus claim: returns true exactly once, for the card whose
   * `client_id` was last staged through the create seam (`addFocusedCard`). The
   * matching row calls this on mount and focuses its editor; every other card
   * gets false.
   */
  function claimFocus(client_id: string): boolean {
    if (pending_focus_client_id.value !== client_id) return false
    pending_focus_client_id.value = null
    return true
  }

  /**
   * One-shot grow-in claim: returns true exactly once, for the freshly-added
   * card whose `client_id` was staged through the create seam (`addFocusedCard`).
   * The matching row calls this on mount and plays its reveal. `editCard` never
   * sets this target, so navigating to an existing card focuses it without the
   * grow-in.
   */
  function claimGrow(client_id: string): boolean {
    if (pending_grow_client_id.value !== client_id) return false
    pending_grow_client_id.value = null
    return true
  }

  /** Called by the mounted editor list on mount/unmount to publish its scroller. */
  function registerScroller(scroller: { scrollToCard: (client_id: string) => void } | null) {
    list_scroller.value = scroller
  }

  /**
   * The grid dropdown's "Edit" intent: switch to edit mode, then scroll the
   * chosen card into view. The scroll waits on the mode transition settling —
   * mode-stack owns the window scroll + pane transforms while it slides, so
   * scrolling earlier lands at the wrong offset. `scrollToCard` pulls the row
   * into the virtualizer's window even when it starts outside the current range,
   * and `pending_focus_client_id` lands the editor focus on it — without the
   * grow-in reveal, which stays reserved for freshly-added cards (`claimGrow`).
   */
  async function editCard(card_id: number) {
    const entry = list.all_cards.value.find((c) => c.id === card_id)
    if (!entry) return

    pending_focus_client_id.value = entry.client_id
    await opts.shell.setMode('edit')
    list_scroller.value?.scrollToCard(entry.client_id)
  }

  /**
   * Reposition a persisted card within the deck by drag index. `from`/`to` are
   * indices into `list.all_cards`. Mints a key between the drop slot's two
   * persisted neighbours and fires the mutation, which optimistically re-keys
   * and re-sorts the cache synchronously (so the dropped row settles without a
   * refetch) and reconciles on settle. Failures roll back in the mutation, so
   * the reorder visibly snaps back — a toast explains why.
   *
   * No-op when the dragged row is a temp: it has no key yet, and nothing to
   * persist until its first save.
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
   *
   * The key is minted here, not when the card was staged, so it reflects
   * whatever the temp's neighbours are at the moment it's actually saved.
   *
   * `guardAddCards` already vetoes staging past the plan cap, but that check
   * runs when the temp is added — a stale `card_count` or a concurrent edit on
   * another device can still let a write reach the cap trigger and be rejected
   * here. `handleLimitError` re-surfaces the upgrade alert for that case and the
   * entry is left staged for the caller to keep or roll back. Any other
   * rejection propagates.
   *
   * @returns `false` when the cap rejected the write, `true` on success.
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
   * Failures are swallowed: this insert only ever carries an empty card, so
   * nothing the user typed can be lost. The entry simply stays a temp and the
   * next edit re-inserts it — no error toast for a save the user never asked
   * for. A cap rejection is the exception: the deck genuinely can't hold the
   * card, so the row comes back out of the list.
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
   * @param staged - The entry the card had before any in-flight eager insert
   *   resolved, or `undefined` for an already-persisted card. Re-read here by
   *   client_id: the insert may have promoted it (so this is an UPDATE) or, at
   *   the cap, rolled it out of the list entirely (so there's nothing to save).
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
