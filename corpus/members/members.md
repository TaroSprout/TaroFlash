---
id: members
domain: members
status: current
hazard: true
related: [permissions, scheduling]
updated: 2026-08-08
---

# Members

Who a person _is_ to the app — the account behind every deck, card, and review,
and the thing that says which of it all belongs to them.

Sign in for the first time and, without anyone asking, a **member** appears —
one row that stands for you across the whole app.

From then on, almost everything you make carries a quiet stamp of your name.

1. **You make a thing** — a deck, a card, a review.
2. **It gets stamped** — _"this belongs to you"_ — the instant it's saved.

That stamp is what keeps your stuff yours and everyone else's out of reach. You
never write it; the app writes it for you, from whoever you're signed in as.

> [!HAZARD] **The ownership stamp is copied from _whoever is asking_ — and a trusted backend job asks as nobody.**
> Stamping "this belongs to you" from the signed-in person is exactly what makes
> it effortless — you never have to set it. The flip side: a privileged backend
> job runs with _no_ signed-in person, so the stamp comes back **empty**. On a
> table that demands an owner, the write fails loudly. On one that _allows_ a
> blank owner, it quietly saves a row that belongs to no one — invisible to its
> real owner forever, and past the isolation wall that would have caught it.
> [See how the stamp is filled ↓](#the-stamp-belongs-to-whoever-asked)

## Born at sign-up

A member isn't something you fill out a form for. The moment a new account is
created, a member row is born alongside it, seeded with sensible defaults — a
display name guessed from your login, a starting plan, an ordinary role.

You can't sign in and _not_ have one. The account and the member are two halves
of the same person, created together and deleted together.

## The stamp belongs to whoever asked

Nearly every row you own — decks, cards, reviews, media, feedback — carries an
owner mark. You never set it by hand. When the row is saved, the app reads _who
is making this request_ and writes that name onto the row.

That's the whole trick behind isolation: since the owner mark can only ever be
_your_ name, and you can only ever read rows marked with your name, you simply
cannot see into anyone else's things.

> [!WATCH]
> The owner mark is taken from the request, not from anything the sender chose.
> Hand the app a row that _claims_ a different owner and the claim is ignored —
> the mark is overwritten with whoever you actually are. You can't gift a row to
> someone else by lying about it.

The catch lives at the edges. A few trusted backend jobs — billing, transcription
— don't run _as_ a person; they run as the system, with special power that skips
the isolation wall entirely. Ask for the owner there and you get nothing back.
Where the row insists on an owner, the write is rejected. Where it doesn't, a row
with a blank owner slips through and lands unreachable. Those jobs must set the
owner themselves; they can't lean on the automatic stamp.

## Plan and role: two different questions

A member carries two separate dials, and they answer different questions.

- **Plan** — _how much_ you can do. Free or paid, it sets the ceilings: how many
  decks you can keep, how many cards fit in one. Reach a ceiling and the app
  stops you, at the screen and again at the server.
- **Role** — _what kind_ of thing you can do. Most people are ordinary members; a
  few are moderators or admins who can reach past their own rows to run the
  platform.

The plan is never something you set for yourself. It moves only when billing says
it moved — a successful payment lifts it, a lapsed one drops it back. The same
lock keeps you from quietly promoting your own role. Both are off-limits to the
one edit you _are_ allowed: changing your own display name, description, avatar.

> [!RULE]
> Your own edits can touch your profile, never your plan or your role. Those two
> change only through billing and administration — paths that run with system
> power, above the rule that pins everyone else to their own row.

## Revoking a session doesn't lock the door immediately

Signing someone out everywhere from the server side revokes the **session**, but
it does not invalidate the access token they're already holding. Data reads and
writes keep working with that token until it expires on its own — up to an hour.
Only the identity service checks whether the session still exists, so the
revocation shows up there and nowhere else.

The app can't see it at all: asking the client library for the current session
returns the stored token without contacting the server, so someone whose sessions
were revoked still reads as signed in.

> [!RULE]
> Any server-side revocation is paired with clearing the token locally as well.
> One without the other leaves a half-signed-out state where the app believes it's
> authenticated and most requests agree.

## Suspending an account is one flag, read through one function

A member scheduled for deletion is suspended by a single stored date. Ownership
rules don't read the signed-in identity directly — they read a function that
returns it normally and returns *nobody* once that date is set, so one flag empties
every table the member owns at once.

Two rules deliberately keep reading the raw identity: a member reading their **own**
record (otherwise they can't see that they're pending, and undoing it becomes
unreachable), and the undo itself.

> [!WATCH]
> Functions that run with elevated privileges bypass ownership rules entirely, so
> they don't inherit the suspension — each one has to perform the check itself.
> Any time ownership is the enforcement mechanism, the elevated functions are a
> separate sweep.

Hiding a pending member from other people is done at request time — their public
decks are flipped private and flagged, so undoing republishes exactly those — rather
than by checking every row's owner on read, which would put a lookup on the hottest
queries in the app forever.

## What this isn't

- **Not the permission rules.** _What_ a plan or role unlocks, and why the answer
  always comes from the server, is [[permissions]]'s job — this is about what a
  member _is_.
- **Not billing.** How a payment turns into a plan change lives with the
  subscription flow, not here.
- **Not the public profile.** What _other_ people get to see of you — display
  name, banner, description — is a narrow, deliberate slice, covered where reading
  across the isolation wall is explained.
- **Not the SQL.** The sign-up trigger, the stamping trigger, and the row-level
  policies are code detail — the reference docs cover those.

## Related

[[permissions]] · [[scheduling]]
