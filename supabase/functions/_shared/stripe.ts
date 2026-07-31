// One Stripe client factory, one API version, for every function that talks to
// Stripe.
//
// TWO DIFFERENT "API VERSIONS" ARE IN PLAY AND THEY ARE NOT THE SAME THING:
//
//   1. This constant — governs requests the SDK *sends*. Changing it changes
//      the shape of the objects Stripe returns to our outbound calls.
//   2. The webhook endpoint's version, set in the Stripe Dashboard — governs
//      the shape of the event payloads Stripe *sends us*. Nothing in this repo
//      controls it, and bumping the constant below does not move it.
//
// Confusing the two is what let the versions drift silently: all three
// functions started aligned, then the Payment Element migration bumped
// create-subscription and manage-subscription (ui_mode: 'elements' requires
// dahlia) while stripe-webhook kept a stale string that looked meaningful but
// governed nothing, because that function made no outbound calls at all.
// Importing from here means a bump is one edit instead of three.
//
// Inbound payloads currently render at 2025-09-30.clover (both prod and the
// dev sandbox). Handlers that read a webhook payload should prefer re-fetching
// the object through this client over trusting the payload's shape — that way
// the code depends on the version below, which it controls, rather than on a
// Dashboard setting nobody watches. See `assertWebhookVersion` for the alarm.

import Stripe from 'npm:stripe@20'

// Re-exported so this module is the single place the SDK is pinned — callers
// take the class, its namespaced types (Stripe.Event, Stripe.Subscription), and
// the version-bound factory below from one import. Carries the value too, for
// the statics the class exposes (e.g. Stripe.createSubtleCryptoProvider()).
export { Stripe }

// SDK 20.4.1 declares ApiVersion = '2026-02-25.clover', one release behind this
// pin, so the string isn't assignable without the cast. The cast lives here
// alone rather than at each construction site.
export const STRIPE_API_VERSION = '2026-03-25.dahlia' as Stripe.LatestApiVersion

/**
 * Stripe client configured for Deno. Node's `http` isn't available, so the SDK
 * gets a fetch-based HTTP client.
 */
export function makeStripe(): Stripe {
  return new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient()
  })
}

/**
 * Warn when the Dashboard endpoint renders payloads at a different version than
 * the code expects. `event.api_version` is the version Stripe used for *this*
 * payload, so a drifted Dashboard setting shows up in the function logs instead
 * of as a mystery undefined field months later.
 */
export function assertWebhookVersion(event: Stripe.Event): void {
  if (event.api_version === STRIPE_API_VERSION) return

  console.warn(
    `Stripe webhook payload rendered at ${event.api_version}, code expects ${STRIPE_API_VERSION}. ` +
      `Handlers that read payload fields directly may see a stale shape.`
  )
}
