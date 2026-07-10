---
lastUpdated: 2026-07-10T17:37:36Z
---

# Server State

Server state (decks, cards, reviews, members, billing, lessons) is owned by the **Pinia Colada** query cache. Client state (session, theme, modal stacks, shortcut registry) is owned by **Pinia**. The two never overlap.

This split matters because server state is inherently stale — it lives on the server, gets mutated elsewhere, and needs coherent invalidation. Trying to manage it in a Pinia store means hand-rolling every feature Colada gives you for free: cache keys, deduping, refetch-on-focus, stale-while-revalidate, invalidation by prefix.

## Why two state layers?

| Concern                                                                    | Lives in                          |
| -------------------------------------------------------------------------- | --------------------------------- |
| Auth session, user id                                                      | `useSessionStore()` (Pinia)       |
| Theme, dark mode                                                           | `useThemeStore()` (Pinia)         |
| Modal stack                                                                | `useModal()` (module-level state) |
| Shortcut registry                                                          | `useShortcutStore()` (Pinia)      |
| **Fetched rows** — decks, cards, reviews, member profile, billing, lessons | **Pinia Colada** cache            |

The member store is the interesting hybrid: `useMemberStore()` is a Pinia store whose fields are a computed projection of `useCurrentMemberQuery().data`. It exists so that callers can do `memberStore.display_name` synchronously inside components. See [Member store](#member-store-a-pinia-wrapper-around-the-member-query) below.

## `src/api/` layout

Every server-state domain has the same shape:

```
src/api/
├── decks/
│   ├── db/                    # internal — pure Supabase calls
│   │   └── index.ts
│   ├── queries/               # useXxxQuery hooks
│   │   ├── list.ts
│   │   ├── by-id.ts
│   │   ├── count.ts
│   │   └── index.ts
│   ├── mutations/             # useXxxMutation hooks
│   │   ├── upsert.ts
│   │   ├── delete.ts
│   │   └── index.ts
│   └── index.ts               # public barrel: queries + mutations
├── cards/    (same shape, plus mutations/_invalidate.ts — see below)
├── members/  (same shape)
├── reviews/  (same shape)
├── billing/  (same shape)
├── lessons/  (same shape)
├── media/    (same shape)
└── session.ts                 # exception — auth stays flat and not wrapped
```

**Rules:**

- Components, views, and composables import **hooks only**, from the domain's top-level barrel (`@/api/decks`, `@/api/cards`).
- `db/` is internal. The only thing that imports from `@/api/<domain>/db` is the domain's own `queries/` and `mutations/` — and occasionally another domain's `db/` when a compound operation needs to stitch calls together (e.g. `cards/db/update.ts::setCardImage` calls into `media/db`).
- `session.ts` stays flat because auth identity lives in a Pinia store, not a query cache. The other fields on the member store (`display_name`, `plan`, etc.) come from a query; the `id` comes from the session store.
- A leading underscore marks an internal helper module, not a hook — `cards/mutations/_invalidate.ts` exports `invalidateDeck`, `invalidateAllCardCounts`, and `invalidateCardIndex`, and every card mutation's `onSettled` calls into these instead of inlining `queryCache.invalidateQueries` itself. Reach for this pattern once a domain's mutations share the same handful of invalidation shapes.

## Query keys

Keys are arrays that uniquely identify a slot in the cache. Same key means same data. Invalidating a prefix invalidates every key that starts with it — which is what makes the split design below work.

| Domain  | Key shape                             | Purpose                                                 |
| ------- | ------------------------------------- | ------------------------------------------------------- |
| decks   | `['decks']`                           | current member's deck list                              |
| decks   | `['decks', 'count']`                  | deck-count-only query (gate checks)                     |
| decks   | `['deck', id]`                        | one deck's full detail (incl. cards embed)              |
| cards   | `['cards', deck_id]`                  | all cards in a deck                                     |
| cards   | `['cards', deck_id, 'search', query]` | search within a deck                                    |
| cards   | `['cards', 'count', opts]`            | member card count (with optional filters)               |
| cards   | `['cards', 'index']`                  | member-wide card front-text search index                |
| members | `['member', user_id]`                 | current member's profile                                |
| billing | `['billing', 'subscription']`         | caller's Stripe subscription + upcoming invoice preview |
| billing | `['billing', 'invoices', limit]`      | recent invoices                                         |
| billing | `['billing', 'payment-methods']`      | saved payment methods                                   |
| lessons | `['lesson-collections']`              | current member's lesson collections                     |
| lessons | `['lesson-collection', id]`           | one collection's detail (incl. playback bookmark)       |
| lessons | `['lesson', id]`                      | one lesson's detail                                     |
| lessons | `['lessons', collection_id]`          | lessons within a collection                             |

Notes:

- `['decks']` and `['deck', id]` are **distinct top-level prefixes**. Invalidating the list does not invalidate detail, and vice versa — both have to be hit explicitly from any mutation that touches both.
- `['cards', deck_id, 'search', q]` **nests under** `['cards', deck_id]`, so a single `invalidateQueries({ key: ['cards', deck_id] })` call covers both the full-list query and every live search within that deck.
- `['cards', 'index']` is invalidated (not refetched) on every card create/delete/front-edit/move — it only refetches while something reading it (e.g. a lesson) is actually mounted.
- `['member', user_id]` includes the user id so a login-as-different-user session naturally lands in a fresh cache slot.
- Billing mutations invalidate either the whole `['billing']` prefix or a narrower sub-key (`['billing', 'payment-methods']`) depending on what actually changed — see the table below.

## Invalidation contracts

Every mutation's `onSettled` handler documents what goes stale when that mutation succeeds (or fails — we invalidate in both cases, since the remote state may have changed partway through).

| Mutation                                                                                    | Invalidates                                                                                         |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `useUpsertDeckMutation`                                                                     | `['decks']` + `['deck', id]` (if id present)                                                        |
| `useDeleteDeckMutation`                                                                     | `['decks']` + `['deck', id]`                                                                        |
| `useUpsertCardMutation`                                                                     | `['deck', deck_id]` + `['cards', deck_id]` + `['cards', 'index']`                                   |
| `useSaveCardMutation`                                                                       | `['cards', 'index']` only (debounced — see [Edge cases](#edge-cases))                               |
| `useInsertCardAtMutation`                                                                   | deck + `['cards', 'count']` + `['decks']` + `['cards', 'index']` (new card shifts counts)           |
| `useUpsertCardsMutation`                                                                    | every affected deck + all card counts + `['cards', 'index']`                                        |
| `useDeleteCardsMutation`                                                                    | every affected deck + all card counts + `['cards', 'index']`                                        |
| `useMoveCardMutation`                                                                       | deck only (reorder within a deck doesn't touch counts or index)                                     |
| `useMoveCardsToDeckMutation`                                                                | **source** deck(s) **and** destination deck + all counts + `['cards', 'index']`                     |
| `useSetCardImageMutation`                                                                   | deck (`deck_id` comes from the mutation variables, not the card row)                                |
| `useDeleteCardImageMutation`                                                                | deck                                                                                                |
| `useSaveReviewMutation`                                                                     | `['decks']` + `['deck', deck_id]` + `['cards', deck_id]` — fixes dashboard drift                    |
| `useUpsertMemberMutation`                                                                   | `['member', id]`                                                                                    |
| `useCancelSubscriptionMutation` / `useChangePlanMutation` / `useResumeSubscriptionMutation` | `['billing']` + `['member']`                                                                        |
| `useDetachPaymentMethodMutation` / `useCreateSetupIntentMutation`                           | `['billing', 'payment-methods']`                                                                    |
| `useSetDefaultPaymentMethodMutation`                                                        | `['billing', 'payment-methods']` + `['billing', 'subscription']`                                    |
| `useStartLessonMutation` / `useRetryLessonMutation`                                         | `['lessons', collection_id]`                                                                        |
| `useDeleteLessonMutation`                                                                   | `['lessons', collection_id]` + `['lesson-collections']` + `['lesson', id]` (on success only)        |
| `useCreateLessonCollectionMutation` / `useDeleteLessonCollectionMutation`                   | `['lesson-collections']` (+ the collection's own detail/lesson-list keys on delete)                 |
| `useUploadImageMutation`                                                                    | none — the URL is the result; callers persist it on the owning entity, which invalidates separately |

The `saveReview` entry is the one the whole migration was built around: before Colada, reviewing a card in a study session never told the dashboard its `due_count` had dropped. Now it invalidates `['decks']` (dashboard list), `['deck', deck_id]` (detail view), and `['cards', deck_id]` (card list + nested search), and all three refetch automatically.

## Reading queries in a component

```vue
<script setup lang="ts">
import { useMemberDecksQuery } from '@/api/decks'

const { data: decks, error, status } = useMemberDecksQuery()
</script>

<template>
  <div v-if="status === 'pending'">Loading…</div>
  <div v-else-if="error">{{ error.message }}</div>
  <div v-else v-for="deck in decks" :key="deck.id">{{ deck.title }}</div>
</template>
```

Templates auto-unwrap `data`. Use `computed(() => data.value ?? [])` when the default-empty shape needs to be defensive, or when other logic derives from the list.

For queries that depend on a prop, wrap the argument in a getter so the key stays reactive:

```ts
const { id } = defineProps<{ id: string }>()
const deck_query = useDeckQuery(() => Number(id))
```

## Running mutations

```ts
import { useUpsertDeckMutation } from '@/api/decks'

const upsert_mutation = useUpsertDeckMutation()

async function save(deck: Deck) {
  await upsert_mutation.mutateAsync(deck)
  // invalidations fire in onSettled; dashboard refetches automatically
}
```

Use `mutate()` for fire-and-forget (study-session review saves), `mutateAsync()` when the caller needs to await completion. Errors surface through `mutateAsync()`'s rejection or the `onError` hook on the mutation.

## Member store: a Pinia wrapper around the member query

```ts
// src/stores/member.ts
export const useMemberStore = defineStore('member', () => {
  const session = useSessionStore()
  const query = useCurrentMemberQuery()
  const member = query.data

  // id comes from session (set synchronously on auth restore);
  // profile fields come from the query.
  const id = computed(() => session.user?.id)
  const display_name = computed(() => member.value?.display_name)
  // …other fields
})
```

`id` is deliberately **not** derived from `member.value?.id`. The member-profile query is gated on `session.user?.id` and only fires once auth is restored — sourcing `id` from the query would create a window where `memberStore.id` reads `undefined` while the profile is still fetching, and any API call during that window passes `"undefined"` to Supabase's UUID column. By sourcing from the session, every api function that reads `memberStore.id` gets the real UUID the moment the session restores.

## Testing api hooks

The wrapper hooks are thin by design — their entire contract is "configure a Colada `useMutation` / `useQuery` with the right key, query, and invalidations." The cleanest way to test them is to mock `@pinia/colada` and assert on the config object passed in:

```ts
const { useMutationSpy, invalidateSpy, saveReviewMock } = vi.hoisted(() => ({
  useMutationSpy: vi.fn((cfg) => cfg),
  invalidateSpy: vi.fn(),
  saveReviewMock: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@pinia/colada', () => ({
  useMutation: useMutationSpy,
  useQueryCache: () => ({ invalidateQueries: invalidateSpy })
}))

vi.mock('@/api/reviews/db', () => ({ saveReview: saveReviewMock }))

import { useSaveReviewMutation } from '@/api/reviews/mutations/save'

test('invalidates all three prefixes on settled', () => {
  useSaveReviewMutation()
  const { onSettled } = useMutationSpy.mock.calls[0][0]
  onSettled(undefined, undefined, { card_id: 1, deck_id: 7, card: {}, log: {} })

  expect(invalidateSpy).toHaveBeenCalledWith({ key: ['decks'] })
  expect(invalidateSpy).toHaveBeenCalledWith({ key: ['deck', 7] })
  expect(invalidateSpy).toHaveBeenCalledWith({ key: ['cards', 7] })
})
```

This pattern scales across every query and mutation wrapper — you never need a real Pinia instance, and the tests pin down the invalidation contract.

For components that consume hooks, `vi.mock('@/api/cards', ...)` with a mocked shape works. For queries whose reactivity matters in the test (e.g. `watch(cards_query.data, ...)`), use an **async `vi.hoisted`** to bring in a real Vue ref:

```ts
const { cardsDataRef } = await vi.hoisted(async () => {
  const { shallowRef } = await import('vue')
  return { cardsDataRef: shallowRef(undefined) }
})

vi.mock('@/api/cards', () => ({
  useCardsInDeckQuery: () => ({ data: cardsDataRef, refetch: vi.fn(), refresh: vi.fn() })
}))
```

A plain `{ value: … }` object is not reactively tracked and watchers bound to it will never fire.

## Edge cases

- **`saveCard` debounce lives in the mutation, not the db function.** `db/update.ts::saveCard` is a straight upsert. The `useSaveCardMutation` wrapper passes it through `debounce(fn, { key: 'card-${id}' })` so concurrent edits on the same card coalesce while concurrent edits on different cards don't supersede each other.
- **Image mutations require `deck_id` even though the db call doesn't.** `setCardImage(card_id, file, side)` persists the image and has no need for the deck id. But the **mutation wrapper** needs `deck_id` to invalidate `['deck', deck_id]` and `['cards', deck_id]`. Callers must pass it alongside the file.
- **Bulk card mutations aggregate `deck_id`s.** `useUpsertCardsMutation`, `useDeleteCardsMutation`, and `useMoveCardsToDeckMutation` collect the deck ids involved (via `new Set(cards.map(c => c.deck_id))`) and invalidate each one. Cards without a `deck_id` are skipped — no `['deck', undefined]` key is ever emitted.
- **`useMoveCardsToDeckMutation` invalidates BOTH source and destination.** When cards cross decks, both deck aggregates change. The source ids come from `cards[*].deck_id` (read before the move); the destination from `vars.deck_id`.
- **No `onSettled` on `useUploadImageMutation`.** The upload returns a URL that the caller stores on the owning entity (e.g. `deck.cover_config.bg_image`). The owner's own mutation invalidates its cache. Uploading on its own has no cache to invalidate.
