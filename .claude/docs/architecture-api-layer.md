# Supabase calls belong in `src/api/`

All Supabase client calls must live in the appropriate `src/api/` module. Never call `supabase` directly from composables, views, or components. Components consume the domain barrel via hooks (`useXxxQuery` / `useXxxMutation`); the raw Supabase calls live in `src/api/<domain>/db/` and are internal.

```ts
// Bad — supabase call inline in a composable
const { data } = await supabase.from('decks').select('*')

// Good — call the query hook exported by the domain
import { useMemberDecksQuery } from '@/api/decks'
const { data: decks } = useMemberDecksQuery()
```

If no suitable domain exists, create one as `src/api/<domain>/` with `db/`, `queries/`, `mutations/`, and `index.ts`. See [`server-state`](../rules/server-state.md) for the full topology.

## `src/api/` functions must not mutate their arguments

API-layer functions are thin network adapters. They must not mutate their input parameters — callers can't tell from the signature which fields are now stale, and optimistic-UI rollback becomes impossible because the "before" state is already gone by the time the network fails. Optimistic apply belongs in the composable that calls the mutation, not in the network adapter.

```ts
// Bad — mutates `card` before the network call
export async function saveCard(card: Card, values: Partial<Card>) {
  Object.assign(card, values)
  await upsertCard(buildCardPayload(card))
}

// Good — builds an immutable payload, leaves `card` untouched
export async function saveCard(card: Card, values: Partial<Card>) {
  await upsertCard(buildCardPayload({ ...card, ...values }))
}
```
