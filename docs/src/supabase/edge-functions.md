---
lastUpdated: 2026-07-10T17:37:36Z
---

# Edge Functions

Edge functions run on Deno (Supabase Edge Runtime). Secrets are read from environment variables at runtime.

---

## Secrets

### Local

Set secrets in `supabase/functions/.env` (gitignored — copy from a teammate or 1Password).

### Staging / Production

Push secrets via the CLI:

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  ANTHROPIC_API_KEY=sk-ant-... \
  OPENAI_API_KEY=sk-... \
  SUPABASE_URL=https://<ref>.supabase.co \
  SUPABASE_ANON_KEY=eyJ... \
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  --project-ref <project-ref>
```

| Secret                      | Used by                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`         | `create-subscription`, `manage-subscription`, `stripe-webhook`                                                       |
| `STRIPE_WEBHOOK_SECRET`     | `stripe-webhook` (verifies the signature on Stripe's POST)                                                           |
| `ANTHROPIC_API_KEY`         | `translate-term`, `translate-transcript`, `transliterate-transcript`, `transcribe-lesson` (chaptering)               |
| `OPENAI_API_KEY`            | `transcribe-lesson` (Whisper transcription)                                                                          |
| `SUPABASE_URL`              | Every function that builds its own Supabase client                                                                   |
| `SUPABASE_ANON_KEY`         | `create-subscription`, `manage-subscription` (user-scoped client for `getUser()`)                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | `cleanup-media`, `stripe-webhook`, `transcribe-lesson` (admin client + internal-call auth check), `require-admin.ts` |

`SERVICE_ROLE_KEY` (no `SUPABASE_` prefix) from the old list isn't read by any function — the actual env var name is `SUPABASE_SERVICE_ROLE_KEY`.

View currently set secrets (names only, values are never shown):

```bash
supabase secrets list --project-ref <project-ref>
```

---

## Functions

### `cleanup-media`

Cron-invoked (see [Vault Secrets](./vault.md)). Sweeps `media` rows for two kinds of orphaned storage objects: soft-deleted rows whose object no longer has any active reference (content-addressed storage means one object can back many cards), and objects that were uploaded but never got a `media` row at all (a blocked/failed upload). Deletes storage objects first, then the rows, with retry/backoff around each storage call; returns 207 if any per-bucket delete failed after retries.

### `create-subscription`

HTTP, member-invoked (caller's JWT). Creates a Stripe Checkout Session in subscription mode with `ui_mode: 'elements'` for the caller's chosen plan, creating the Stripe customer first if one doesn't exist yet. Migrated from raw PaymentIntents to Checkout Sessions + Payment Element: the client mounts its own Payment Element against the session's `client_secret` (so the appearance stays ours), while Stripe owns creating the underlying Subscription + PaymentIntent. Completing the embedded Payment Element activates the subscription, which fires `stripe-webhook`.

### `stripe-webhook`

HTTP webhook, invoked by Stripe (no JWT — Stripe can't carry Supabase auth). The single source of truth for subscription state: verifies the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET` on the raw request body, then mirrors `customer.subscription.created`/`updated` and `.deleted` events onto the matching `members` row (`plan`, `stripe_subscription_id`) via the service-role client. The client never decides its own plan — it only ever reads what this function wrote. Unhandled event types ack with 200; a DB write failure returns 500 so Stripe retries with backoff.

### `translate-term`

HTTP, admin-gated (`requireAdmin`). Given a learner's selected span of text plus its surrounding sentence, asks Claude (Haiku, structured JSON output) for a flashcard-ready translation, phonetic reading, part of speech, a short contextual description, and a 1–10 difficulty rating. Powers the "tap a word to make a card" flow in the transcript reader.

### `translate-transcript`

HTTP, admin-gated. Given a lesson's segment texts, returns one Claude-translated sentence per segment, aligned by index, for the interlinear reader. Also called internally by `transcribe-lesson`'s translating phase via the shared `translateSentences` helper (not over HTTP in that path).

### `transliterate-transcript`

HTTP, admin-gated. Given a lesson's segments grouped with their words (sentence context disambiguates ambiguous readings), returns one phonetic reading per word, flat and aligned to send order. Resilient by design — a failed batch comes back as blank readings rather than erroring the whole request. Also used internally by `transcribe-lesson`'s transliterating phase via the shared `readSentences` helper.

### `transcribe-lesson`

The largest function here — async, multi-phase transcription of an uploaded lesson audio file, driven by the database rather than a single long-lived isolate.

**HTTP actions** (admin-gated, except `process`):

- `start` — creates the `lessons` row (`create_pending_lesson` RPC, under the caller's JWT so RLS/`member_id` apply) with `status='processing'`, `phase='transcribing'`, and an optional client-built chunk manifest (long audio is split client-side via ffmpeg.wasm into ordered, overlapping chunks before upload). The INSERT itself fires the DB chain trigger, so the function just returns the row (202) — no background work happens in this call.
- `retry` — resets an existing lesson back to `phase='transcribing'`, clearing the transcript and chunk cursor (transcription stitches by appending, so resuming on a partial transcript would duplicate content). The UPDATE re-fires the chain trigger.
- `process` — internal-only, authenticated by checking the caller sent `SUPABASE_SERVICE_ROLE_KEY` as a bearer token (not a member JWT). Invoked exclusively by the DB chain trigger via `pg_net` (see [Vault Secrets](./vault.md)). Runs exactly one phase for the given lesson and returns.

**Why one-phase-per-invocation:** the pipeline used to run transcribe → translate → transliterate inside one edge isolate kept alive by `EdgeRuntime.waitUntil`. Run-times added up until the platform force-killed the isolate at its wall-clock limit, and the code that would have settled the row never ran — stranding it in `processing` forever. Now each DB write of `phase` (or `chunk_cursor`) is itself the signal that fires the next invocation (`supabase/migrations/20260606000003_lesson-processing-chain.sql`), so no single isolate ever carries the whole pipeline, and a row is only ever `processing` for the length of one short, self-contained call.

**Phase chain:** `transcribing` (looped once per audio chunk, stitching each chunk's Whisper output onto the running transcript by time offset — see `OPENAI_API_KEY`) → `chaptering` (best-effort Claude-based chapter detection over the stitched transcript) → `translating` (Claude, sliced `TRANSLATE_SEG_BATCH` segments at a time with neighbouring segments passed as read-only context) → `transliterating` (Claude, sliced `TRANSLITERATE_SEG_BATCH` segments at a time, words grouped by sentence for reading disambiguation) → settles to `status='ready'`. Every phase write stamps `updated_at`, which doubles as the heartbeat the stall reaper reads.

**Stall recovery:** if an isolate is hard-killed mid-phase (wall-clock kill, OOM, deploy, dropped `pg_net` delivery), nothing advances the row and nothing settles it. A cron-scheduled reaper (`supabase/migrations/20260606000004_lesson-stall-reaper.sql`) forces any row stuck in `processing` past a 10-minute deadline into `status='failed'`, `error_code='stalled'`, which the FE shows with a Retry button. See [Vault Secrets](./vault.md) for how the chain trigger fires back into this function.

---

## Testing

Tests run under Deno (not Vitest). Each function exports a pure `handler({ supabase, ... })` so tests can inject a fake supabase client. The `serve()` wrapper at the bottom of `index.ts` is gated on `import.meta.main` and only runs in production.

### Setup

Install Deno:

```bash
brew install deno
```

Install function dependencies (resolves the import map in `supabase/functions/deno.json`):

```bash
cd supabase/functions
deno install
```

This generates `deno.lock`. Commit it.

### Running tests

From `supabase/functions/`:

```bash
deno test --allow-net --allow-env --allow-read
```

Watch mode:

```bash
deno test --watch --allow-net --allow-env --allow-read
```

Run one file:

```bash
deno test --allow-net --allow-env --allow-read cleanup-media/index.test.ts
```

### Conventions

- **One `index.test.ts` per function**, colocated with `index.ts`.
- **Shared fixtures** live in `supabase/functions/_shared/test-utils.ts` (e.g. `makeFakeSupabase`, `noSleep`).
- **Pure handler pattern**: `export async function handler(deps): Promise<Response>`. Inject `supabase`, clocks, sleep, retry counts. Keep `Deno.serve(...)` wrapped in `if (import.meta.main)` so importing the module in tests doesn't start a server.
- **Bare specifiers only**: declare deps in `supabase/functions/deno.json` `imports`, not inline `https://` / `npm:` / `jsr:` URLs (lint rule `no-import-prefix`).

### CI

`.github/workflows/ci.yml` runs `test-functions` on PRs that touch `supabase/functions/**` (gated via `dorny/paths-filter`). Frontend / DB tests run on their own paths.

### Editor setup

Install the `denoland.vscode-deno` extension. `.vscode/settings.json` scopes the Deno LSP to `supabase/functions/` via `deno.enablePaths`. The TypeScript LSP handles everything else. Reload the window after install — the status bar should show `Deno` when an edge function file is open.
