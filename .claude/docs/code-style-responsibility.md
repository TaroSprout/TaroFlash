# One responsibility per function

A function either orchestrates other functions or performs one concrete piece of work — never both.

- **Orchestrator**: routes, sequences, handles errors. Body is mostly calls.
- **Worker**: does the thing (network, DOM, payload). Body has the logic.

Signal you've crossed the line: a function that calls a helper _and_ wraps a `try/finally` _and_ builds an object literal inline. Split it.
