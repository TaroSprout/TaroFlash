# Comments

Comment the non-obvious _why_, never the _what_. Most code needs none — a clear name beats a comment.

- **One line, maybe two.** A comment that needs a paragraph means the code is too clever (simplify it) or the rationale belongs in the commit message, not the source.
- **No narration.** Don't restate the next line (`// loop over items`) or label a section (`// setup`) — blank-line phases already segment a body ([`code-style-phases`](./code-style-phases.md)).
- **None in `<template>` markup** — see [`vue-templates`](../rules/vue-templates.md). Improve `data-testid` / slot / component names instead.
- **JSDoc on exported composable fns** stays tight — lead with behaviour, skip restating types ([`composables`](../rules/composables.md)).

Bad — three lines narrating one branch:

```ts
// A cached image (flipping the preview away and back) is already complete;
// decode() can reject on the reinserted element, so skip it and reveal
// straight away rather than waiting on a decode that never settles.
```

Good:

```ts
// Cached image can reject decode() on reinsert — skip decode when already loaded.
```
