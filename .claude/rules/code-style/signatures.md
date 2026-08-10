# Function signatures

## Name parameters for their role, not their source

A parameter is named for the role it plays **inside** the function, never for the UI event or call site that supplied it. `clicked_row_id` couples a low-level helper to one UI source and starts lying the moment a keyboard shortcut, context menu, or programmatic flow calls it.

```ts
onDelete(clicked_row_id) // bad — leaks the row-click origin into a generic helper
onDelete(additional_card_id) // good — describes what the argument does here
```

## Don't wrap a promise just to re-yield it

If a function doesn't _do_ anything with the resolved value — transform it, branch on it, narrow it, clean up after it — return the promise instead of making the function `async` to immediately `await` it. The caller awaits either way; the wrapper only adds a microtask and a fresh promise, and implies the function does something it doesn't.

```ts
// Bad
async function confirmDelete(): Promise<boolean> {
  const { response } = alert.warn({ … })
  return await response
}

// Good
function confirmDelete() {
  const { response } = alert.warn({ … })
  return response
}
```

## Lift a nested call out of an argument list

Don't call a function inside another call's argument list. Assign the inner result to a named local
first, then pass the local — the call site reads as one step at a time instead of an expression the
reader has to unwind.

```ts
// Bad
saveCard(buildCardPayload({ ...card, ...values }))

// Good
const payload = buildCardPayload({ ...card, ...values })
saveCard(payload)
```

## Name an interop target by its format, never a product we don't call

A dependency this codebase imports and invokes is named plainly — `stripe-webhook`,
`STRIPE_SECRET_KEY`, `supabase/functions/` are correct, because that is the product's own name for
code that calls it. The ban is narrower: never name a product this codebase merely **reads or writes
a format for** — one whose format we interoperate with or compete against, without calling its
code. An export this app hands off to another app is "an importer's format", not that importer's
brand name.
