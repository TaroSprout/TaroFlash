---
lastUpdated: 2026-05-17T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Code Style

**Owns how a function and its comments are shaped.** Seven rules, one spoke each; apply every edit.

## Spokes

- [`phases`](./code-style/phases.md) — blank lines mark phases inside a function body
- [`nesting`](./code-style/nesting.md) — at most one level of `if` / `for` / `try`; invert + return early
- [`responsibility`](./code-style/responsibility.md) — orchestrator OR worker, never both
- [`variants`](./code-style/variants.md) — no unused size/variant maps
- [`comments`](./code-style/comments.md) — comment the non-obvious _why_; terse, none in templates
- [`reactivity`](./code-style/reactivity.md) — `watch` is a last resort; prefer declarative
- [`signatures`](./code-style/signatures.md) — params named for their role; don't re-yield a promise
