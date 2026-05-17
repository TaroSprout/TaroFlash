# Blackbox approach

- Drive components via user interactions; assert on rendered output and emitted events
- Don't read `wrapper.vm.*` or call internal methods
- **Query only by `data-testid`** — applies to every test type (Unit, Integration, **Contract**, **E2E**). Never query by tag (`input[name="email"]`), class, role + visible text (`getByRole('button', { name: /log in/i })`), or generated stub names (`ui-icon-stub`). Visible text breaks under i18n, role queries are noisy, tag/name attributes are implementation details. If a structural element you need to drive or assert against doesn't have a `data-testid`, **add one to the source** (`component-name__section` naming) before writing the test.
- Don't assert Tailwind utility classes; semantic/BEM names OK when they are the most direct state signal
- Find child components with `findAllComponents(ImportedRef)` (or `{ name }` if `defineOptions({ name })` is set)
- Don't assert audio names — assert audio was played
