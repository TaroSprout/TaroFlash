---
lastUpdated: 2026-04-25T00:00:00Z
paths:
  - 'src/composables/**/*.ts'
---

# Composable Conventions

## JSDoc on every exported function

Every exported function in a composable file — the `useXxx` hook itself and any helper it returns — gets a JSDoc block. At minimum: a one-line summary. Add `@param`, `@returns`, or `@example` when the call site can't infer them from the signature.

```ts
/**
 * Capability checks for the current member. Each capability is a
 * ComputedRef so templates re-evaluate when member/plan state changes.
 *
 * @example
 * const can = useCan()
 * if (!can.createDeck.value) { ... }
 */
export function useCan() { ... }

/** Stage a new temp card immediately after the card with `card_id`. */
function appendCard(card_id: number) { ... }
```

Internal (non-returned) helpers get a JSDoc block when their behaviour is non-obvious from the name — sentinel constructors, memoised lookups, lifecycle hooks. Trivial one-liners don't need one.

**Why:** composables are the seam where reactive state, lifecycle, and side-effects meet. A consumer reading `editor.onDeleteCards(id?)` from a template can't tell from the signature that select-all mode routes through a different RPC, or that the call is a no-op when nothing is selected. The doc carries the load the type can't.

## What to write

- **Lead with the behaviour**, not the implementation. "Stage a new temp card" beats "pushes to `temp_entries`".
- **Document edge cases that aren't in the signature**: no-op conditions, hidden side-effects (refetches, emits, sfx), select-all vs single-row branches.
- **Skip restating the type**. `@param id - the id` is noise. Only annotate params whose meaning isn't obvious.
- **Add `@example` for the composable hook itself** when the wiring isn't obvious (provide/inject, lifecycle ordering, options shape).

## What not to write

- Don't write JSDoc that just rephrases the function name (`/** Set the mode. */ function setMode...`).
- Don't put implementation details in the doc — those rot and belong in inline comments or commit messages.
- Don't document private module-level functions that aren't exported and only have one caller. Inline `//` comments are fine there.
- Don't put JSDoc on type definitions or their properties. Type names + property names should carry the meaning. If a property genuinely needs a comment, use an inline `//` on the line above it.

```ts
// Bad — JSDoc on every property, mostly restating the name
type UseGridCapacityResult = {
  /** Number of columns currently rendered. */
  cols: ComputedRef<number>
  /** Number of full rows that fit. */
  rows: ComputedRef<number>
}

// Good — names speak; comment only the non-obvious one
type UseGridCapacityResult = {
  cols: ComputedRef<number>
  rows: ComputedRef<number>
  // 0 until first child mounts — measured from firstElementChild
  itemHeight: Ref<number>
}
```

## Where a composable lives

Feature-private composables **colocate with their feature** (`src/views/<feature>/composables/`). `src/composables/` is reserved for primitives any feature can import — a global folder connotes "reusable", so filing feature-private logic there lies about its scope.

Test: *would another feature import this?* No → colocate.

**Promote on the second unrelated caller.** A `useXModal()` called from one feature stays colocated; once a second, unrelated caller appears, move it to `src/composables/<feature>/` — named after the feature it belongs to, not the caller that happened to build it first. Leaving it under the first consumer makes that consumer the de facto owner of something another feature depends on.

## Capabilities are ComputedRefs

Capability composables (`useCan`) expose `ComputedRef` values and source their own reactive inputs — stores and queries pulled in inside the composable, not passed as arguments.

```ts
can.createDeck.value      // re-evaluates when plan / deck count changes
can.createDeck(count)     // wrong — stale by construction
```

A function-call capability can't react to a plan flipping free→paid mid-session. Take params only when the check is genuinely per-instance against a live value the caller owns (see `addCards` in `src/composables/can.ts`), and say so in the JSDoc.

## Don't merge a real domain split

When removing speculative generality (a "mode-agnostic core" + wrapper pair built for a second mode that never shipped), check whether the file boundary maps to a **real responsibility split** before collapsing it. If it does — FSRS queue/scheduling vs. card-side flipping — keep the files apart and just reframe the naming and docs. Merge only when the split itself was arbitrary, not merely mis-framed.
