---
lastUpdated: 2026-05-17T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Architecture Conventions

**Scope: `src/` — where things live and which doc governs them.**

**TaroFlash** = spaced-repetition flashcard app (FSRS via `ts-fsrs`). Vue 3 SPA, Supabase backend.

## Layout

| Directory          | Purpose                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/api/`         | Supabase calls — RPC + table ops per entity: `billing`, `cards`, `decks`, `feedback`, `lessons`, `media`, `members`, `review-pacing`, `reviews` |
| `src/components/`  | Vue components; `ui-kit/` and `layout-kit/` hold the base primitives                                                                            |
| `src/composables/` | Reusable composition functions (modal, alert, prompt, shortcuts, settings, storage, fsrs, can, per-domain folders)                              |
| `src/stores/`      | Pinia stores: `session`, `member`, `theme`, `notice-store`, `shortcut-store`, `taro-phone`                                                      |
| `src/views/`       | Routed pages; `authenticated.vue` wraps the protected routes                                                                                    |
| `src/styles/`      | Global CSS + TailwindCSS 4 config; `palettes.gen.css` (generated) defines the color tokens                                                      |
| `src/sfx/`         | Custom audio engine behind the `v-sfx` directive                                                                                                |
| `types/`           | Shared TypeScript types — outside `src/`                                                                                                        |

- **Routing** — public routes (welcome, auth callback, legal) vs authenticated routes behind
  `authenticated.vue`. Main authenticated views: dashboard (deck list), deck study view.
- **State** — session + member profile are global Pinia stores; most other state is local or
  composable-scoped.
- **Card text** — a plain `contenteditable` editor (`src/components/card/text-editor.vue`).

## Spokes

Read the relevant one before editing:

- **Composing components** → [`composition`](./architecture/composition.md)
- **Anything that calls Supabase, or any new `src/api/<domain>/` work** → [`api-layer`](./architecture/api-layer.md)
- **Adding helpers, defaults, formatters, validators** → [`utils`](./architecture/utils.md)
- **Shared editor state across nested components / modals** → [`provide-inject`](./architecture/provide-inject.md)
- **Touching `src/components/ui-kit/` or `src/components/layout-kit/`** → [`ui-kit`](./architecture/ui-kit.md)
- **Wiring a third-party analytics/tracking SDK** → [`vendor-chokepoint`](./architecture/vendor-chokepoint.md)
