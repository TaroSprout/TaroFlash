---
id: sessions
domain: sessions
status: current
hazard: true
related: [members, permissions]
updated: 2026-08-08
---

# Sessions

Being signed in. What the browser is actually holding, how the app finds out who
you are on a cold load, and how you prove it's still you before something
sensitive changes hands.

Signing in hands the browser a **token**. It sits in the browser's own storage,
it says who you are, and it carries an expiry — one hour.

The token is the whole answer. When the app reads or writes data, the database
checks the token's signature and its expiry and nothing else. It does not ask the
sign-in service whether that account still exists, or whether someone revoked the
session ten seconds ago. It can't afford to — that check would ride on every
single request.

So there are two separate ideas of "signed in", and they can disagree:

- **The server's** — is there a live session on record for this account?
- **The browser's** — is there an unexpired token in storage?

Everything below follows from the gap between them.

> [!HAZARD] [K:deleted-account-token-outlives-deletion] **Ending a session on the server does not sign the browser out. The token in the browser keeps working until it expires on its own.**
> Deleting an account revokes every session for it. That has no effect on the
> token already sitting in this browser: it stays signature-valid for its full
> hour, the app hands it back from storage without ever asking the server, and
> the database accepts it. So the screen still says you're signed in, and reads
> and writes for a deleted account keep succeeding — for up to an hour after the
> account is gone. Only a call that goes through the sign-in service itself
> notices. The one thing that actually ends it is clearing the token out of local
> storage, which makes that cleanup a security step rather than tidying up.
> [What has to happen instead ↓](#ending-a-session-means-clearing-the-browsers-copy)

> [!HAZARD] [K:oauth-popup-loses-its-opener] **The Google sign-in popup comes back as a stranger. It cannot be recognised by the window it came from.**
> Google's consent screen sends a header that permanently moves the popup into a
> separate group of browser windows. The link back to the window that opened it
> is cut for good, and the name the popup was opened under doesn't survive
> either — not even once the popup navigates back onto our own site. Anything
> handed to the popup through the window itself is therefore gone by the time it
> matters. The tempting repair is to carry the state in the address the popup
> comes back to, and that address is exactly the one field that must not be
> caller-controlled: an open redirect. What does survive is local storage, which
> isn't scoped to that window group.
> [How the popup is recognised instead ↓](#the-popup-is-recognised-through-storage-not-the-window)

## Ending a session means clearing the browser's copy

Two paths end a session, and they end it differently.

**Signing out** asks the server to end the session and clears the local token.
Both halves happen, so both ideas of "signed in" go false together.

**An account deletion** has already ended the session server-side by the time the
app finds out. There is nothing left to revoke, so the teardown is purely local:
drop the stored token, clear the cached data, close what's open. Skip the token
and the account looks alive for the rest of the hour.

The app also watches for the sign-in library giving up on the session by itself —
a background token renewal refused because the session was revoked on another
device. That's the stale-tab case, and it's caught by listening rather than by
waiting for the next request to fail.

## The popup is recognised through storage, not the window

Sign-in with Google opens a popup, unless the device is a phone — there it's a
full-page redirect instead, because a popup on a phone is worse than useless.

Before the popup opens, the app writes a flag into local storage. When the popup
lands back on our own site, the callback page reads that flag and knows to close
itself rather than navigate to the dashboard. The flag is cleared unconditionally
on the way in, so one abandoned popup can't misfire on a later sign-in.

The address the popup returns to is fixed by the app and is deliberately not
something a caller can pass in.

## Proving it's still you

Before something sensitive changes — a password, account access — the app makes
you prove your identity again. Which proof you get depends on whether you have a
password at all.

> [!WATCH] [K:password-identity-not-client-derivable] Whether an account can sign
> in with a password is **not** readable from the signed-in session, and the
> field that looks like the answer isn't one. A password set on a Google-origin
> account never shows up in the session's list of sign-in methods. The database
> has to be asked.

Someone with a password re-enters it. Someone without one — a Google-only
account — gets a one-time code emailed to them, and using that code signs them in
again. In both cases the proof is a real sign-in, not a flag.

> [!WATCH] [K:reauth-nonce-does-not-gate] The purpose-built "reauthenticate"
> call in the auth library reads like the right tool and gates nothing here. The
> code it issues is only checked when a specific server setting is on **and** the
> session is over 24 hours old — otherwise a deliberately wrong code still lets
> the change through (verified against a local auth server). A hijacked tab is
> recent by definition, so that path would never challenge the one attacker it
> exists to stop.

Both proofs work by signing you in again, which means they leave nothing behind
on the session for a later step to inspect. Whoever calls the sensitive operation
is responsible for having done the proof first; the operation itself cannot check.

Changing a password ends every **other** session for the account, so anyone who
already had access loses it.

## Finding out who you are on a cold load

On a fresh page load the app resolves identity once and every navigation shares
that single answer, rather than each one asking again. The answer is thrown away
whenever sign-in state changes, so the next navigation asks fresh.

> [!WATCH] [K:session-restore-retry-storm] Reading the stored session triggers a
> silent token renewal when it has expired, and the auth library treats a dead
> connection as retryable — it will back off and retry for up to 30 seconds
> before admitting failure. Anything waiting on identity waits that long too, so
> the read is raced against a short timeout.

## What this isn't

This topic is about **being** signed in — the token, its lifetime, and proving
identity again. What a signed-in person is then _allowed_ to do is
[[permissions]]. Who they are as an account — profile, plan, deletion grace
window — is [[members]].
