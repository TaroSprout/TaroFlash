# Async updates

- `await trigger()` / `await setValue()` — return `nextTick` internally
- `await nextTick()` after programmatic state mutations (`wrapper.vm.x = 1`)
- `await flushPromises()` after API calls or timer ticks; chain twice for chained async
- Don't stack `nextTick` to wait on promises — use `flushPromises`
