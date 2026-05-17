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

- **No I/O + no reactive state** → `src/utils/<domain>/` (e.g. `src/utils/card/`, `src/utils/animations/`, `src/utils/text-composer/`).
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
