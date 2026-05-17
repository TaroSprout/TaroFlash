# E2E flows

- Multi-step flows shared across specs (login, sign-up, deck creation, study session) live as helpers in `tests/e2e/_helpers.ts`. Each helper is a single function that drives the flow and asserts the post-condition (e.g. `loginAs(page, user)` lands on the dashboard before returning).
- Specs call helpers — they don't re-implement the steps inline. Treat the helper as the contract: if a flow changes, update the helper once, every spec follows.
- ui-kit primitives that wrap their root in a tooltip/wrapper (e.g. `UiInput`) don't forward `data-testid` to the inner `<input>`. Wrap the call site in a `<div data-testid="...">` and target via `.locator('input')` from the wrapper. `UiButton` uses `inheritAttrs: false` and forwards `$attrs` to the root, so `data-testid` passed at the call site lands correctly.
