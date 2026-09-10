---
id: capabilities
domain: authz
status: current
hazard: true
related: [permissions]
updated: 2026-09-10
---

# Capabilities

A table of runtime switches that turn parts of the app on and off without a
deploy — read the same way the app already reads a member's plan and role.

Some things the app can do aren't gated by _who you are_ — they're gated by
whether the feature is switched on at all. A capability switch is that toggle: a
named row an admin can flip live, and everything asking "is this feature live?"
reads that one row.

Each capability has a single row, found by its key. The row carries the
capability's current state — `off` or `on` — and that state _is_ the answer.
There is no separate "default" to fall back to: when a capability is added its
row is seeded with a starting state, and that seeded state is simply what reads
until an admin changes it.

> [!HAZARD] [K:capability-server-has-no-fallback] **The server never guesses a switch it can't read — a missing row reads as not live, full stop, and it takes no fallback from whoever's asking.**
> The tempting assumption is that an absent switch should "default to on", or
> that the caller can pass a default the way the client does. Neither holds on
> the server: if the row isn't there, the feature is off. The flip side is the
> point — the client _does_ carry a code-constant fallback, but only to cover
> the brief window before its row has loaded, and only on the screen. The
> server's answer is the lock, and it fails closed.

## Off means off, missing means off

Reading a capability comes down to its row:

| The switch row… | reads as… |
| --------------- | --------- |
| `state = 'on'`  | live      |
| `state = 'off'` | not live  |
| no row at all   | not live  |

The last row is the one that catches people. A capability with no switch is not
"unconfigured, so allow it" — it's off. Failing closed is deliberate: a
feature nobody has switched on has no business running.

## Who can flip one

Reading a switch and changing a switch are two different permissions.

- **Any signed-in member can read** switch states — the screen needs them to
  decide what to show.
- **Only an admin can change** a switch. A moderator or an ordinary member
  cannot, and the write is refused at the database, not just hidden on the
  screen — the same server-is-the-boundary rule as every other permission
  ([[permissions]]).

## The reserved seam

Each switch is either off or on for everyone — v1 has no notion of turning a
feature on for _some_ people. The table still leaves room for that later: a
third `targeted` state and an unused targeting slot sit reserved, written by
nothing today. They exist so cohort or percentage rollouts can be added without
reshaping the table, not because anything reaches them yet.

## What this isn't

- **Not a permission.** A `can_` check asks whether _you_ may do something; a
  capability switch asks whether the _feature_ is live at all. A guarded action
  can depend on both.
- **Not a plan gate.** Whether a feature is paid rides on the member's plan —
  separate machinery.
- **Not the SQL.** How the switch row is read and how writes are gated is code
  detail, recorded at the function that does it.

## Related

[[permissions]]
