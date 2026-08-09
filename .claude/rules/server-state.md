---
title: Server State with Pinia Colada
lastUpdated: 2026-04-17T01:31:17Z
paths:
  - 'src/api/**/*'
  - 'src/composables/**'
  - 'src/**/*.vue'
---

# Server State with Pinia Colada

Server state (fetched rows — decks, cards, reviews, members, shop, purchases) lives in the **Pinia Colada** query cache. Client state (auth session, theme, modal stack, shortcut registry) stays in **Pinia**. The two never overlap.

## `src/api/` topology

```
src/api/<domain>/
├── db/              # internal — pure Supabase calls
├── queries/         # useXxxQuery hooks
├── mutations/       # useXxxMutation hooks
└── index.ts         # public barrel re-exporting queries + mutations
```

Exception: `src/api/session.ts` stays flat; auth identity lives in `useSessionStore`.

## Rules

- Components, views, and composables import **hooks only**, from the domain barrel (`@/api/decks`, `@/api/cards`). Never import from `@/api/<domain>/db`.
- `db/` is internal — only the domain's own `queries/` and `mutations/` import from it. Cross-domain `db/` imports are allowed when a compound operation needs to stitch calls together.
- Mutations invalidate by query-key prefix in `onSettled`. Never clear the cache wholesale.
- **The mutation owns invalidation end to end.** If the hook needs caller context to invalidate fully (e.g. which source decks a bulk move emptied), extend the mutation **vars** to carry it — never leave half the invalidation in the calling composable's post-`await` code. Callers hand off and forget; composables are thin pass-throughs, not cache participants.
- The member store (`useMemberStore`) is a Pinia projection of `useCurrentMemberQuery`. Its `id` field is sourced from `useSessionStore().user?.id`, **not** from the query data — sourcing from the query creates a race during auth restore where downstream api calls see `undefined`.
