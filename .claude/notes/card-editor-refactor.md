# Card-editor architecture refactor — follow-up

Status: prior branches all merged to master. Composables now live under
`src/composables/card-editor/`. The list below is what _remains_; completed
items are kept as strikethroughs for historical context.

---

## Sessions to date

### Session A — single-controller restructure

Split the old `useCardBulkEditor` aggregator into four composables + a
controller that became the single feature root. Single
`provide('card-editor', editor)` from `deck-view.vue`; every consumer does
exactly one `inject<CardListController>('card-editor')!`.

Design rules locked in:

1. Single provide / single inject per feature.
2. Controller owns its queries (callers pass `deck_id` only).
3. Mode lives on the intent layer, not on selection.
4. Intent handlers take explicit args to mutations.
5. Helpers inline if small + single-call-site.
6. Controller return is explicit-pick, not `...spread`.

### Session B — component-owned editor state (PR #143)

Killed the optimistic-rollback machinery in the mutation layer in favour of
local component state in `list-item-card.vue`. `saveCard` (db) is pure;
`useSaveCardMutation` no longer invalidates the deck on settle; save
failures surface via a new `error` prop on `Card`. Architecture rule added:
`src/api/` functions must not mutate their args.

### Session C — temp-card lifecycle, decoupling, and convention pass

Shipped on `refactor/card-editor-composables` (merged to master).

**Temp-card lifecycle (Item #2 from old list — option (b) chosen):**

- Every rendered card carries a stable `client_id` (uid()-based) used as the
  v-for key; `Card & { client_id: string }` wrapper exposed by
  `all_cards.value`.
- `promoteTemp(temp_id, real_id, rank, values)` seeds a per-deck Map
  `client_id_by_real_id` so the persisted refetch reuses the temp's
  client_id — text editor stays mounted across the temp → persisted
  handoff. No more `local_keys` Map, no more `id < 0` / `id > 0` sentinels,
  no more brittle key migration.
- `live_temps` filters out promoted entries whose persisted refetch has
  arrived (`persisted_id_set.has(entry.real_id)`). Dedupe is now explicit.
- Dev-only invariant `assertUniqueClientIds(cards)` runs inside `all_cards`
  to catch dedupe regressions loudly.
- `findEntryByCardId(id)` replaces `findTemp` and the sign-of-id sniffing.
  Used by `updateCard` to branch INSERT vs UPDATE on
  `entry.real_id === null`.

**Layering / decoupling:**

- `useCardMutations` is now a thin wrapper layer over `@/api/cards` hooks
  (`insertCard`, `saveCard`, `deleteCards`, `moveCards`). Zero knowledge of
  list state. Controller owns the temp-routing in `updateCard` and the
  `saving` flag.
- `useCardSelection(deck_id)` self-owns its query, reading
  `total_card_count` from `useDeckQuery.card_count`. Dropped the dead
  `useDeckCardIdsQuery` + `fetchCardIdsByDeckId` db helper.
- `useCardListController({ deck_id })` self-owns its `useDeckQuery`
  (Pinia Colada dedupe means `deck-view`'s own call shares the cache).
  Controller `Options` no longer takes `deck_query`.
- Composables and tests regrouped under `src/composables/card-editor/` and
  `tests/unit/composables/card-editor/`.

**Single-responsibility / nesting pass on the controller:**

- `withSaving<T>(fn)` — generic try/finally wrapper around the saving flag.
- `insertTemp(temp_id, entry, values)` — INSERT + promote, no flag logic.
- `confirmDelete(count)` — opens the alert, returns the response promise
  (no double-await).
- `afterDelete()` — selection clear + refetch + setMode('view') trio.
- `resolveDeleteArgs(additional_card_id)` — pure: deduces
  `{ count, args }` or `null` from selection state.
- `openMoveModal(cards)` — sfx + modal open + settle sfx, returns response.
- `updateCard`, `onDeleteCards`, `onMoveCards` are now flat orchestrators
  with early returns.

**Single-responsibility pass on `virtual-card-list`:**

- `wrapPersisted()`, `withTempInserted(cards, entry)`,
  `assertUniqueClientIds(cards)` — `all_cards` computed reads as
  `live_temps.value.reduce(withTempInserted, wrapPersisted())`.
- `resolveAnchor(left, right)` and `buildEmptyCard()` extracted from
  `addCard`.

**Rules added:**

- `.claude/rules/composables.md` — JSDoc on every exported function in
  `src/composables/`; lead with behaviour; document edge cases; skip
  restating the type.
- `.claude/rules/code-style.md` — blank-line grouping inside function
  bodies; max one level of nesting (use early returns and inverted ifs);
  one responsibility per function (orchestrator vs worker).

**Tooling:**

- Skill `prepare-prs` renamed to `prepare-pr`. New `--split` flag (default =
  single PR; bundles uncommitted work into the PR).

**Test count:** 1132 passing. vue-tsc: 0 errors. Format: clean.

### Session D — image orchestration + convention polish

Shipped on `refactor/card-editor-image-orchestration`.

- **Image writes routed through the layer (Item #4):** `setCardImage` /
  `deleteCardImage` added to `useCardMutations` (deck_id from the closure),
  exposed on the controller wrapped in `withSaving`. `list-item-card.vue` no
  longer imports `@/api/cards` directly — it calls `editor.setCardImage` /
  `editor.deleteCardImage`, keeping its toast error handling. Image ops now
  share the `saving` flag and the mutation test surface.
- **Magic timeout removed (Item #5):** `list-item-card.vue` dropped the
  `setTimeout(resolve, FOCUS_DELAY)` blur-settle dance for native
  `@focusin` / `@focusout` on the root, using `relatedTarget` to tell
  intra-card focus moves from edge crossings. sfx is gated on contenteditable
  focus so the image button doesn't trigger it. `FOCUS_DELAY` is gone.
- **Named prop types (Item #5):** `ListItemProps` / `ListItemCardProps`
  extracted per `.claude/rules/vue-props.md`.
- **Item #3 dropped as obsolete** — see below.

---

## What remains — the follow-up refactor

Ordered by impact ÷ effort. Pick up from the top in a fresh session.

### 1. [DONE] ~~Optimistic rollback on updateCard~~

Shipped Session B. See above.

### 2. [DONE] ~~Temp-card lifecycle refactor~~

Shipped Session C. Option (b) — client-side `client_id` instead of relying
on id sign — chosen and implemented. The dev invariant assertion landed
alongside.

### 3. [DROPPED — obsolete] select-all completeness constraint

The truncation risk this guarded against no longer exists. Payload-building
moved to `src/utils/card-editor/selection-payload.ts`, and **both** delete and
move route select-all through the server-side paths (`{ except_ids }` /
`{ source_deck_id, except_ids }`), so loaded-only enumeration is never used to
build a write payload in select-all mode.

The note's proposed hard guard (throw in `loadedSelectedCards` when
`select_all_mode && hasNextPage`) is now actively wrong: `loadedSelectedCards`
is deliberately called in select-all mode to build the move modal's
`preview_cards`, and is documented "incomplete by design." A throw there would
break the move preview. Nothing to do.

### 4. [DONE — Session D] Image mutations bypass the orchestration layer

`setCardImage` / `deleteCardImage` now live on `useCardMutations` (deck_id from
the closure) and are exposed on the controller wrapped in `withSaving`.
`list-item-card.vue` calls `editor.setCardImage` / `editor.deleteCardImage`
instead of importing `@/api/cards`. Covered in `card-mutations.test.js` and
`card-list-controller.test.js`; `list-item-card.test.js` asserts on the
provided controller methods.

### 5. [DONE — Session D] Convention polish (bundle)

- Magic timeout: `list-item-card.vue` replaced `setTimeout(resolve, FOCUS_DELAY)`
  with native `@focusin` / `@focusout` + `relatedTarget`; `FOCUS_DELAY` removed.
- Named prop types `ListItemProps` / `ListItemCardProps` extracted per
  `.claude/rules/vue-props.md`.
- ~~Invariant assertion in `virtual-card-list.ts`~~ — Session C
  (`assertUniqueClientIds`).
- ~~Temp → real id promotion doc block~~ — Session C JSDoc.

---

## New smells observed during the refactor (not in the original audit)

| #   | Smell                                                                                             | Note                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Controller couples UI primitives (`useModal`, `useAlert`, `useI18n`, `emitSfx`, `MoveCardsModal`) | Deliberate. Factoring them out as callbacks was considered and rejected for one-call-site boilerplate. Revisit if the controller needs to run headless (e.g. a bulk-import tool). |
| B   | `addCard()` with no args lands mid-deck when `hasNextPage` is true                                | Documented inline in `virtual-card-list.ts:addCard`. Proper fix: gate the global "+ card" affordance on `!hasNextPage`, or make `addCard` load all pages first.                   |
| C   | `saving` flag is global, not per-card                                                             | User editing two cards quickly can't tell which is in-flight. If relevant UX, add `saving_card_ids: Ref<Set<number>>` to the controller.                                          |

---

## Controller public surface (current)

For reference when wiring tests / new consumers:

```ts
{
  // list — rendered cards + add/append/prepend
  all_cards, addCard, appendCard, prependCard,

  // selection — predicates, actions, derived counts
  isCardSelected, selectCard, deselectCard, toggleSelectCard,
  selectAllCards, clearSelectedCards, toggleSelectAll,
  selected_card_ids, deselected_ids, select_all_mode,
  selected_count, all_cards_selected, total_card_count,

  // writes — in-flight flag + edit entry-point
  saving, updateCard,

  // deck-derived
  card_attributes, deck_id,

  // UI state
  mode, setMode,

  // infinite scroll
  hasNextPage, isLoading, observeSentinel,

  // intent handlers — what templates call on user actions
  onCancel, onDeleteCards, onSelectCard, onMoveCards,
}
```

Notes:

- `getKey` is gone. v-for keys come straight from `card.client_id` on each
  item in `all_cards`.
- `all_cards` items are typed `CardWithClientId = Card & { client_id: string }`.
- Internal seams (`findEntryByCardId`, `findCard`, `promoteTemp`,
  `temp_entries`, `persisted_cards`, `filterSelected`, `deleteCards`,
  `moveCards`, `insertCard`, `saveCard`) do not leak to the consumer
  surface.

---

## Gotchas for the next session

- Composables now live under `src/composables/card-editor/`. Imports use
  `@/composables/card-editor/<name>`. Old top-level paths are gone.
- `vp fmt` / `vp check --fix` will reformat unrelated markdown across
  `.claude/rules/`, `.claude/skills/`, `CLAUDE.md`. Run
  `git restore --source=master --` on those before committing. Same applies
  to any file you haven't intentionally touched.
- Baseline test count going into the next session should be **1132**. If it
  differs, something regressed before you started.
- `vp dlx vue-tsc --noEmit -p tsconfig.app.json` is the typecheck invocation
  (`vp check` does not run tsc).
- Pinia Colada mutation signature differs slightly from TanStack — check
  `src/api/cards/mutations/save.ts` for the current `onSettled` shape before
  adding `onMutate`.
- Two project rules now in force on any composables work:
  `.claude/rules/composables.md` (JSDoc), `.claude/rules/code-style.md`
  (blank-line grouping, max one level of nesting, single responsibility).
