# Failing test? Verify the source first

A failing test is a signal — assume the code regressed before assuming the test is wrong. Read the assertion and the code under test, run the test in isolation, confirm whether the failure is meaningful.

If there's any chance the test is catching a real bug, **stop**. Name the test, the assertion, and the suspected bug, and wait for confirmation. Only edit the test once the source is verified correct or the user confirms.

This applies to **brand-new tests** too. When a test you just wrote refuses to pass after one or two reasonable adjustments to the test scaffolding (mocks, stubs, mount mode, async timing), pause and re-read the source. The assertion was written from your understanding of what the code _should_ do — if reality keeps disagreeing, the gap may be a real bug. Don't delete the test, don't relax the assertion, don't switch to a weaker indirect check. Surface the failure to the user with: (1) the assertion, (2) the source line(s) that produced the wrong value, (3) your hypothesis. Wait for confirmation before patching either side.

**Common culprits behind "test won't pass":**

- Vue Boolean prop coercion — missing optional `?: boolean` props default to `false`, not `undefined`, so `prop ?? fallback` silently collapses
- Destructured props without a default — captured at setup, may not be reactive in older Vue versions
- Computed refs that read a non-reactive source (plain object getter, `globalThis.x`) — first read works, updates don't trigger
- Mocks not intercepting because the import path resolution differs from what `vi.mock` targets
- Stubs being replaced by `shallowMount`'s auto-stub when the override key doesn't match the component name
