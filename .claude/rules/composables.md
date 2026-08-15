---
lastUpdated: 2026-04-25T00:00:00Z
paths:
  - 'src/composables/**/*.ts'
---

# Composable Conventions

**Owns where a composable lives and how a capability composable is shaped.** Reaches you adding or
moving anything under `src/composables/`.

## Where a composable lives

Feature-private composables **colocate with their feature** (`src/views/<feature>/composables/`). `src/composables/` is reserved for primitives any feature can import — a global folder connotes "reusable", so filing feature-private logic there lies about its scope.

Test: _would another feature import this?_ No → colocate.

**Promote on the second unrelated caller** — [`architecture/utils`](./architecture/utils.md) states the general rule this instantiates. A `useXModal()` called from one feature stays colocated; once a second, unrelated caller appears, move it to `src/composables/<feature>/` — named after the feature it belongs to, not the caller that happened to build it first. Leaving it under the first consumer makes that consumer the de facto owner of something another feature depends on.

## Capabilities are ComputedRefs

Capability composables (`useCan`) expose `ComputedRef` values and source their own reactive inputs — stores and queries pulled in inside the composable, not passed as arguments.

```ts
can.createDeck.value // re-evaluates when plan / deck count changes
can.createDeck(count) // wrong — stale by construction
```

A function-call capability can't react to a plan flipping free→paid mid-session. Take params only when the check is genuinely per-instance against a live value the caller owns (see `addCards` in `src/composables/can.ts`).

## Don't merge a real domain split

When removing speculative generality (a "mode-agnostic core" + wrapper pair built for a second mode that never shipped), check whether the file boundary maps to a **real responsibility split** before collapsing it. If it does — FSRS queue/scheduling vs. card-side flipping — keep the files apart and just reframe the naming and docs. Merge only when the split itself was arbitrary, not merely mis-framed.
