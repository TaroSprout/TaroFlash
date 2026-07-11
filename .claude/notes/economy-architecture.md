# Economy / Powerup / Stamp Rally Architecture

## Context

Long-term epic, not started. Seed loop: study → earn paperclips → spend on
powerups → use powerups in session to earn more → repeat. Also planned:
a stamp-rally system awarding stamps for thresholds on nearly every micro
interaction in the app, which itself pays out paperclips. This note captures
the foundational architecture decided ahead of any implementation, so future
work builds toward it instead of re-deriving it.

## Core decision: one event bus, three independent consumer families

Everything worth tracking emits a domain event (`card_answered`,
`session_started`, `session_ended`, `deck_completed`, `login`, ...) onto a
single stream. Paperclip-earning, powerups, and the stamp rally are three
separate subscriber families on that _same_ stream — not three ad hoc
tracking mechanisms. Stamps pay out paperclips too, so stamps are a producer
back into the earning side, not a dead-end consumer.

Stamp thresholds need a **materialized counter** per member per stat
(`member_stat_counters: member_id, stat_name, value`), not a live count over
the raw event log — checking a threshold should be reading one integer, not
scanning history.

## Core decision: powerups are not one dispatch mechanism

Exploring three concrete powerup ideas (Mystery Multiplier, Mystery Box,
Double or Nothing, Redraw Morning Challenge) surfaced that "powerup" is an
umbrella over genuinely different dispatch shapes:

1. **Reactive modifiers** — passive, folded into a scoring pipeline.
   e.g. Double or Nothing (flips sign on incorrect answers), Mystery
   Multiplier (multiplies points for tagged cards). Live only for the
   session's duration.
2. **Lifecycle listeners** — additive, fire once at a defined event boundary.
   e.g. Mystery Box at `session_ended`. Same event bus the stamp rally uses.
3. **On-demand actions** — imperative, invoked directly by user intent
   against some other feature's own API, no event or modifier involved.
   e.g. Redraw Morning Challenge — just calls
   `rerollMorningChallenge()` gated by ownership/cost. Forcing this through
   the event bus or modifier chain would be the wrong abstraction.

**The only genuinely shared surface across all three categories is the
inventory/ownership layer**: does the member own this powerup, is it
active/charged, what does using it cost, is it consumed or persistent.
That shell — `owns(powerup_id)`, `activate(powerup_id)`, `consume(powerup_id)`
— is the real "powerup framework." What `activate()` does branches by
category; unifying the three dispatch shapes into one is where this would
tip into a wrong abstraction.

Each powerup definition should declare its category explicitly
(`category: 'modifier' | 'listener' | 'action'`) rather than have it
inferred — this also tells the inventory layer which powerups are legal to
activate mid-session vs. only from outside one.

## Modifier chain shape (category 1 powerups)

Considered against two alternatives before settling here:

- **Declarative modifiers object + single calculator** — most inspectable/
  debuggable, but caps expressiveness to a pre-anticipated schema; a novel
  earning rule needs a schema change, not just a new data entry.
- **Event-sourced / deferred computation** — record raw outcomes as an
  immutable log, compute points via a reducer after the fact (even
  retroactively). Most powerful (replay, retune old sessions) but nothing is
  "final" until the reducer runs, so a live running total needs its own
  live-reducer or stays provisional.
- **Modifier chain (chosen)** — pure functions `(value, context) => value`,
  registered/unregistered on powerup activate/deactivate, folded over the
  base value at compute time. Composes without powerups knowing about each
  other (a modifier that doesn't apply just returns `value` unchanged).
  Ordering must be an explicit priority tier (e.g. per-card effects before
  session-wide effects) decided per powerup pairing — insertion order isn't
  safe once effects don't commute. Each modifier is independently unit-
  testable with no session/store setup.

```
type PointModifier = (value: number, context: ReviewContext) => number
final_points = modifiers.reduce((acc, mod) => mod(acc, context), base_points)
```

## Where this lives in the codebase

Split by "is this server state or is this engine logic," following the
`src/sfx/` precedent (plain-TS cross-cutting engine, not a composable, not
server state):

```
src/economy/                     # plain TS engine, framework-agnostic
  events.ts                      # the bus: subscribe/emit
  modifiers.ts                   # modifier-chain reducer + priority tiers
  powerups/
    registry.ts                  # category dispatch: modifier | listener | action
    mystery-multiplier.ts        # one file per powerup, self-registers
    double-or-nothing.ts
    mystery-box.ts
    redraw-morning-challenge.ts

src/api/ledger/                  # transaction history / balance (db/ queries/ mutations/)
src/api/inventory/               # owned powerups + charge state
src/api/shop/                    # catalog + purchase mutation

src/stamps/                      # sibling consumer of the bus, own domain
src/api/stamps/                  # member_stat_counters table access
```

`ledger` / `inventory` / `shop` stay separate `src/api/` domains (matching
existing per-entity topology) rather than one `economy` folder — different
tables, different query shapes.

Stamps are a **sibling** of economy, not nested under it, even though stamps
pay out paperclips — keeps `economy/` scoped to the money loop itself rather
than becoming a dumping ground for anything event-driven.

Powerup _effects_ still execute inside the systems they reach into — Mystery
Multiplier's modifier still gets pushed into whatever session controller owns
the scoring pipeline (currently `session-controller.ts` /
`session-queue.ts` under `src/views/study-session/composables/`); Redraw
still calls into the eventual `src/api/challenges/`. `src/economy/powerups/*`
only defines what each powerup does and which category it is.

UI: shop/inventory are dashboard sections (per existing "feature entry =
dashboard section" convention), not nav-bar links. Components colocate under
`src/components/shop/` and `src/components/inventory/`.

## Deferred decisions (not yet needed)

- Whether `powerups/registry.ts` self-registers via file imports or needs an
  explicit manifest array — wait until there are 3+ real powerups before
  picking; an explicit array is more honest about what exists until then.
- Exact points-per-action earning formula / paperclip valuation — depends on
  actual gameplay data, not an architecture question.
- Priority tier ordering between specific powerup pairs — decide per pairing
  as powerups are actually built, not up front.
