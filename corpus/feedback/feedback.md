---
id: feedback
domain: feedback
status: current
hazard: true
related: [permissions]
updated: 2026-07-23
---

# Feedback

A public wall where members post ideas and bug reports, vote on each other's,
and watch the good ones get picked up.

Anyone signed in can open the board and read what's there.

Two things a member can do to a post:

1. **Add their own** — a title, and an optional bit more.
2. **Vote for someone else's** — a heart they can add or take back at any time.

A smaller group — the moderators — can do a third thing: decide which posts the
wall shows, and mark where each one stands.

> [!HAZARD] **A new submission does not land on the wall. It waits, unseen, until a moderator lets it through.**
> Posting feels finished — the member gets a "thanks, submitted" and the box
> closes. But every fresh post starts _hidden_, and the wall only ever shows the
> ones a moderator has published. So the obvious assumption — "I posted it, it's
> on the board now" — is quietly false. The post is real and saved; it is simply
> invisible to everyone (its own author included) until someone moderates it.
> Nothing tells the member that. [See how a post gets published ↓](#a-post-earns-its-place)

## What a post carries

Every post remembers who wrote it, a title, and an optional body. Alongside that
it carries three things the writer never sets:

- **A kind** — idea, bug, or other. The submit box doesn't ask; a moderator sorts
  it later.
- **A standing** — where it is in its life: new, accepted, rejected, in progress,
  or done.
- **Whether it's shown** — public (on the wall) or held back. Held back is the
  starting point.

The member fills in the words. Everything that governs _whether and how the post
appears_ is a moderator's call.

## A post earns its place

A post's journey is short but gated:

`written` → `held back (the default)` → _a moderator publishes it_ → `on the wall`

A moderator is the only one who can flip a post to public, and the same action
lets them set its standing — accepted, in progress, done, and so on. Until that
happens the post exists but shows to no one on the board.

This is deliberate. The wall is a curated shortlist, not a raw inbox.

## Voting is a live toggle

A heart is a switch, not a tally you add to. Tap once to back a post, tap again
to take it back — a member's vote counts exactly once or not at all.

The count everyone sees is the server's, always. The heart flips the instant
it's tapped so it feels immediate, but if the server disagrees the display
snaps back to the true count.

> [!NOTE]
> Voting is the one feedback action with no gate beyond being signed in — any
> member can back any published post. Writing a post and moderating one are the
> guarded actions; voting is open.

## Who sees which posts

The rule underneath the wall lets three kinds of reader through: anyone, for a
**published** post; its **author**, for their own held-back post; and a
**moderator**, for _everything_.

That last clause is a widened rule — and the board leans on it at its peril. The
wall itself must still ask only for published posts, or a moderator opening the
ordinary board would pull the entire hidden backlog onto it. The wall gets that
narrowing right by scoping its own request, not by trusting the rule to stay
tight. This is the [[permissions]] "widen once, ripple everywhere" trap in the
wild — the moderator's wider reach silently widens any query that forgot to
scope itself.

> [!RULE]
> "Moderator" here is a named permission — the thing that unlocks moderation, not
> a check for who happens to be an admin today. Publishing, restanding, and
> reading the hidden backlog all ask that one permission by name. See
> [[permissions]] for why it lives in exactly one place.

## What this isn't

- **Not roles.** Who counts as a moderator, and how that's decided, is
  [[permissions]]'s business — this topic only cares that _a_ moderator gate
  exists.
- **Not a support inbox.** A post is a public idea or bug on a shared wall, not a
  private ticket routed to a person.
- **Not the wiring.** Tables, policies, the vote toggle's internals, and the
  publish call are code detail — the reference docs cover those.

## Related

[[permissions]]
