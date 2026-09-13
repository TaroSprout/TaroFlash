---
id: capabilities
domain: authz
status: current
hazard: true
related: [permissions]
updated: 2026-09-13
---

# Capabilities

A table of runtime capabilities that turn parts of the app on and off without a
deploy — read the same way the app already reads a member's plan and role.

Some things the app can do aren't gated by _who you are_ — they're gated by
whether the feature is turned on at all. A capability is that toggle: a
named row an admin can flip live, and everything asking "is this feature live?"
reads that one row.

Each capability has a single row, found by its key. The row carries the
capability's current state — `off` or `on` — and that state _is_ the answer.
There is no separate "default" to fall back to: when a capability is added its
row is seeded with a starting state, and that seeded state is simply what reads
until an admin changes it.

> [!HAZARD] [K:capability-server-has-no-fallback] **The server never guesses a capability it can't read — a missing row reads as not live, full stop, and it takes no fallback from whoever's asking.**
> The tempting assumption is that an absent capability should "default to on", or
> that the caller can pass a default the way the client does. Neither holds on
> the server: if the row isn't there, the feature is off. The flip side is the
> point — the client _does_ carry a code-constant fallback, but only to cover
> the brief window before its row has loaded, and only on the screen. The
> server's answer is the lock, and it fails closed.

> [!HAZARD] [K:capability-resolution-stays-server-side] **A `targeted` capability is resolved server-side, member-scoped — the client never reads the allow-list rows to work out its own answer.**
> The trap looks harmless: an admin can already read every row in the allow-list
> table, because the same admin RLS policy that lets them manage capabilities
> also lets them read every member's grants, not just their own. A client that
> fetched those raw rows and compared locally would see a grant meant for
> anyone as a grant for every admin — a `targeted` capability turned on for one
> account reading live for all of them. The fix isn't a tighter client-side
> filter; it's never handing the client anything to compare — it asks a
> server function for its own resolved `key, live` pairs and reads the answer.

## Off means off, missing means off

Reading a capability comes down to its row:

| The capability's row… | reads as…                                |
| --------------------- | ---------------------------------------- |
| `state = 'on'`        | live for everyone                        |
| `state = 'off'`       | not live                                 |
| `state = 'targeted'`  | live only for a member on its allow-list |
| no row at all         | not live                                 |

The last row is the one that catches people. A capability with no row is not
"unconfigured, so allow it" — it's off. Failing closed is deliberate: a
feature nobody has turned on has no business running.

## Who can flip one

Reading a capability and changing a capability are two different permissions.

- **Any signed-in member can read** capability states — the screen needs them to
  decide what to show.
- **Only an admin can change** a capability. A moderator or an ordinary member
  cannot, and the write is refused at the database, not just hidden on the
  screen — the same server-is-the-boundary rule as every other permission
  ([[permissions]]).

## Targeting a feature at some people

A capability doesn't have to be all-or-nothing. Set to `targeted`, it reads live
only for members on an explicit allow-list — everyone else sees it as not live,
exactly as if it were off.

The allow-list is a separate table: one row per granted member, recording who
granted the entry and when. An admin adds and removes entries; a member can see
only their own, never the rest of the list — the membership stays private. An
empty allow-list means a `targeted` feature is live for nobody, admins included,
until someone is granted.

Deleting a granted member's account clears their entries. Deleting the admin who
granted an entry keeps the entry and blanks who granted it, so a grant outlives
the admin who made it.

## What this isn't

- **Not a permission.** A `can_` check asks whether _you_ may do something; a
  capability asks whether the _feature_ is live at all. A guarded action
  can depend on both.
- **Not a plan gate.** Whether a feature is paid rides on the member's plan —
  separate machinery.
- **Not the SQL.** How the capability's row is read and how writes are gated is code
  detail, recorded at the function that does it.

## Related

[[permissions]]
