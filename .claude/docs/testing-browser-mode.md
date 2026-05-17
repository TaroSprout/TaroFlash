# Browser mode constraints

Vite ships runtime-only Vue. Stubs need render functions:

```js
// Bad — template string silently renders nothing in Chromium
const Stub = { template: '<div data-testid="stub"><slot /></div>' }

// Good
const Stub = defineComponent({
  setup(_p, { slots }) {
    return () => h('div', { 'data-testid': 'stub' }, slots.default?.())
  }
})
```

Forward `$attrs` with `useAttrs()` + `inheritAttrs: false`. Stubs hide slot content unless you explicitly render `slots.default?.()`.

GSAP mocks must call `onComplete` — `<transition-group :css="false">` threads `done` through it; if it never fires, transitions hang and content stays hidden:

```js
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))
```

`global` is undefined in browser context — don't reach for `global.__matchMedia` in `setup-browser.js`.

Teleport works natively in browser mode. In jsdom unit tests, either stub with `{ Teleport: true }` to keep content in the wrapper tree, or pass `attachTo: document.body` and query via `document.querySelector`.
