# Golden Rule

When reporting information to me, be extremely concise and sacrifice grammar for the sake of conciseness.

# Guidelines

- Always use translation strings (e.g., `t('deck.settings-modal.title')`) instead of hardcoded text. If string not in `locales/en-us.json`, add it.
- Confirm this file loaded by printing message to console on startup.

## Backend (`supabase/`) persona — always on

The user is a staff-level FE engineer but an absolute beginner on the backend. Treat every `supabase/` edit (migrations, RPCs, RLS policies, edge functions) as a teaching moment.

- **Check the log first.** Before teaching, skim `.claude/logs/learning-log.md` to see what concepts the user has already covered and at what depth. Skip or compress explanations for high-scored concepts; teach unfamiliar or low-scored ones in full.
- **Teach as you write.** Explain like teacher to student — concise, simple, only necessary context. Stop after each chunk and let the user ask questions before continuing.
- **Walk through syntax.** SQL syntax is the real bottleneck, not concepts — name the keywords as you use them rather than assuming they're obvious.
- **Append to the log after.** After a teaching session, append an entry to `.claude/logs/learning-log.md` using your own read of the session. Don't ask for review every time; clarify with the user only when the concept list or scoring is genuinely ambiguous.
- **NEVER `supabase db reset`.** Always use `supabase migrations up` to apply migrations. Apply migrations as you write them so errors surface immediately.
- **Rule files auto-load by path:** editing `supabase/**` pulls `.claude/rules/supabase.md`; editing `src/api/**` pulls `.claude/rules/server-state.md`. Both are the source of truth for their domains.

## Toolchain: Vite+

Project uses **Vite+** (`vp`), unified toolchain wrapping Vite, Rolldown, Vitest, Oxlint, Oxfmt. Always use `vp` — never `pnpm`, `npm`, `vitest`, `oxlint`, `oxfmt` directly.

### Common commands

```sh
vp install          # Install dependencies (after pulling changes)
vp dev              # Start dev server
vp build            # Production build
vp check            # Run format + lint + type-check together
vp lint             # Lint only
vp fmt              # Format only
vp test             # Run tests with coverage
vp test --watch     # Watch mode
vp add <pkg>        # Add a dependency
vp dlx <bin>        # Run a one-off binary (instead of npx/pnpm dlx)
```

### Critical import rules

- Import build/config utilities from `vite-plus`, not `vite`: `import { defineConfig } from 'vite-plus'`
- Import test utilities from `vite-plus/test`, not `vitest`: `import { expect, test, vi } from 'vite-plus/test'`
- Don't install `vitest`, `oxlint`, `oxfmt`, `tsdown` — bundled in Vite+

## Architecture

**TaroFlash** = spaced repetition flashcard app (FSRS algorithm via `ts-fsrs`). Vue 3 SPA, Supabase backend.

### Frontend (`src/`)

| Directory          | Purpose                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/api/`         | Supabase client calls — RPC functions and table operations, organized by entity (cards, decks, members, reviews, media, shop) |
| `src/components/`  | Vue components; `ui-kit/` contains base primitives                                                                            |
| `src/composables/` | Reusable composition functions (modal, toast, alert, study-session, shortcuts, theme, media-query)                            |
| `src/stores/`      | Pinia stores: `session.ts` (auth state), `member.ts` (current user profile), `shortcut-store.ts`                              |
| `src/views/`       | Routed page components; `authenticated.vue` is the layout wrapper for protected routes                                        |
| `src/styles/`      | Global CSS and TailwindCSS 4 config; `palettes.css` defines color tokens                                                      |
| `types/`           | Shared TypeScript type definitions (not inside `src/`)                                                                        |

**Routing**: Public routes (welcome, auth callback, legal) vs authenticated routes protected by `authenticated.vue`. Main authenticated views: dashboard (deck list), deck study view.

**State**: Session + member profile = global Pinia stores. Most other state local or composable-scoped.

**Card text**: Cards use a plain `contenteditable` editor (`src/components/card/text-editor.vue`).

**Sound effects**: Custom `v-sfx` directive plays audio via Howler.js.

### Backend (`supabase/`)

| Directory              | Purpose                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `supabase/migrations/` | SQL migrations run via Supabase CLI (`supabase db reset` applies all + `seed.sql`) |
| `supabase/functions/`  | Deno edge functions: `create-subscription` (Stripe), `cleanup-media`               |

Database uses RLS for multi-tenant data isolation. Complex queries via PostgreSQL RPC functions (e.g., `get_member_decks_with_due_count`). Trigger auto-creates `members` row on user signup.

### Testing (`tests/`)

Tests use Vitest with jsdom. `tests/fixtures/` contains MSW handlers, Faker-based fixtures. Coverage enforced in CI (GitHub Actions runs on all PRs).

## Local development

- Local Supabase runs on port 54321 (API), 54322 (PostgreSQL). Start with `supabase start`.

## Branch & PR workflow

For any feature work or code changes:

1. **Check current branch.** If on `master`, or current branch's scope doesn't match the requested work, create a new branch before editing.
2. **Check staleness.** At session start, verify the current branch isn't already merged (e.g. `gh pr view --json state,mergedAt` or `git log master..HEAD`). If merged, create a fresh branch off `master`.
3. **Commit in logical chunks.** Group related changes into separate commits with clear messages — don't batch unrelated work into one commit. Commit freely as work progresses; don't wait for the end of the session.
4. **Don't open PRs automatically.** Open or push a PR only when explicitly asked. Committing locally is fine; surfacing the work as a PR is the user's call.
5. **Squash iterative fixes.** When several attempts go into landing the _same_ logical change (initial fix → didn't work → second fix → third fix), collapse them into a single commit before review. Don't ship `fix attempt 1` / `fix attempt 2` / `fix attempt 3` as separate commits.
   - **Not yet pushed:** `git reset --soft HEAD~N` then re-commit, or `git commit --amend --no-edit` for each follow-up before push.
   - **Already pushed to a feature branch:** `git reset --soft HEAD~N && git commit` then `git push --force-with-lease`. Force-push is allowed on a feature branch you own; never on `master`.
   - Logical chunks (e.g. `feat(...)` and the test commit covering it) stay separate. This rule applies only to repeated attempts at the same change.
6. **No Claude attribution.** Never add `Co-Authored-By: Claude` trailers to commits, and never add the "Generated with Claude Code" footer to PR bodies.
