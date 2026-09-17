---
id: rewards
domain: rewards
status: current
hazard: true
related: []
updated: 2026-09-16
---

# Rewards

The system that notices when you've done enough of something, and pays you for it.

A member does something countable — reviews a card, say. That count adds up
against a **metric** (a named countable thing, like `study.cards_reviewed`).
Cross a **milestone**'s threshold on that metric for the first time, and you
earn it: a record is stamped, and whatever the milestone promises gets paid out
— today that's paperclips, a currency tracked as its own ledger.

> [!HAZARD] [K:reward-tally-survives-reset] **Progress is a counter, not a
> history you can replay — wiping the history underneath it doesn't touch the
> count.**
> A member's tally only ever moves by having a delta added to it. Nothing ever
> recomputes it from the reviews (or whatever else) that supposedly justify it.
> So resetting a deck, or deleting the reviews that earned the progress, leaves
> the tally exactly where it was and every milestone already earned stays
> earned. That's the intended durability — a reward, once paid, is never
> silently clawed back — but it also means the tally and the history that
> "produced" it can drift apart forever, on purpose.

> [!HAZARD] [K:reward-payout-is-resolved-not-spec] **What a member was actually
> paid is stored separately from the milestone that promised it — editing the
> milestone later never touches what already-earned members got.**
> A milestone's reward is a spec ("pay some paperclips"); the moment it's
> earned, that spec is resolved into a concrete outcome (an exact amount) and
> that outcome — not the spec — is what lands in the ledger. Change the
> milestone's reward payload afterward, retune the amount, swap it for
> something else entirely, and every member who already crossed that threshold
> keeps what they were actually given. This is deliberate — it's what lets a
> future milestone resolve its payout randomly without the payout drifting
> every time someone rereads the record — but it means the milestone catalogue
> is never a reliable log of reward history.

> [!HAZARD] [K:occasion-reward-pays-once] **An occasion-scoped reward isn't
> gated by a metric crossing a threshold — it's gated by a unique key, and a
> repeat trigger for the same occasion is a silent no-op.**
> Some rewards aren't "first time this tally passes N" — they're "this
> member, this rule, this specific occasion" (say, a particular streak
> milestone or event), keyed by an `occasion_ref` the caller supplies. The
> ledger has a unique constraint on `(member, reward rule, occasion_ref)`, so
> firing the same occasion twice — a retry, a duplicate event, whatever —
> inserts nothing the second time and pays nothing the second time. Nobody
> checks "was this already paid" first; the constraint is the only thing
> enforcing it. And like every other payout (→[K:reward-payout-is-resolved-not-spec]),
> the amount is resolved from the rule's curve at the moment it pays and
> stored on the ledger row — retuning the curve's parameters afterward never
> touches an occasion that already paid out, only ones that haven't happened
> yet.

> [!HAZARD] [K:session-bonus-remainder-discarded] **A session's difficulty bonus
> is floored and paid once the session ends — the leftover fraction is thrown
> away, not saved for next time, even though the session's base reward for the
> very same cards keeps every fraction forever.**
> A study session pays two things per correct card: a flat base (an exact
> fraction of a paperclip — 0.2 today) and a difficulty bonus that scales with
> how hard the card was. The base is credited to the ledger as an exact
> sub-unit amount and just accumulates across every session a member ever
> completes — nothing about it is ever rounded away, so five 1-card sessions
> eventually complete a whole paperclip exactly like one 5-card session would.
> The bonus doesn't work that way: it's summed for the session, floored to
> whole paperclips, and only that whole amount is ever written to the ledger.
> A session that earns 0.9 of a bonus paperclip pays 0 and that 0.9 is gone —
> it never rides into the next session's bonus the way the base's fractions
> do. Add a second per-card reward component expecting it to behave like the
> base, and it will quietly cap out losing most of its value every session.

> [!HAZARD] [K:session-base-credited-on-boundary-cross] **A session's displayed
> whole-clip base earning isn't what that session earned — it's whichever
> session's fraction happened to tip the member's running total over the next
> whole paperclip.**
> Base pays in exact thousandths and just accumulates
> (→[K:session-bonus-remainder-discarded] covers the bonus counterpart). The
> whole-clip base amount shown for a given session is the increase that
> session caused in the member's floored cumulative base total, not a share of
> that session's own fraction. So a session that only earns, say, 0.1 of a
> paperclip in base can still display "+1" if earlier sessions had already
> banked 0.9 — the session that happens to cross the boundary gets full credit
> for a clip that four other sessions mostly paid for. This is deliberate and
> the mirror image of the bonus's discarded remainder: base fractions carry
> and are eventually paid in full, just not necessarily to the session that
> earned most of them.

## Paperclips are minted in thousandths; only whole clips are ever spent

A paperclip amount in the ledger is stored as **thousandths of a paperclip**
(so 0.2 paperclip is the integer `200`), which is what lets a reward pay an
exact fraction instead of rounding on every single entry. A member's
spendable balance is never fractional, though — `paperclip_balance` is a view
that sums a member's entries and floors the result to a whole paperclip
(`floor(sum(amount) / 1000)`), and every read of a balance goes through that
one view. Nothing anywhere re-derives or re-floors a balance a second time,
and a paperclip is never shown to a member as anything but a whole number.

Every ledger row also carries a `source` — the name of whatever component
paid it (`session_base`, `session_bonus`, `milestone`, …). A milestone payout
never sets one itself; `apply_reward` fills it in as `'milestone'` when the
payload omits the key, so a ledger row is never missing a source to blame.

## Counting, crossing, and paying happen as one step

A source reports progress (a member did X, count it Y). That single call:
tallies the count, checks whether the new tally crossed any milestone it
hadn't already earned, stamps the earned record, and pays out — all in one
atomic transaction. There's no in-between state where a member's tally has
moved past a threshold but the reward hasn't landed yet, and no way for two
concurrent reports on the same metric to pay the same milestone twice.

## The server is the only source of truth

Nothing about a reward is decided by, or trusted from, the client. Every write
— counting progress, crossing a milestone, paying it out — happens inside
server-side functions the client cannot call directly; a member can only read
their own rows. A member's paperclip balance is never a number sitting on
their own row (which they could edit) — it's the sum of an append-only ledger
of individual payouts, so a spoofed balance would require forging every entry
that sums to it.

## What this isn't

- **Not a full catalogue of reward kinds.** Paperclips are the only kind paid
  out today; the schema is built to add more (an unlockable reward table
  exists and is written by nothing yet).
- **Not the UI that reveals an earned milestone to the member.** This topic
  covers the server-side ledger of truth, not how or when a member finds out.
