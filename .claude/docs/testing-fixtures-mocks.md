# Fixtures, singletons, mocking

## Fixtures

`mimicry-js` + `faker-js` builders in `fixtures.js`.

- Single-file scope → colocate: `tests/unit/stores/theme/fixtures.js`
- Shared → `tests/fixtures/<subject>.js`

## Composable singletons

Module-scope `ref`/`reactive` persists across tests. Reset in `beforeEach` via the composable's setter; fall back to `vi.resetModules()` if none exists:

```js
beforeEach(() => useToast().clear())
```

For Pinia, see [`testing-pinia`](../rules/testing-pinia.md).

## Mocking

Prefer `vi.mock('@/composables/...')` over mocking browser APIs directly — module mocks isolate cleanly. Reset return values in `beforeEach`, override per-test.

If source logic looks wrong, ask before writing. Once confirmed correct, leave a comment explaining the non-obvious behaviour. Otherwise rely on the test name.
