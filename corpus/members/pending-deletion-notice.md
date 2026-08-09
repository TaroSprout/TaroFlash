---
id: pending-deletion-notice
domain: members
status: current
hazard: false
related: [members]
updated: 2026-08-08
---

# The suspended-account panel

When a member has requested account deletion, they're still let into the app
shell rather than bounced to the welcome screen — the shell shows a persistent
panel over the route skeleton instead, offering "recover" or "sign out".

## The panel is a module-level singleton so repeat opens collapse [K:pending-deletion-notice-singleton]

The shell can call `open()` more than once for the same suspension — an
immediate fire plus a re-fire once the member row resolves the pending state —
and a restore-then-relapse sequence would too. A plain per-call notice would
replace the panel and replay its open sound each time, so the currently-open
notice is tracked at module scope and a second `open()` while one is showing is
a no-op.

## Recovery invalidates every cached query, never removes one [K:pending-deletion-notice-invalidate-not-remove]

While a member is archived, every query scoped to them resolves to an empty
result and caches it — there's no worthwhile per-key list to invalidate when
the honest answer is "everything this member owns just came back". Recovery
invalidates the whole cache rather than enumerating keys.

It invalidates rather than removes: the member store's own query is mounted at
the app root and stays bound to its cache entry. Removing that entry would
leave the store still holding the stale row, so `pending_deletion` would stay
`true` and the route guard would bounce straight back to this panel. The
invalidate is awaited so the guard re-checks against the refetched row instead
of racing it.

## Dismissing the panel any way while still suspended signs the member out [K:pending-deletion-notice-dismiss-signs-out]

The panel can be dismissed by more than its buttons — a swipe-to-dismiss works
regardless of the `closable` setting. Every dismissal path checks whether the
member is still pending deletion and signs them out if so: an archived member
reads zero rows everywhere, so leaving them in the shell with a live session
would strand them on an empty skeleton with no route back to this panel.
