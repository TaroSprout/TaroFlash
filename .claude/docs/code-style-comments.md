# Comments

Comment the non-obvious _why_, never the _what_. Most code needs none — a clear name beats a comment.

- **One line, maybe two.** A comment that needs a paragraph means the code is too clever (simplify it) or the rationale belongs in the commit message, not the source.
- **No narration.** Don't restate the next line (`// loop over items`) or label a section (`// setup`) — blank-line phases already segment a body ([`code-style-phases`](./code-style-phases.md)).
- **None in `<template>` markup** — see [`vue-templates`](../rules/vue-templates.md). Improve `data-testid` / slot / component names instead.
- **JSDoc on exported composable fns** stays tight — lead with behaviour, skip restating types ([`composables`](../rules/composables.md)).
- **Don't borrow a library's vocabulary.** Explain in terms the reader can observe — what the screen shows, what the user sees — not the dependency's internal nouns (`stale`, `active entry`, `prefix filter`, `hydration`). Name the API being called; never assume the reader holds its mental model. A comment that only lands for someone who has read the library's source is a comment that doesn't land.

Bad — only parses if you know how the query cache thinks:

```ts
// Stale-marking hits every match; refetching only hits mounted queries.
```

Good — same fact, observable terms:

```ts
// Flags every affected deck as out of date, but only re-downloads the one on screen.
```

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
