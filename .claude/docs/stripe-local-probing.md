# Exercising Stripe locally

Stripe paths can be verified end to end against the Dev Sandbox. Don't settle for "the types check out" when real money logic is involved.

## Secrets come from Doppler, cached for the edge runtime

Edge functions run in an isolated container and **don't** inherit `doppler run`'s environment, unlike Vite and `supabase start` which are direct child processes. `scripts/bootstrap-env.sh` bridges that: it caches `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` from Doppler into `supabase/functions/.env.local` — the file `supabase functions serve` actually reads. It runs automatically on `pnpm dev` and is idempotent.

- **`supabase/functions/.env.local` is the live file.** A stale `supabase/functions/.env` may still be lying around in older checkouts; nothing generates or reads it. Don't add keys to it.
- **`stripe listen` works** — `mprocs.yaml` passes `--api-key "$STRIPE_SECRET_KEY"` so it never falls back to the CLI's `stripe login` key, which expires roughly every 90 days. If you're driving the API by hand outside `doppler run`, get the key the same durable way: `doppler secrets get STRIPE_SECRET_KEY --plain`.

### In a fresh worktree

Doppler scopes are keyed by absolute path, so a new worktree starts **unscoped** and every `doppler` call fails with "You must specify a config". `bootstrap-env.sh` opens with `doppler setup --no-interactive --silent`, which fixes that from `doppler.yaml`.

So the fix in a worktree is to run it — `pnpm dev`, or `./scripts/bootstrap-env.sh` on its own. **Never hand-copy `.env` files between checkouts**; the cache is derived, and a copied one goes stale silently.

`fork-dev` worktrees start `vp dev` directly and never run bootstrap. That's fine for SPA work, but any edge-function or Stripe path in a fork needs the script run there first.

## Probing without the CLI

Webhooks don't need `stripe listen`. Since `STRIPE_WEBHOOK_SECRET` is in the cached env, you can hand-sign a synthetic event — header `stripe-signature: t=<ts>,v1=<hmac_sha256(secret, "<ts>.<payload>")>`, POST the raw body to `/functions/v1/stripe-webhook` (it runs with `verify_jwt = false`). Replaying the same event is how you prove idempotency.

## Traps that cost real time

- **Build a subscription, don't hand-roll an invoice.** `invoiceitems` + `invoices` silently produces a **$0 invoice** unless you pass `pending_invoice_items_behavior=include` — and refund code correctly does nothing with a $0 invoice, which reads exactly like a bug. A subscription on a test price with `pm_card_visa` yields a real paid invoice immediately.
- **`POST /invoices/:id/finalize` auto-pays** when a default payment method is set, so a following `/pay` returns "Invoice is already paid" and a status read straight after can still say `draft`. Sleep, then re-read.
- **Never discard stderr on a probe script.** Two separate false "the refund didn't happen" conclusions came from `2>/dev/null` hiding the actual API error.

## Local Supabase side

`supabase status -o env` gives `API_URL` / `ANON_KEY` / `SERVICE_ROLE_KEY`. Create users via `POST /auth/v1/admin/users` with `email_confirm: true`, sign in via `/auth/v1/token?grant_type=password`, and clean up through `DELETE /auth/v1/admin/users/<id>` so the dev database stays tidy.

Seeding owned rows as `postgres` still needs `tests.set_claims(<uid>)` — the `set_member_id` triggers stamp `member_id` from `auth.uid()`, so claim-less seeding writes NULL and trips the NOT NULL constraint.
