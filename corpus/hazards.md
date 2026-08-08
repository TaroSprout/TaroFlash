# Hazards

Every known **system hole** across the corpus, gathered in one place. A hazard is
somewhere the obvious assumption is quietly wrong and it costs you.

> **Generated — do not hand-edit.** Built from every topic with `hazard: true` in
> its frontmatter. To add or change an entry, edit the topic; to review before
> touching an area, read this. See [CONTRIBUTING → Hazards](./CONTRIBUTING.md#hazards).

Roughly ordered by blast radius — data loss and silent corruption first, design
ceilings and footguns last.

---

### A failed review save is silently abandoned

**[[study]]** · study

A card is marked reviewed locally the instant it's rated — before the async save
runs. If the save fails, the card is already logged as done; the offered "refresh"
rebuilds it as already-reviewed and never retries. The review is lost and the
card's server schedule stays stale.

### The stall-reaper strands healthy long-running jobs

**[[audio-generation]]** · media

A stuck job and a slow-but-alive job look identical. The 10-minute sweep that
rescues genuinely-dead chains also reaps a step that legitimately runs long — and
its late write lands on an already-`failed` row the chain trigger won't re-fire,
stranding completed work. (Retry must also clear the half-built transcript, or
transcription appends onto it.)

### Card ordering integrity lives in RPC discipline, not the schema

**[[cards]]** · cards

Sort keys are compared as text, and the database's default collation is
locale-aware — it reorders by case, so the server would sort keys differently
from the app that minted them. The column pins byte-order collation to prevent
it; nothing announces this, so a new ordering column or index added without the
same collation silently reintroduces the bug.

### The ownership stamp is empty under a backend job

**[[members]]** · members

Ownership is stamped from `auth.uid()`, which is NULL under the service-role
client (which also bypasses RLS). A privileged job's insert either fails loudly on
a NOT-NULL owner column, or silently lands an unreachable, orphaned row on a
nullable one — past the isolation wall that would have caught it.

### Widening a permission ripples everywhere

**[[permissions]]** · authz

Loosen one `can_` rule and every query leaning on the old, tighter rule silently
widens too — including ordinary screens you forgot were trusting it. A screen that
must stay narrow has to scope itself; the permission can't.

### A file lives or dies by its notes, not the bucket

**[[media]]** · media

The hourly cleanup treats any file with no live note pointing at it as garbage.
Delete a shared file directly and you break every other card using it; leave a
file in a media bucket untracked and the next sweep eats it.

### The client is the source of scheduling truth

**[[scheduling]]** · scheduling

FSRS runs on the device; the server only stores what the client computed and never
recomputes or checks it. A stale app, a different algorithm version, or two devices
reviewing the same card can quietly write schedules under different math — and the
database can't tell.

### A forgotten cache invalidation fails silent

**[[data-flow]]** · architecture

A write that succeeds but forgets to mark the right cache entry stale leaves the
screen showing old data — no error, no clue at the call site. The "callers never
touch the cache" convenience means drift has no guard but discipline.

### A pin that matches the preset silently detaches

**[[pacing]]** · pacing

A dial is "pinned" purely because its key is present in the override bag — value is
never compared to the preset. Pin a dial to the preset's own value and it looks
identical, but it has detached: later preset edits move every deck except that one.

### An out-of-set color renders bare, with no error

**[[theming]]** · theming

The color set is closed — the root reset wipes every default shade and re-adds only
curated ones. Reach for a color outside it (a leftover default class, a token typo)
and it resolves to nothing: no fallback, no warning, an element rendered bare.

### Public means read-only — the model holds one studier per card

**[[decks]]** · decks

"Public" grants read visibility only. Recording a review is gated to the card's
owner, and the progress table holds exactly one row per card platform-wide — so
there is nowhere to store a second viewer's study state. Shared study can't be
expressed in the current model.

### A submitted post is hidden until a moderator publishes it

**[[feedback]]** · feedback

Every fresh post starts held back and the wall shows only published ones — so "I
posted it, it's on the board" is quietly false, even to the author. The board is a
curated shortlist, not a raw inbox; nothing tells the member.
