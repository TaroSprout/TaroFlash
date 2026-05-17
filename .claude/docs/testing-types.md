# Test type selection

| Type                      | Env                   | Use for                                                                                                                                                                                                       |
| ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**                  | jsdom (Node)          | Pure functions, utilities, non-rendering composables, store logic                                                                                                                                             |
| **Integration**           | Chromium (browser)    | Vue components — anything that renders HTML or uses real browser APIs                                                                                                                                         |
| **Contract**              | Node + local Supabase | `src/api/<domain>/db/*` — anything that talks to PostgREST / GoTrue / Storage. Catches schema-cache drift, broken FK embeds, RLS regressions. Files live under `tests/contract/api/`. Needs `supabase start`. |
| **Deno (edge functions)** | Deno                  | `supabase/functions/<name>/` — colocated `index.test.ts`. Inject a fake supabase via `_shared/test-utils.ts`; never hit real network. Run via `deno test` from `supabase/functions/`.                         |

- Files mirror source: `src/components/foo/bar.vue` → `tests/integration/components/foo/bar.test.js`; `src/api/decks/db/*` → `tests/contract/api/decks.test.js`
- Default to jsdom unless rendering or real-browser APIs (matchMedia, layout, focus, clipboard, transitions) are needed
- Prefer `shallowMount` over `mount` unless a child's behaviour is under test
- Coverage target 100 %, minimum 85 %

Run: `vp test`, `vp test --project Unit|Integration|Contract`, `vp test <file>`, or `deno test` (from `supabase/functions/`) for edge functions.

Integration tests run **headless** by default (Chromium via Playwright — no window opens). Configured via `headless: true` in `vite.config.ts`. Don't pass `--browser.headless=false` or open `vp test --ui` unless the user explicitly asks to debug visually — a window popping to the foreground breaks their flow.
