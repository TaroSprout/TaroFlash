---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Function signatures

**Owns how a function's parameters and return value are shaped.**

## Name a shared surface for its role, not its source

- **Name a parameter, a shared primitive's prop, or anything else more than one caller reaches for
  the role it plays inside the thing it's part of** — never for the caller, UI event, or vendor that
  happens to supply it today; it starts lying the moment a different source uses the same surface.
  [`architecture/ui-kit`](../architecture/ui-kit.md) and
  [`comment-authoring`](../../knowledge/comment-authoring.md) apply this to a primitive's props and a
  comment's opening subject.
  - Bad: `onDelete(clicked_row_id)` — couples a low-level helper to one UI source, and starts lying
    the moment a keyboard shortcut, context menu, or programmatic flow calls it.
  - Good: `onDelete(additional_card_id)` — describes what the argument does here.

## Don't wrap a promise just to re-yield it

- **Return the promise instead of making the function `async` to immediately `await` it, unless the
  function does something with the resolved value** — transforms it, branches on it, narrows it,
  cleans up after it. The wrapper otherwise only adds a microtask and a fresh promise.

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

- **Assign a nested call's result to a named local before passing it — never call a function inside
  another call's argument list.** The call site reads as one step at a time instead of an expression
  the reader has to unwind.

```ts
// Bad
saveCard(buildCardPayload({ ...card, ...values }))

// Good
const payload = buildCardPayload({ ...card, ...values })
saveCard(payload)
```

## Don't name a competitor in code

- **Name a format by what it is, never by a competitor product merely interoperated with.** This
  doesn't ban naming a dependency actually invoked — `stripe-webhook`, `STRIPE_SECRET_KEY` are
  correct because that product's own code is called.
