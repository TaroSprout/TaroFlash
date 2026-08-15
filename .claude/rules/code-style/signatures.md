---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Function signatures

**Owns how a function's parameters and return value are shaped.**

## Name a shared surface for its role, not its source

A parameter, a shared primitive's prop, or anything else more than one caller reaches is named for
the role it plays **inside** the thing it's part of, never for the caller, UI event, or vendor that
happens to supply it today — it starts lying the moment a different source uses the same surface.
[`architecture/ui-kit`](../architecture/ui-kit.md) and
[`comment-authoring`](../comment-authoring.md) apply this to a primitive's props and a comment's
opening subject.

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

## Don't name a competitor in code

Name a format by what it is, never by a competitor product we merely interoperate with. This
doesn't ban naming a dependency we actually call — `stripe-webhook`, `STRIPE_SECRET_KEY` are correct
because we invoke that product's own code.
