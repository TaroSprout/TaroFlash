---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Supabase calls belong in `src/api/`

**Owns where a Supabase call may live.**

All Supabase client calls must live in the appropriate `src/api/` module. Never call `supabase` directly from composables, views, or components. Components consume the domain barrel via hooks (`useXxxQuery` / `useXxxMutation`); the raw Supabase calls live in `src/api/<domain>/db/` and are internal.

```ts
// Bad — supabase call inline in a composable
const { data } = await supabase.from('decks').select('*')

// Good — call the query hook exported by the domain
import { useMemberDecksQuery } from '@/api/decks'
const { data: decks } = useMemberDecksQuery()
```

If no suitable domain exists, create one as `src/api/<domain>/` with `db/`, `queries/`, `mutations/`, and `index.ts`. See [`server-state`](../server-state.md) for the full topology.

## A behaviour is owned by its single seam

A behaviour that must happen for every instance of an action — a sound, a cache invalidation, a fix
for a misbehaving event, an optimistic apply — is implemented once, in the single function or layer
that performs the underlying action, never wired or half-wired at each call site, where copies drift
or double up. [`sfx`](../sfx.md), [`server-state`](../server-state.md), and
[`ui-kit`](./ui-kit.md) apply this to a sound, a mutation's invalidation, and a stray DOM event; the
rule below is this file's own instance, for optimistic apply.

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
