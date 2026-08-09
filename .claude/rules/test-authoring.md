---
lastUpdated: 2026-08-08T00:00:00Z
paths:
  - 'tests/**/*'
  - 'vite.config.ts'
  - 'supabase/functions/**/*.test.ts'
---

# Test authoring

**Owns everything about writing a test** — which type to pick, how to query, how to await, how to
fake, and what to reject. Only read when the user has asked for test work. The five shared
principles live in [`authoring`](./authoring.md).

Vitest on jsdom; `tests/fixtures/` holds the MSW handlers and Faker builders; CI enforces coverage
on every PR.

## A failing test accuses the source first

Assume the code regressed before assuming the test is wrong. Read the assertion and the code under
test, run the test in isolation, and confirm the failure is meaningful.

- If the test may be catching a real bug, **stop** — name the test, the assertion, and the suspected
  bug, and wait for confirmation. Only edit the test once the source is verified correct.
- This holds for **brand-new tests**. When a test you just wrote refuses to pass after one or two
  reasonable scaffolding adjustments, re-read the source. Never delete the test, relax the
  assertion, or swap in a weaker indirect check. Surface the assertion, the source lines producing
  the wrong value, and your hypothesis.
- Common culprits: a missing optional `?: boolean` prop defaulting to `false` rather than
  `undefined`, so `prop ?? fallback` collapses; destructured props without a default; a computed
  reading a non-reactive source; a `vi.mock` whose path resolution misses the real import;
  `shallowMount` auto-stubbing over an override whose key doesn't match the component name.

## Type selection

| Type            | Env                   | Use for                                                                                                                 |
| --------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | jsdom (Node)          | Pure functions, utilities, non-rendering composables, store logic                                                       |
| **Integration** | Chromium (browser)    | Vue components — anything that renders HTML or uses real browser APIs                                                   |
| **Contract**    | Node + local Supabase | `src/api/<domain>/db/*` — catches schema-cache drift, broken FK embeds, RLS regressions. Lives in `tests/contract/api/` |
| **Deno**        | Deno                  | `supabase/functions/<name>/` — colocated `index.test.ts`, fake supabase via `_shared/test-utils.ts`, never real network |

- Files mirror source: `src/components/foo/bar.vue` → `tests/integration/components/foo/bar.test.js`.
- Default to jsdom unless rendering or a real browser API (matchMedia, layout, focus, clipboard,
  transitions) is needed.
- Prefer `shallowMount` over `mount` unless a child's behaviour is under test.
- Coverage target 100 %, minimum 85 %.
- Run: `vp test`, `vp test --project Unit|Integration|Contract`, `vp test <file>`, or `deno test`
  from `supabase/functions/`. Contract tests need `supabase start`.

## Blackbox

Drive components through user interactions; assert on rendered output and emitted events.

- Never read `wrapper.vm.*` or call an internal method.
- **Query only by `data-testid`** — every type, Unit through E2E. Never by tag, class, role + visible
  text, or a generated stub name: visible text breaks under i18n, roles are noisy, and tag and name
  attributes are implementation details. If the element you need has no `data-testid`, add one to
  the source (`component-name__section`) before writing the test.
- Don't assert Tailwind utility classes; a semantic or BEM name is fine when it is the most direct
  state signal.
- Find children with `findAllComponents(ImportedRef)`, or `{ name }` when `defineOptions({ name })`
  is set.
- Assert that audio played, never which audio file.

## Awaiting

- `await trigger()` / `await setValue()` — they return `nextTick` internally.
- `await nextTick()` after a programmatic mutation (`wrapper.vm.x = 1`).
- `await flushPromises()` after an API call or a timer tick; chain it twice for chained async.
- Never stack `nextTick` to wait on a promise — use `flushPromises`.

## Fixtures, singletons, mocks

- `mimicry-js` + `faker-js` builders in `fixtures.js`. Single-file scope colocates
  (`tests/unit/stores/theme/fixtures.js`); shared goes to `tests/fixtures/<subject>.js`.
- A module-scope `ref`/`reactive` persists across tests. Reset it in `beforeEach` through the
  composable's own setter (`beforeEach(() => useToast().clear())`), falling back to
  `vi.resetModules()` only when there is no setter.
- Prefer `vi.mock('@/composables/...')` over mocking a browser API directly — module mocks isolate
  cleanly. Reset return values in `beforeEach` and override per test.

## Pinia

- **Component tests** use `createTestingPinia({ createSpy: vi.fn, initialState })` in
  `global.plugins`. `createSpy: vi.fn` is required — we don't run with Vitest `globals: true`.
- Actions are stubbed by default: assert with `expect(store.action).toHaveBeenCalled()`, override
  with `mockResolvedValue`, and pass `stubActions: false` when the real effect is under test.
- Get the store **after** mounting — `useStore()` before mount returns the wrong instance.
- **Store unit tests** use `beforeEach(() => setActivePinia(createPinia()))` for a fresh Pinia, then
  `vi.spyOn(store, 'action')` to assert calls without stubbing the implementation.

## Composables

- Pure composables (refs and computeds only) are called directly.
- Anything using `onMounted`, `onUnmounted`, or `inject` needs a component context: mount a host app
  via `createApp({ setup() { result = composable(); return () => {} } })`, `app.provide(...)` the
  mocks, and `afterEach(() => app?.unmount())` so `onUnmounted` fires. Wire `createTestingPinia`
  into that host app with `app.use(...)` before mounting when a store is involved.

## Browser mode

Vite ships runtime-only Vue, so a stub defined with a `template` string silently renders nothing in
Chromium. Stubs need render functions:

```js
const Stub = defineComponent({
  setup(_p, { slots }) {
    return () => h('div', { 'data-testid': 'stub' }, slots.default?.())
  }
})
```

- Forward `$attrs` with `useAttrs()` + `inheritAttrs: false`. A stub hides slot content unless it
  renders `slots.default?.()` explicitly.
- GSAP mocks must invoke `onComplete` — `<transition-group :css="false">` threads `done` through it,
  and a mock that never fires it hangs the transition with the content hidden.
- `global` is undefined in browser context; don't reach for `global.__matchMedia` in
  `setup-browser.js`.
- Teleport works natively here. In jsdom, either stub `{ Teleport: true }` to keep content in the
  wrapper tree, or `attachTo: document.body` and query via `document.querySelector`.
- **Always headless** — `headless: true` on the Integration project in `vite.config.ts`. Never pass
  `--browser.headless=false` and never run `vp test --ui`: a window stealing focus breaks the user's
  flow. Ask first if a flaky test genuinely needs a visual debug.

## E2E

- Multi-step flows shared across specs (login, sign-up, deck creation, study session) live as
  helpers in `tests/e2e/_helpers.ts`. Each helper drives the flow and asserts its post-condition
  before returning. Specs call helpers and never re-implement the steps inline.
- A ui-kit primitive that wraps its root in a tooltip (`UiInput`) doesn't forward `data-testid` to
  the inner `<input>` — wrap the call site in a `<div data-testid="...">` and reach it with
  `.locator('input')`. `UiButton` forwards `$attrs` to its root, so a call-site `data-testid` lands.

## Reject

- Waiting on a timer or animation without a concrete trigger.
- A missing `await` before an async-rendered query.
- Mutable state shared across tests with no `beforeEach`/`afterEach` reset.
- Hard-coded locale or date values that drift across environments or month boundaries.
- A silent early return (`if (!data) return`) that passes vacuously.
- A broad assertion (`toBeDefined()`) where the value is the point.
- A test that never exercises the changed lines.
