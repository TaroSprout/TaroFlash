# Phase B scoping note — async lesson transcription

> Design note for picking up Phase B in a fresh session. Phase A shipped on
> branch `feat/audio-reader-polish` (PR #238). This is a plan-first task — read,
> then propose; don't implement off this note alone.

## Where Phase A left us

Upload no longer blocks on transcription. The flow today:

1. FE uploads audio to the `audio-lessons` bucket, then calls the
   `transcribe-lesson` edge function (`action: 'start'`).
2. The function creates a `lessons` row in `status='processing'` via the
   `create_pending_lesson` RPC and returns `202` immediately, kicking a
   background worker with `EdgeRuntime.waitUntil`.
3. The worker downloads the audio from storage, calls Whisper (with an
   `AbortController` timeout + retry on 429/5xx), runs best-effort
   translate/transliterate, and settles the row to `ready` / `failed` with a
   machine-readable `error_code`.
4. The FE polls the collection while any lesson is `processing`; the lesson card
   shows processing (phase label) / failed (error + **Retry**) / ready.

It works — verified live: the worker runs, hits Whisper, and settles the row.

## The problem Phase B solves

A single **synchronous Whisper call can't cover long audio**. Confirmed live with
a 48-min file: the edge runtime hit its **wall-clock limit** (~20s locally,
150–400s hosted) and force-terminated the isolate (`wall clock duration warning`
/ `early termination`), which aborted the Whisper fetch → the row landed as
`failed`/`timeout`. That's the ceiling, not a bug. Also: Whisper caps files at
**25 MB**, and a 48-min file is right at that edge.

## Two hard constraints to design around

- **`per_worker` requirement.** Background work after returning `202`
  (`EdgeRuntime.waitUntil`) needs `[edge_runtime] policy = "per_worker"` in
  `config.toml`. `oneshot` kills the worker at the response (silent stuck row),
  and `oneshot` is what gives local function **hot-reload**. So today we run
  `per_worker` and have no hot-reload. (Policy is a local-dev-only concern;
  hosted runs the background-task mode regardless.)
- **Wall-clock ceiling.** Any one invocation is time-boxed. The fix is to keep
  each invocation's work _small_, not to make one call longer.

## Phase B direction — prefer model B

**Chunk + compress the audio so each transcription unit is small, and process
those units with a durable/incremental worker.**

- **Client-side prep (ffmpeg.wasm):** transcode to mono low-bitrate (a 48-min
  lesson drops from ~25 MB to ~11 MB, also clearing the 25 MB cap and speeding
  Whisper) and split into short chunks (~5–10 min). Lazy-load the wasm (~25 MB)
  so it doesn't bloat the main bundle.
- **Worker merges** chunk transcripts back into one, offsetting each chunk's
  segment/word timestamps by its start time so the reader stays aligned.

### Model A vs model B (decide this first)

- **Model A — chunk inside the current `waitUntil` worker.** Smaller change, but
  still returns `202` + works in the background → **still needs `per_worker`**,
  and ~10 chunks in one invocation can still bump the wall-clock ceiling, just
  later.
- **Model B — durable/incremental worker (recommended).** A `lesson_jobs`-style
  record (or chunk-progress columns on `lessons`) processed a _slice at a time_
  by a cron/`pg_net`- or poll-triggered invocation that **returns normally**
  after its slice. Removes `waitUntil` → lets us revert `config.toml` to
  `oneshot` and **restore hot-reload**, and removes the wall-clock ceiling
  entirely (each tick does bounded work). More infra, better architecture.

**Reverting `config.toml` to `oneshot` is an explicit Phase B deliverable if we
go with model B.**

## Open decisions to resolve when scoping

- Worker trigger for model B: `pg_cron` + `pg_net` vs FE-poll-triggered "tick"
  vs Realtime. (No `pg_cron` wired in the project today.)
- Data model: a `lesson_jobs` table vs chunk-progress columns on `lessons`;
  how chunks + their storage paths are tracked.
- Chunk size / overlap, and how to stitch sentence boundaries across chunks.
- ffmpeg.wasm: client-side (chosen as practical) vs a server transcode step.
- A `pg_cron` reaper for rows stuck in `processing` if a worker is hard-killed
  before its `catch` runs (defense-in-depth; nearly hit this with `oneshot`).
- Deploy gating: `supabase db push` + `supabase functions deploy transcribe-lesson`
  - the m4a allowlist are all still local-only.

## Key files to read

- `supabase/functions/transcribe-lesson/index.ts` — start/retry handlers, `runInBackground`/`waitUntil`
- `supabase/functions/transcribe-lesson/worker.ts` — `runTranscription` orchestration + chunk-merge would live here
- `supabase/functions/transcribe-lesson/transcribe.ts` — Whisper call, timeout + retry
- `supabase/functions/_shared/transcription/{script,translate,transliterate}.ts` — shared cores
- `supabase/migrations/20260605000003_lesson-transcription-job-state.sql` — `status`/`phase`/`error_code`/`script` + `create_pending_lesson`
- `src/api/lessons/mutations/{create,retry}.ts`, `src/api/lessons/db/ai.ts` — FE start/retry
- `src/views/audio-reader/lesson-card.vue` (states) + `collection/index.vue` (polling)
- `supabase/config.toml` — `[edge_runtime] policy`

Backend edits are a teaching surface — see `CLAUDE.md` Backend persona and the
`project_audio_transcription_phaseb` memory.
