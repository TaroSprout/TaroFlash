---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Don't carry unused size / variant maps

**Owns when a size/variant prop earns a map vs. gets inlined.**

[`architecture/utils`](../architecture/utils.md) states the general rule — generalize only on the
second concrete caller — that both sections of this file apply to a component's props.

When a component takes a `size` / `variant` / `tier` prop and only one value is ever passed, drop the prop and inline the chosen variant's classes. Sizing/variant maps that exist "in case future callers need them" rot fast — the next real caller usually wants a shape the map didn't anticipate, and the unused branches force every reader to scan past dead code.

Add variants back when a second concrete caller arrives. Three or more concrete shapes with shared structure is the threshold for extracting a map.

```ts
// Bad — a Record<sm | base | lg, …> map where every consumer passes 'base'
const SIZES = {
  sm: { row: 'rounded-3_5 p-0.5 …', btn: 'h-6 …' },
  base: { row: 'rounded-4 p-1 …', btn: 'h-8 …' },
  lg: { row: 'rounded-5_5 p-1.5 …', btn: 'h-10 …' }
}

// Good — inline the one in use; reintroduce a map when a second size lands
class="rounded-4 p-1 …"
```

## No transitional escape hatches

Don't add a prop or flag purely to stop a call site looking broken between sequenced refactor commits. If the plan already has a later task that migrates that call site properly, let it visibly regress in the interim — an override prop whose only consumer is "temporarily, until the real fix lands" is the same speculative surface as an unused variant map, added ahead of a caller that needs it.

Add an override only when it's a genuine, permanent part of the API.
