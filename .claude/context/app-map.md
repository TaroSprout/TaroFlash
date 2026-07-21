# App Map — TaroFlash

> Seed context for the `/groom` agent. Read this **before** forming a hunch about where a
> raw task lives, so the first grep lands in the right place. Not exhaustive — a starting map.
> Stack: Vue 3 `<script setup>` + TypeScript, Supabase, Pinia + Pinia Colada. **Feature-colocated**:
> each view owns its components/composables in nested folders; `use-*.ts` sits next to its owner.

Root: `/Users/chris/Dev/Web/TaroFlash`

---

## Hunch guide — task keyword → where to look

Use this first. Match words in the raw ticket to a starting path, then grep from there.

| Ticket mentions…                                                            | Start in                                                                                                                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| card editing, text editor, card face, image on card                         | `src/components/card/`, `src/views/deck/card-editor/` (desktop), `src/views/deck/mobile-editor/` (mobile)                  |
| mobile editor, "mobile editor still shows", editor on phone                 | `src/views/deck/mobile-editor/`                                                                                            |
| card grid, reorder cards, select/bulk, search cards                         | `src/views/deck/card-grid/`, `src/views/deck/composables/`                                                                 |
| study session, rating buttons, fail/nope, session summary, resume           | `src/views/study-session/` (engine in `composables/`)                                                                      |
| FSRS, review pacing, scheduling, presets, limits                            | `src/views/deck/deck-settings/tab-review-pacing/`, `src/composables/fsrs.ts`, `src/api/review-pacing/`                     |
| deck settings, deck design, cover, danger zone                              | `src/views/deck/deck-settings/` (tabs: `tab-details/ tab-design/ tab-review-pacing/ tab-review-history/ tab-danger-zone/`) |
| deck cover, icon/pattern picker, bgx                                        | `src/views/deck/cover-designer/`, `src/utils/cover/`, `src/styles/bg-utils.css`                                            |
| avatar, member cover                                                        | `src/components/member/` (`avatar-picker-modal.vue`, `avatars.ts`, `cover.ts`)                                             |
| profile/member settings, account, email/password, subscription, billing     | `src/views/settings/` (tabs), `src/components/billing/`, `src/composables/billing/`, `src/api/billing/`                    |
| phone, mobile nav, dock, phone apps (darkmode/logout/feedback)              | `src/components/taro-phone/`, `src/stores/taro-phone.ts`, `src/components/mobile-dock/`                                    |
| dashboard, deck grid (home), review inbox, tips, empty state                | `src/views/dashboard/`                                                                                                     |
| login, signup, forgot/reset password, google auth, splash, roadmap, pricing | `src/views/welcome/`, `src/composables/auth/`, `src/views/auth/callback.vue`                                               |
| feedback board / submit                                                     | `src/components/feedback/`, `src/composables/feedback/`, `src/api/feedback/`                                               |
| audio reader, lessons, transcript, transliterate                            | `src/views/audio-reader/`, `src/composables/audio-reader/`, `src/api/lessons/`, `supabase/functions/transcribe-lesson`     |
| legal, privacy, terms                                                       | `src/views/privacy-policy.vue`, `src/views/terms-of-service.vue`                                                           |
| a ui-kit primitive (spinbox, slider, modal, toast, button, input…)          | `src/components/ui-kit/<name>/`; window chrome in `src/components/layout-kit/`                                             |
| sound / sfx / v-sfx                                                         | `src/sfx/`                                                                                                                 |
| theme, dark mode, palette, colors                                           | `src/stores/theme.ts`, `src/styles/palettes.gen.css`, `src/utils/palette/`, rule `theming.md`                              |
| RLS, migration, policy, edge function, cleanup-media, stripe webhook        | `supabase/migrations/`, `supabase/functions/`, rule `supabase.md`                                                          |
| server-state, cache, query/mutation, invalidation                           | `src/api/<domain>/`, rule `server-state.md`                                                                                |
| animation, transition, gsap                                                 | `src/utils/animations/`, rule `animations.md`                                                                              |
| skeleton / loading state                                                    | `*/skeleton.vue`, `src/styles/shimmer.css`, rule `skeleton-loading.md`                                                     |

---

## Routed views (`src/router/index.ts`)

| Route                                   | Component                                                | Feature                                           |
| --------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| `/welcome`                              | `views/welcome/index.vue`                                | Splash / marketing / auth landing (public)        |
| `/privacy`, `/terms`                    | `views/privacy-policy.vue`, `views/terms-of-service.vue` | Legal                                             |
| `/auth/callback`                        | `views/auth/callback.vue`                                | OAuth / magic-link callback                       |
| `/`                                     | `views/app-shell/authenticated.vue`                      | Auth-gated shell (nav-bar, route-skeleton)        |
| `/dashboard`                            | `views/dashboard/index.vue`                              | Home: deck grid, review inbox, tips, audio-reader |
| `/deck/:id`                             | `views/deck/deck-view.vue`                               | Deck detail: editor/grid, hero, settings, modes   |
| `/audio-reader/collection/:c/lesson/:l` | `views/audio-reader/lesson/index.vue`                    | Audio reader lesson (gated)                       |

**Study session** (`views/study-session/index.vue`) is **not** a route — launches as an overlay from deck/dashboard.

---

## Feature areas (detail)

- **Card editor — desktop:** `views/deck/card-editor/` (`index/list/list-item/list-item-card/list-item-options`). Render primitives: `components/card/` (`card-face`, `face-editor`, `text-editor`, `face-image-layer`, `image-dropzone`, `card-cover`).
- **Card editor — mobile:** `views/deck/mobile-editor/` (`editor-stage`, `editor-header`, `editor-controls`, `use-mobile-card-editor.ts`).
- **Card grid & deck shell:** `views/deck/card-grid/`, `deck-hero/`, `mode-stack.vue`, `mode-toolbar/`, `modes.ts`, `search-bar.vue`, `card-importer.vue`; composables `views/deck/composables/` (actions, bulk-actions, card-search, list-controller, virtual-list, view-shell).
- **Study session:** engine in `views/study-session/composables/` (`session-engine`, `session-controller`, `session-cards`, `session-persistence`, `session-prefs`, `session-resume`, `card-actions`, `card-edit`); UI in `session-studying/` (rating-buttons simple/advanced, progress), `session-summary/`.
- **Deck settings:** `views/deck/deck-settings/` — `index.vue`, `pages.ts`, tabs `tab-details/ tab-design/ tab-review-pacing/ tab-review-history/ tab-danger-zone/`.
- **Member settings:** `views/settings/` — tabs `tab-profile/ tab-app/ tab-account-access/ tab-subscription/ tab-danger-zone/`; `account-access/` (email/password/google), `use-avatar-picker.ts`.
- **Phone (mobile nav):** `components/taro-phone/` (`taro-phone-base/-sm`, `app-launcher`, `app-shell`, `apps/`), store `stores/taro-phone.ts`, anim `utils/animations/phone.ts`; plus `components/mobile-dock/`.
- **Dashboard:** `views/dashboard/` — `deck-grid/` (`use-deck-grid`, `use-deck-grid-reorder`), `review-inbox/`, `tip-card/`, `actions-panel/`, `audio-reader-section.vue`, `mobile-footer/`, `composables/` (`new-deck-action`, `deck-options-menu`).
- **Cover / avatar designer:** deck `views/deck/cover-designer/` + `utils/cover/` (`bindings`, `patterns`, `tokens`, `random`); avatar `components/member/`.
- **Feedback board:** `components/feedback/`, `composables/feedback/use-feedback-modal.ts`, phone app `taro-phone/apps/feedback-app.vue`, api `src/api/feedback/`.
- **Login/signup:** `views/welcome/` (`login/ signup/ forgot-password/ reset-password/ splash/ section-features/ section-pricing/ section-roadmap/`), `composables/auth/`.
- **Billing/subscription:** `components/billing/checkout-modal/`, `composables/billing/`, `api/billing/`. (No standalone "Shop" feature yet — only roadmap copy.)
- **Audio reader:** `views/audio-reader/`, `composables/audio-reader/`, `api/lessons/`, transcription edge fns.

---

## ui-kit primitives (`src/components/ui-kit/`)

`alert`, `burst`, `button`, `button-group`, `divider`, `dropdown-button/`, `icon`, `image`, `input`, `modal/`, `notice/` (panel+toast), `option-group`, `options-panel/`, `pattern-picker`, `pinned-card`, `popover`, `progress-bar`, `prompt`, `radio`, `scroll-bar`, `select-menu`, `slider`, `spinbox/`, `tabs`, `tag`, `tag-button`, `tape`, `tappable`, `textarea`, `theme-picker`, `toggle`, `tooltip`, `wobble-box`.

**layout-kit** (`src/components/layout-kit/`): `app-window/`, `paged-window/`, `dialog-card/`, `crossfade-resize`, `labeled-section`, `section-list`.

> Convention: import as `Ui<Name>`, template `<ui-name>` (never bare `<name>`).

---

## Composables, stores, api

- **Global composables (`src/composables/`):** `alert`, `can`, `draft`, `fsrs`, `last-deck`, `modal`, `prompt`, `shortcuts`, `use-reorder-drag`; grouped `audio-reader/ auth/ billing/ card/ deck/ feedback/ member/ settings/ storage/ ui/` (ui has the big set: gestures, keyboard, media-query, depth, safe-area, scroll-lock, infinite-scroll, animated-height, press-hold, staged-tap, route-transition, numeric-input, …). Feature-specific `use-*.ts` are **colocated** in views, not here.
- **Stores (`src/stores/`):** `member` (profile/role), `session` (auth), `theme` (dark/palette), `notice-store` (toasts), `shortcut-store`, `taro-phone`.
- **`src/api/` topology:** per domain `db/` (raw Supabase builders) → `queries/` (Pinia Colada `useQuery`) → `mutations/` (`useMutation` + `_invalidate.ts`) → `index.ts` barrel. Domains: `billing cards decks feedback lessons media members review-pacing reviews`; plus flat `api/session.ts`.
- **Styles (`src/styles/`):** `main.css` (entry), `palettes.gen.css` (generated), Tailwind v4 `@utility` layers `bg-utils` (`bgx-*`), `border-utils`, `bevel-utils`, `outline-utils`, `depth`, `shimmer` (skeleton), `mobile-modal-variant`.

---

## Backend (`supabase/`)

- **Migrations:** `supabase/migrations/` (~114 files). Editing rules: `.claude/rules/supabase.md`. Never `db reset`; apply with `supabase migrations up`.
- **Edge functions (`supabase/functions/`):** `cleanup-media`, `coverage`, `create-subscription`, `manage-subscription`, `stripe-webhook`, `transcribe-lesson`, `translate-term`, `translate-transcript`, `transliterate-transcript`, `_shared/`.

---

## Epics (Notion Epic Board → code area)

`/groom` sets the ticket's **Epic** relation. Active (In Dev / Ready / P0) first; map to code:

| Epic                        | Status       | Code area                                              |
| --------------------------- | ------------ | ------------------------------------------------------ |
| Deck/Card Config            | In Dev · P0  | `views/deck/deck-settings/`, `utils/cover/`            |
| Study Session               | In Dev · P0  | `views/study-session/`                                 |
| Phone Navigation            | In Dev · P0  | `components/taro-phone/`, `mobile-dock/`               |
| Member Settings             | In Dev · P0  | `views/settings/`                                      |
| Login/Signup                | In Dev · P0  | `views/welcome/`, `composables/auth/`                  |
| Splash Page                 | In Dev · P0  | `views/welcome/splash/`, `section-*/`                  |
| Dashboard                   | In Dev · P0  | `views/dashboard/`                                     |
| Permissions                 | In Dev · P0  | `composables/can.ts`, RLS + capability SQL fns         |
| UI-Kit                      | In Dev · P0  | `components/ui-kit/`, `layout-kit/`                    |
| Card Images                 | In Dev · P0  | `components/card/` (image layers), `api/media/`        |
| Community Page              | Backlog · P0 | (not built)                                            |
| Analytics                   | Backlog · P0 | (not built)                                            |
| Marketing Email Integration | Backlog · P0 | (not built)                                            |
| Card Audio Upload           | Backlog · P0 | `api/media/`, sfx/audio                                |
| Legal                       | Planned · P0 | `views/privacy-policy.vue`, `terms-of-service.vue`     |
| Security & Compliance       | Planned · P1 | `supabase/` RLS, edge-fn authz                         |
| Misc Bugs                   | Ready · P1   | (cross-cutting — default bucket for stray bugs)        |
| Feedback Board              | Ready · P2   | `components/feedback/`, `api/feedback/`                |
| Export/Import               | Planned · P2 | (not built)                                            |
| Shortcuts                   | Planned · P2 | `composables/shortcuts.ts`, `stores/shortcut-store.ts` |
| Tips/Tutorials              | Planned · P2 | `views/dashboard/tip-card/`                            |
| Global Search               | Backlog · P1 | (not built)                                            |
| Audio Reader                | Planned · P3 | `views/audio-reader/`, `api/lessons/`                  |

Other backlog epics (P1–P3, mostly unbuilt): Power-Ups, Paperclips, Shop, Metrics & Stamps, Daily Challenges, Card decoration, Theming, Postcard sending, Tips/Deck Ratings, 3rd-party integration, Course Builder, Deck Printing, Favorites, Stickers, Attributions, Study Modes, Competitive Social Play, Realtime Collaborative Study, Verified Content, Offline Mode, Heatmap, Lightning Rounds, Trackable Goals, Card Notes, Avatar Designer, Bulk Find/Replace, Admin Dashboard, Accessibility, Misc Features.

> If no epic fits, `Misc Bugs` (bugs) or `Misc Features` (tasks/stories) are the catch-alls.

---

## Domain glossary

- **FSRS** — Free Spaced Repetition Scheduler; drives review-pacing. `composables/fsrs.ts`, `api/reviews/`.
- **Review pacing** — per-deck study limits + scheduling (presets, new/review limits). `api/review-pacing/`, `tab-review-pacing/`.
- **Fractional rank / reorder anchors** — ordering scheme for drag-reorder (fractional-rank strings; `anchor_id` + before/after; temp rows use negative ids). `utils/reorder.ts`, `cards/mutations/move.ts`. (LexoRank-style.)
- **bgx** — CSS custom-prop system for decorative pattern backgrounds (`--bgx-image/-fill/-opacity/-size`); Tailwind `bgx-*` in `styles/bg-utils.css`, bound in `utils/cover/bindings.ts`. Used for covers.
- **cover / patterns / tokens** — deck & avatar cover designer domain: `utils/cover/`.
- **sfx / v-sfx** — sound-effect system. Engine `src/sfx/` (`engine`, `player`, `bus`, `config` with `SOUNDS`/buses `interface`|`hover`). `v-sfx` directive attaches interface sounds; registered in `main.ts`. Button clicks use `:sfx` prop, not direct calls.
- **phone / taro-phone** — skeuomorphic mobile nav styled as a phone with mini-apps (darkmode, feedback, logout, settings).
- **app-window / paged-window / dialog-card** — layout-kit window chrome: `app-window` (windowed surface), `paged-window` (multi-page directory nav), `dialog-card` (paged modal w/ header/pager/viewport).
- **wave/cloud borders** — shaped-edge utilities `wave-bottom-[size]`, `wave-top-[size]`, `cloud-bottom-[size]` in `styles/border-utils.css` (never hand-roll SVG).
- **audio-reader / lessons** — transcription reading: collections → lessons → word/segment-synced transcript; term popover creates cards.

---

## Conventions (`.claude/rules/`, auto-loaded by path glob)

`architecture` (feature-colocation + api pattern) · `code-style` · `FE-formatting` · `vue-props` · `vue-script-order` · `vue-templates` · `composables` · `css` · `theming` · `animations` · `server-state` (Pinia Colada) · `skeleton-loading` · `study-session-architecture` · `supabase` · `i18n` · `safari-gotchas` · `testing` / `testing-composables` / `testing-pinia`.

> All user-facing strings use i18n (`t('...')`, `src/locales/en-us.json`). Rules carry frontmatter (`paths`) scoping them to globs.
