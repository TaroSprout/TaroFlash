---
lastUpdated: 2026-05-17T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Code Style

Seven rules; each is a quick read. Apply every edit.

- [`code-style-phases`](../docs/code-style-phases.md) — blank lines mark phases inside a function body
- [`code-style-nesting`](../docs/code-style-nesting.md) — at most one level of `if` / `for` / `try`; invert + return early
- [`code-style-responsibility`](../docs/code-style-responsibility.md) — orchestrator OR worker, never both
- [`code-style-variants`](../docs/code-style-variants.md) — no unused size/variant maps
- [`code-style-comments`](../docs/code-style-comments.md) — comment the non-obvious _why_; terse, none in templates
- [`code-style-reactivity`](../docs/code-style-reactivity.md) — `watch` is a last resort; prefer declarative
- [`code-style-signatures`](../docs/code-style-signatures.md) — params named for their role; don't re-yield a promise
