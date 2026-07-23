# The Corpus

High-level **domain & system logic** for TaroFlash, in plain language — the
durable truths about how the system behaves, written once so both humans and
agents can rely on them.

This is **not** the reference docs (`docs/`). Those document _how the code
works_ — API signatures, composable internals, component props — at
implementation altitude. The corpus sits above that line: _what is true about
the system_, in domain words a non-engineer can follow.

The two never overlap. When a topic here needs a code detail, it links out to
`docs/` rather than restating it.

Its real job is not to list facts — it is to **make the non-obvious obvious**:
to surface the hazards, the silent assumptions, and the traps a reader would
otherwise only find by getting burned.

---

## Who maintains it: the Archivist

The Archivist keeps the corpus honest. Its charter, in tension on purpose:

- **Baseline action is to do nothing.** Most code changes touch no topic here.
  That is the expected outcome, not a failure. It is allergic to churn.
- **…except hazards, which it hunts.** Surfacing a system hole is the single
  most valuable thing the Archivist does, and the main exception to "do
  nothing." See [Hazards](#hazards).

### The altitude gate

The Archivist only acts when a change crosses the **domain / system line** — a
new invariant, a changed behavior, a retired concept, or a newly-exposed hazard.
This altitude _is_ the churn control; there is no line budget.

- Refactors, bugfixes, renames, component tweaks → **zero** corpus changes.
- A changed system invariant or a new hazard → **one** focused edit.

### Authority

- **Correct** — fix anything a change made false. Smallest edit that does it:
  change the stale line, not the section.
- **Add** — create a new topic only when a change introduces a genuinely new
  domain area with no existing home.
- **Clarify** — sharpen accurate-but-muddy text, but only for a genuine
  improvement: a topic that conflated two things gets split, a vague invariant
  gets stated precisely. Cosmetic rewording is not clarification. If you can't
  name what got clearer, don't touch it.
- **Elevate** — when a change exposes a hazard, surface it (add or promote a
  hazard block). This is the one place the Archivist is expected to be
  aggressive.
- **Never** — reword correct prose for taste, restructure for its own sake, add
  examples, or document implementation detail.

### Overflow — isolate, don't inline

When a real change is large (a new domain area, a topic splitting in two), the
Archivist makes it — but **isolated**: its own commit, scoped to `corpus/`,
never mixed into a code commit. You review or drop it as one unit.

---

## The shape

One **topic** per file — a subsystem you'd sit down to understand (Media,
Permissions), not a single atomic fact. A topic carries enough surrounding
context that any one idea in it is graspable without hunting elsewhere.

```
corpus/
  map.md                  root index — every topic, one line each
  hazards.md              generated — every topic tagged `hazard: true`, gathered
  <domain>/
    _map.md               domain index
    <topic-id>.md         one topic
```

### Topic frontmatter

```markdown
---
id: <stable-slug>     permanent deep-link handle; agents cite this, not the path
domain: <domain>
status: current       current | deprecated
hazard: false         true if this topic documents a system hole (see Hazards)
related: [<id>, <id>]
updated: YYYY-MM-DD
---
```

- **`id` is permanent.** Rename the file freely; never change a shipped `id` —
  it is the address agents and deep-links depend on.
- **`[[id]]` links** reference other topics by id. A link to an id that doesn't
  exist yet is fine — it marks a topic worth writing.

### Structure — loose, but with a spine

Not a rigid skeleton. The order that reads well and skims well:

1. **Standfirst** — one plain sentence: what this is, in domain words.
2. **Lead** — the mental model, in consumable beats (see Authoring).
3. **Hazard block(s)** — if the topic has a system hole, surfaced high, before
   the detail.
4. **Sections** — plain headings (no arbitrary numbering — numbers imply a rank
   that isn't real). Order by importance, not by sequence.
5. **What this isn't** — the boundaries, so topics don't bleed into each other.
6. **Related** — links to adjacent topics.

---

## Authoring — write for a reader who's deciding whether to keep reading

Every rule below was learned by watching a real reader bounce off a draft.

- **Open cold.** The top must land for someone who knows nothing — plain words,
  concrete nouns. _Earn_ technical terms by grounding them first; never lead
  with jargon. ("A little note that says 'this card uses that file'" before ever
  saying "reference index.")
- **One idea per beat, space between beats.** Break dense paragraphs into short
  lines and small lists. Whitespace is the primary tool; bullets are the backup.
  A wall of prose at a decision point loses the reader.
- **Declarative, present tense.** "Media moves through three states." Not "we
  decided to make media…". Fact first, context second or omitted.
- **Show, don't lecture.** A concrete walkthrough (the dashboard returns your 5
  decks, then every deck) beats an abstract statement of the rule.

### Callouts

A tinted, boxed aside. **A callout earns its box only by adding something the
prose doesn't** — never by restating it. A restating callout is pure noise; cut
it. Callouts interrupt prose one at a time where they bite; they never stack in
a row. Zero per section is common and fine.

Pick the type per topic from this fixed palette (consistent color = consistent
meaning):

| Type        | Source syntax | Color | Use for                                     |
| ----------- | ------------- | ----- | ------------------------------------------- |
| `Rule`      | `> [!RULE]`   | green | a hard constraint you'd otherwise get wrong |
| `Watch out` | `> [!WATCH]`  | amber | a gotcha or footgun in normal use           |
| `Note`      | `> [!NOTE]`   | teal  | a useful non-obvious aside                  |

Written as blockquote alerts; the interface renders each keyword to its styled
block. For a full-blown system hole, don't use a callout — use a **hazard
block** (`> [!HAZARD]`, see below).

### Diagrams

Diagram only what a picture genuinely beats a sentence at — flow, structure,
blast radius, before/after. Author it as **text** (Mermaid, or a plain HTML
table for before/after) so it stays diffable and an agent can update it. Zero
diagrams is the common case; one load-bearing diagram beats three decorative
ones. If a diagram would just re-draw a sentence, skip it.

---

## Hazards

A **hazard** is a place where the obvious assumption is quietly wrong and it
costs you. It is a different _class_ of thing than a fact or a rule, and it gets
elevated treatment so a reader — or an agent about to touch that area — cannot
miss it.

### The tell — how the Archivist finds them

- **A benefit whose flip-side is dangerous.** The property that makes something
  convenient is often the exact property that makes it a trap. (Capabilities let
  you "change a rule in one place" — which is _why_ widening one ripples into
  every query that leaned on it.) Whenever you write down a benefit, ask what its
  flip-side breaks.
- **A silent assumption.** Code that works only because something elsewhere
  stays a certain way, without saying so. When that thing moves, the code breaks
  quietly.
- **"Works in testing, wrong in production."** A shortcut that passes today
  because conditions happen to line up.

### How a hazard is presented

- A **hazard block** surfaced high in the topic (right after the lead, before
  the ordinary sections), stating the trap in one strong line + the flip-side
  framing + a link to the deep walkthrough.
- The topic's frontmatter sets **`hazard: true`**. The root **`hazards.md`** is
  generated from that tag — one place to review every known system hole across
  all domains. Never hand-maintain that index; tag the topic and let it gather.

### The Archivist actively hunts

On any domain-level change, the Archivist explicitly looks for benefit/flip-side
traps and silent-assumption breaks, and elevates what it finds. This overrides
"do nothing" — a surfaced hazard is worth the churn every time.

---

## How agents use the corpus

- **Planning** — read `map.md`, pull the relevant topics, plan within them.
  Check `hazards.md` for landmines in the area being touched.
- **Verifying an edit** — check the diff against the touched topic. A diff that
  contradicts a stated invariant is a bug. A diff that _changes_ one, or exposes
  a new hazard, is the Archivist's trigger to update the corpus.
