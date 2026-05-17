# Don't carry unused size / variant maps

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
