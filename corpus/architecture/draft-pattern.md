---
id: draft-pattern
domain: architecture
status: current
hazard: false
related: []
updated: 2026-08-08
---

# The draft pattern

`useDraft` (`src/composables/draft.ts`) is the shared shape behind every editor
that lets someone stage changes to a row of data — a deck's settings, a
member's profile — before deciding whether to save them.

A draft is a deep-reactive clone of the row's last-saved shape. The form or
designer mutates that clone directly, including nested objects, and the draft
tracks whether it has drifted from the saved baseline.

## Dirty-checking clones and diffs instead of watching writes [K:draft-clone-and-diff]

The draft doesn't intercept every mutation to know it changed — it keeps a
second clone of the last-saved baseline and compares the two by deep equality
whenever `is_dirty` is read. That's simpler than a write-capturing Proxy layer
and behaves identically for the small objects a draft holds, at the cost of
being a full-object comparison rather than a tracked diff.

`reset()` and a partial `rebase(keys)` both work off that same baseline —
`reset` restores it in place so component references into the state stay live,
and `rebase` can adopt only some keys as newly-saved when a write only
persisted a slice of the row.
