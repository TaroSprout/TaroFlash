#!/usr/bin/env bash
# Ensures local dev env vars exist before the stack boots.
# Idempotent — safe to run on every `pnpm dev`.
# Edge functions run in an isolated container and don't inherit `doppler run`'s
# env (unlike vite/supabase start, which are direct child processes), so their
# secrets are cached into this file instead — the channel `supabase functions
# serve` actually reads.
set -euo pipefail

ENV_FILE="supabase/functions/.env.local"
mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"

# Signing secret is stable per Stripe CLI login, so fetch once and reuse.
if ! grep -q '^STRIPE_WEBHOOK_SECRET=' "$ENV_FILE"; then
  echo "Fetching Stripe webhook secret..."
  secret=$(stripe listen --print-secret)
  echo "STRIPE_WEBHOOK_SECRET=$secret" >> "$ENV_FILE"
  echo "Cached STRIPE_WEBHOOK_SECRET → $ENV_FILE"
fi

for key in STRIPE_SECRET_KEY OPENAI_API_KEY ANTHROPIC_API_KEY; do
  if ! grep -q "^${key}=" "$ENV_FILE"; then
    value=$(doppler secrets get "$key" --plain)
    echo "${key}=${value}" >> "$ENV_FILE"
    echo "Cached ${key} → $ENV_FILE"
  fi
done
