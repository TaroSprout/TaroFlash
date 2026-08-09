---
id: return-destination
domain: authz
status: current
hazard: true
related: [permissions]
updated: 2026-08-08
---

# Where a member lands after signing in

When the auth checkpoint bounces a signed-out visitor to `/welcome`, the
in-app path they were trying to reach rides along as a `?next=` query param.
`src/composables/auth/return-destination.ts` stashes that path so it survives
sign-in — including the full-page redirect Google OAuth does, which wipes
both router state and `history.state`.

> [!HAZARD] [K:return-destination-open-redirect]
> **`next` is attacker-controlled input, and a naive redirect on it is a
> classic open-redirect.** A crafted link (`?next=https://evil.example`, or
> the protocol-relative `//evil.example` and backslash `/\evil.example`
> tricks some browsers still treat as a host) could otherwise send a member
> who trusts this app's domain straight to a phishing page right after they
> authenticate. Every read validates the value is a real in-app path — one
> that starts with a single `/` and isn't followed by another `/` or `\` —
> before it's ever used as a redirect target; anything else is discarded.

The value lives in `sessionStorage`, not `localStorage`: it only means
anything within the tab that started the sign-in, and the full-page OAuth
redirect returns to that same tab.
