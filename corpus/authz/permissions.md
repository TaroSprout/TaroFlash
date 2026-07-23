---
id: permissions
domain: authz
status: current
hazard: true
related: [media]
updated: 2026-07-23
---

# Permissions

How the app decides who's allowed to do what — and why the real answer always
comes from the server, never the screen.

Every guarded action — removing a member, moderating feedback, opening the audio
reader — comes down to one question: _is this person allowed to do this?_

Each permission has a single home: a small, named check like
`can_manage_members`. Change who's allowed, and you change it in that one place.

That check gets asked in two very different spots:

1. The **screen** asks it — to decide what to show or hide.
2. The **server** asks it again — to decide what's actually allowed to happen.

Only the server's answer counts. What the screen does with it is a courtesy — it
keeps people from reaching for buttons they can't use.

> [!HAZARD] **Widen a permission, and every query that was leaning on the old, tighter rule silently widens with it — including screens you forgot were leaning on it.**
> This is the flip side of the "change it in one place" convenience below. The
> same wiring that updates every screen at once will also ripple a loosened rule
> into queries you never meant to touch — turning an ordinary dashboard into a
> firehose. A screen that must stay narrow has to scope _itself_; the permission
> can't do it for you.
> [See exactly how it happens ↓](#the-flip-side-widen-once-ripple-everywhere)

## One check per permission

A permission isn't scattered across the code as "is this an admin?" tests. It's
collected into one named check that describes _what it unlocks_ —
`can_manage_members`, `can_moderate_feedback`, `can_read_lesson_audio`.

Everywhere that permission matters asks that one check by name. So when the rule
changes, the change happens once, and every screen and server call that asks
picks it up for free.

> [!RULE]
> Name a permission for the thing it unlocks, never for who happens to have it
> today — `can_manage_members`, not `is_admin`. Roles come and go; the thing
> you're protecting stays put.

## The screen is only a hint

On the screen, a permission decides what you _see_ — a hidden button, a
greyed-out control. That's a nicety, so people aren't offered things they can't
do. It is never what keeps anything safe.

> [!WATCH]
> Hiding a button is not protection. If the server doesn't check the same
> permission again, a determined person just calls the action directly and it
> works. The screen's check is courtesy; the server's is the lock.

## The flip side: widen once, ripple everywhere

The permission that guards _who may see a deck_ isn't only checked on admin
screens. It also quietly scopes ordinary ones. The dashboard just asks for "all
decks" and trusts the permission to trim that down to the ones you belong to:

`select * from decks` → your 5 decks

Now an admin moderation tool ships, and the rule is loosened to "a deck you
belong to _— or any deck, if you're an admin._" Nobody touched the dashboard. But
its query was leaning on the old, tighter rule — so for an admin, that same
untouched query now returns **every deck on the platform.**

| The rule says…                                  | The dashboard's unchanged query returns… |
| ----------------------------------------------- | ---------------------------------------- |
| a deck you belong to                            | ✅ your 5 decks                          |
| …or any deck, if you're an admin                | ⚠️ **every deck on the platform**        |
| the dashboard scopes _itself_: `where i_belong` | ✅ your 5 decks — whatever the rule says |

Same query all three times. Only the last row is safe on its own.

That's the trade for the one-place convenience above: change a rule once and it
lands everywhere — the screens you meant _and_ the ones you forgot were trusting
it. The permission's job is to get the **ceiling** right. Only the query can get
the **screen** right.

## What this isn't

- **Not the list of roles.** Which roles exist and who holds them is its own
  topic — this is about what a permission _does_.
- **Not billing.** Whether a feature is paid rides on the member's plan — a
  related but separate kind of check.
- **Not the SQL.** How a check is written and wired into the database and edge
  functions is code detail — the reference docs cover that.

## Related

[[media]]
