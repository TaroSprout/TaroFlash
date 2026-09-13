---
lastUpdated: 2026-05-17T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Code Style

**Owns how a function is shaped.** Six rules, one spoke each; apply every edit. Comments are
[`comment-authoring`](../knowledge/comment-authoring.md)'s — and, per CLAUDE.md's golden rule, only
the `comment-author` agent writes one.

## Spokes

- [`phases`](./code-style/phases.md) — blank lines mark phases inside a function body
- [`nesting`](./code-style/nesting.md) — at most one level of `if` / `for` / `try`; invert + return early
- [`responsibility`](./code-style/responsibility.md) — orchestrator OR worker, never both
- [`variants`](./code-style/variants.md) — no unused size/variant maps
- [`reactivity`](./code-style/reactivity.md) — `watch` is a last resort; prefer declarative
- [`signatures`](./code-style/signatures.md) — params named for their role; don't re-yield a promise
