# TaroFlash

A spaced repetition flashcard app built with Vue 3 and Supabase. Uses the FSRS algorithm (`ts-fsrs`) to schedule reviews, Stripe for subscriptions, and Netlify for hosting.

---

## Stack

- **Frontend** — Vue 3, Pinia, TailwindCSS 4, Vite+
- **Backend** — Supabase (Postgres + RLS + Edge Functions)
- **Payments** — Stripe
- **Hosting** — Netlify

---

## Development

```sh
vp install       # install dependencies
vp dev           # start dev server
vp build         # production build
vp test          # run tests with coverage
vp check         # format + lint + type-check
```

Local Supabase runs on port 54321 (API) and 54322 (Postgres). Start it with `supabase start` and apply migrations with `supabase migration up`.

`supabase db reset` seeds a demo member — log in with `cheesy@example.com` / `password` (2 decks, 500 + 200 dummy cards).

---

## Deploy

### Staging

Add the `deploy:staging` label to an open PR. Every subsequent push to that PR auto-redeploys. Remove the label to stop.

Staging is served at `stage.taro-flash.com`.

### Production

Run the `deploy.yml` workflow manually with `environment: production`:

```sh
gh workflow run deploy.yml -f environment=production
```

Or use the GitHub UI: **Actions > Deploy > Run workflow**. A successful deploy tags and publishes a GitHub Release automatically via `semantic-release`.

---

## Project structure

<details>
<summary><strong>src/</strong> — Frontend application</summary>

| Path                          | Purpose                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `src/api/`                    | Supabase client calls — RPC functions and table operations, organized by entity |
| `src/components/`             | Vue components                                                                  |
| `src/components/ui-kit/`      | Base UI primitives                                                              |
| `src/components/modals/`      | Modal content components                                                        |
| `src/components/text-editor/` | Lexical-based rich text editor with markdown support                            |
| `src/composables/`            | Reusable composition functions (modal, toast, shortcuts, theme, etc.)           |
| `src/components/taro-phone/`  | TaroPhone system — apps, components, and core logic                             |
| `src/stores/`                 | Pinia stores: `session.ts` (auth), `member.ts` (profile), `shortcut-store.ts`   |
| `src/views/`                  | Routed page components; `authenticated.vue` is the layout wrapper               |
| `src/styles/`                 | Global CSS and TailwindCSS 4 config; `palettes.css` defines color tokens        |
| `src/utils/`                  | Utilities — animations, text composition helpers                                |
| `src/locales/`                | i18n translation strings                                                        |

</details>

<details>
<summary><strong>supabase/</strong> — Backend</summary>

| Path                   | Purpose                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `supabase/migrations/` | SQL migrations applied via `supabase migrations up`                                |
| `supabase/functions/`  | Stripe billing, media cleanup, and lesson transcription/translation edge functions |

</details>

<details>
<summary><strong>tests/</strong> — Test suite</summary>

| Path                 | Purpose                                                |
| -------------------- | ------------------------------------------------------ |
| `tests/unit/`        | Unit tests — pure functions, composables, store logic  |
| `tests/integration/` | Component integration tests via `shallowMount`/`mount` |
| `tests/fixtures/`    | MSW handlers and Faker-based test fixtures             |

</details>
