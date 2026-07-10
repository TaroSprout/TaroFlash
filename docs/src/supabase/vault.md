---
lastUpdated: 2026-07-10T17:37:36Z
---

# Vault Secrets

The `cleanup-media` cron job needs two secrets stored in the Supabase Vault so it can call the edge function on a schedule. The lesson transcription chain (below) reads the same two secrets for the same reason.

---

## Finding the values

Open the Supabase dashboard for the target project and go to **Settings → API**:

| Secret name        | Where to find it                                   |
| ------------------ | -------------------------------------------------- |
| `supabase_url`     | **Project URL** field                              |
| `service_role_key` | **Project API keys → service_role** (click Reveal) |

For local dev, run `supabase status` — both values are printed in the output.

---

## Adding the secrets

Open the **SQL Editor** for the target project and run:

```sql
SELECT vault.create_secret('<project-url>', 'supabase_url');
SELECT vault.create_secret('<service-role-key>', 'service_role_key');
```

Example for local dev:

```sql
SELECT vault.create_secret('http://127.0.0.1:54321', 'supabase_url');
SELECT vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 'service_role_key');
```

---

## Updating a secret

If a value changes (e.g. rotating the service role key):

```sql
UPDATE vault.secrets SET secret = '<new-value>' WHERE name = 'service_role_key';
UPDATE vault.secrets SET secret = '<new-value>' WHERE name = 'supabase_url';
```

---

## Verifying

```sql
SELECT name, created_at, updated_at FROM vault.secrets ORDER BY name;
```

You should see both `service_role_key` and `supabase_url` listed. The `secret` column is encrypted — raw values are not visible, which is the point.

---

## Testing the cron job

Once secrets are set, fire the cleanup function immediately to confirm everything works:

```sql
SELECT public.invoke_cleanup_media();
```

Then check the response:

```sql
SELECT status_code, content, error_msg
FROM net._http_response
ORDER BY created DESC
LIMIT 5;
```

---

## Lesson transcription chain

`supabase/migrations/20260606000003_lesson-processing-chain.sql` reuses this same Vault plumbing to drive the `transcribe-lesson` edge function's phase chain (transcribe → chapter → translate → transliterate). `invoke_lesson_process(lesson_id)` — `SECURITY DEFINER`, same as `invoke_cleanup_media` — reads `supabase_url` and `service_role_key` from `vault.decrypted_secrets` and fires `net.http_post` at `<supabase_url>/functions/v1/transcribe-lesson` with `{ action: 'process', lesson_id }`.

It isn't cron-scheduled: a trigger (`trigger_lesson_processing`, on `lessons` insert/update) calls it whenever a row enters a new `phase` while `status = 'processing'`. Writing the next phase is the signal to run it, so the chain advances itself one step per invocation with no long-lived isolate carrying the whole pipeline. The trigger swallows any error from the Vault lookup or `net.http_post` (missing secret, `pg_net` hiccup) rather than raising — a failed kick must never roll back the row write that triggered it; the stall reaper (below) recovers a row whose kick never landed.

`supabase/migrations/20260606000004_lesson-stall-reaper.sql` adds `reap_stalled_lessons()`, scheduled every minute via `cron.schedule`. It does **not** touch the Vault or `pg_net` — it's a plain `UPDATE public.lessons SET status = 'failed', ... WHERE status = 'processing' AND updated_at < now() - interval '10 minutes'`, settling any row whose phase-in-progress heartbeat (`updated_at`) has gone stale because its isolate died mid-phase.
