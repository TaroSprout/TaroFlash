# Pure helpers live in directory-scoped utils, not `src/api/`

`src/api/` is for functions that hit the network. Pure helpers — payload builders, diff checks, formatters, validators — belong in `src/utils/<domain>/`, alongside the domain they describe. This keeps the api layer a thin persistence surface and keeps helpers co-located with their domain instead of sprinkled across flat `src/utils/*.ts` files.

```ts
// Bad — pure helpers in the api layer
// src/api/cards/db/update.ts
export function buildCardPayload(card) { ... }
export function hasCardChanges(card, values) { ... }
export async function saveCard(card, values) { ... }

// Good — pure helpers extracted to a domain-scoped util
// src/utils/card/payload.ts
export function buildCardPayload(card) { ... }
export function hasCardChanges(card, values) { ... }

// src/api/cards/db/update.ts — the api function keeps orchestration + the network call
import { buildCardPayload, hasCardChanges } from '@/utils/card/payload'
export async function saveCard(card, values) { ... }
```

Rules of thumb:

- **No I/O + no reactive state** → `src/utils/<domain>/` (e.g. `src/utils/card/`, `src/utils/animations/`).
- **Network I/O (Supabase, fetch, storage)** → `src/api/<domain>/`, even if the function also does local orchestration around the call.
- **Reactive state (refs, lifecycle, provide/inject)** → `src/composables/`.

Prefer a directory under `src/utils/` over a flat `src/utils/foo.ts` when more than one file is likely, so helpers stay co-located with their domain.

**Defaults are helpers.** Per-domain default values (form defaults, runtime fallback values, UI bounds for forms) live in `src/utils/<domain>/defaults.ts`, not scattered across the components and composables that consume them. Both the editor (when staging a fresh record) and the runtime layer (when filling missing fields on a loaded record) read from the same module so behaviour stays consistent end-to-end.

```ts
// src/utils/deck/defaults.ts
export const DECK_CONFIG_DEFAULTS: Required<DeckConfig> = { ... }
export const DAILY_LIMIT_BOUNDS = { step: 5, min: 5, ... } as const
export function withDeckConfigDefaults(partial?: Partial<DeckConfig>): Required<DeckConfig> { ... }
```

## Inline before extracting

A helper that's small and has exactly **one** call site stays a local function inside its consumer. Extraction pays off when the helper is reused, complex enough to hide, or needs its own tests — a three-line join-filter used once earns a file and a test file it doesn't need.

Extract to `src/utils/<domain>/` once it gains a second call site, grows non-trivial, or the domain genuinely benefits from a named seam. Don't pre-emptively extract.

## Extend, don't add a sibling

When a new capability is a *variant* of an existing function, absorb it via overloads or variadic args rather than adding `fooRandom` / `fooBatch` / `fooWithX` beside it. `emitRandomSfx` was rejected as a sibling of `emitSfx` because the random-pick logic would have been duplicated — variadic `emitSfx(...keys, opts?)` keeps the policy, error handling and category logic in one place.

If the new function would copy most of the original, merge them.
