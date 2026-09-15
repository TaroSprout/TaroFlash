---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Don't carry unused size / variant maps

**Owns when a size/variant prop earns a map vs. gets inlined.**

[`architecture/utils`](../architecture/utils.md) states the general rule — generalize only on the
second concrete caller — that both sections of this file apply to a component's props.

- **Drop a `size`/`variant`/`tier` prop and inline the chosen variant's classes when only one value
  is ever passed.** The unused branches force every reader to scan past dead code.
- **Add variants back only at the second concrete caller, and extract a full map only once three or
  more concrete shapes share structure.**

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

- **Don't add a prop or flag purely to stop a call site looking broken between sequenced refactor
  commits.** If a later task already migrates that call site properly, let it visibly regress in the
  interim instead — an override whose only consumer is "temporarily, until the real fix lands" is the
  same speculative surface as an unused variant map, added ahead of a caller that needs it.
- **Add an override only when it's a genuine, permanent part of the API.**
