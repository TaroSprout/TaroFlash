---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# One responsibility per function

**Owns whether a function orchestrates or does the work — never both.**

A function either orchestrates other functions or performs one concrete piece of work — never both.

- **Orchestrator**: routes, sequences, handles errors. Body is mostly calls.
- **Worker**: does the thing (network, DOM, payload). Body has the logic.

Signal you've crossed the line: a function that calls a helper _and_ wraps a `try/finally` _and_ builds an object literal inline. Split it.
