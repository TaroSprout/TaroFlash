# Flakiness audit

Reject tests that:

- Wait on timers/animations without a concrete trigger
- Skip `await` before async-rendered queries
- Share mutable state across tests (missing `beforeEach`/`afterEach` reset)
- Hard-code locale or date values that drift across environments or month/year boundaries
- Have silent early returns (`if (!data) return`) that pass vacuously
- Use overly broad assertions (`toBeDefined()` where the value matters)
- Don't actually exercise the changed lines
