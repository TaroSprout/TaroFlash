---
name: blueprint
description: >-
  Companion to /architect. Where Architect designs the ideal shape laundered of the current file
  layout, Blueprint puts the real codebase back in: it answers one question — when this
  architecture is code-complete, what does it look like in THIS codebase? Plans the target state,
  publishes it as a reviewable artifact, iterates on the user's inline comments over a few rounds,
  then — on explicit go — cuts the board tickets that carry the plan into the Backlog pipeline.
  Guideline fidelity, never a skeleton: it fixes where each piece lives and the constraint that
  forces it there, the contract it owes its neighbors, the delta from what exists today, and —
  pre-bound to the exact places they bite — the project's own house-style and authoring rules, so
  the builder isn't relying on the harness to surface the right rule at the right moment. One
  shippable end state, not a sequence of steps; sequencing is deliberately left to a later pass.
  Architect-aware (consumes an Architect handoff) and standalone-capable (confirms a target shape
  itself). Read-only on source throughout — its only writes are the review artifact and, gated on
  the user's go, board tickets. Trigger on /blueprint, "blueprint this", "how does this look
  code-complete", "map this onto the codebase", "ground this architecture". User-invoked only.
argument-hint: '[the target — an Architect shape to ground, a feature to blueprint, or nothing to use the prior turn's Architect output]'
arguments:
  - name: '[target]'
    description: Optional free-text naming the target to blueprint. Omit to use the prior turn's Architect output, or to be asked.
allowed-tools: Read, Grep, Glob, Bash, Agent, Artifact
lastUpdated: 2026-09-10T00:00:00Z
---

# Blueprint

Take a target architecture and answer the one question a builder actually needs answered before
starting: **when this is code-complete, what does it look like in _this_ codebase?** Architect
designs the ideal shape with the file layout deliberately stripped out; Blueprint is the mirror —
it puts the real codebase back in at full fidelity, resolving the laundered shape onto concrete
paths, layers, and contracts, and pre-binding the project's own rules to the places they apply.

The plan lands as a **reviewable artifact**, not a chat report that ends the run. The user marks it
up in place — inline comments, highlights, answers to open questions — over a few rounds, and only
once they're satisfied does Blueprint cut the board tickets that carry the plan forward.

```
pin target + scope → ⛔ sign-off → read codebase + house rules → map · bind · reconcile
  → publish plan as artifact → ⟲ review rounds (user marks up, blueprint republishes) → ⛔ satisfied
  → cut tickets via ticket-author (Backlog) → stop
```

## The stance that defines it

A builder heads-down inside one file sees local state and reaches for the local solution. Blueprint
is the orientation they can't get from in there: it already knows this piece has to sit on the global
stage because of a constraint three files away, that these strings cross an i18n boundary, that this
function will grow past the split threshold — and it says so **without dictating how the code gets
written**. Implementation always surfaces things nobody foresaw; a guide survives that, a skeleton
doesn't. So Blueprint fixes **placement, contract, and constraint** and leaves **implementation open**.

## What this skill produces

A single plan, **guideline fidelity — never literal signatures, type defs, or skeletons.** Per
region of the target:

1. **Placement & the constraint that forces it.** Where the piece lives — layer, scope, path — and
   _why it has to_ live there: "global, because two unrelated views consume it"; "colocated in the
   view, because nothing else touches it." This is the decision that's invisible from inside the file,
   and it is the highest-value thing in the blueprint. State the constraint, not just the location.
2. **Responsibility & contract, in prose.** What the piece is for, what it owes its neighbors (the
   surface they depend on), what state or data it owns. Described, not declared — no signatures.
3. **The delta & the boundary.** Current files → target as a _map_: what's created, what's gutted /
   split / absorbed / renamed / deleted, and — just as important — **what stays untouched.** The
   boundary of the change is part of the spec; a builder needs to know where to stop as much as where
   to work.
4. **House rules, pre-bound to where they bite.** The specific style and authoring rules this project
   already carries, attached to the exact region they govern — "this function crosses the size
   threshold, plan the split"; "these strings go through i18n"; "this branch earns a comment per the
   comment rule"; "colocate, don't globalize." Not a generic checklist at the end — bound in place, so
   the builder meets the rule where it applies rather than depending on the harness to surface it at
   the right moment. (How these are discovered: Phase 2.)
5. **Reality conflicts.** Where the target shape — designed blind by Architect, or described from
   intent — collides with what's actually on the ground: a store that already does this, a shared type
   it should reuse instead of reinventing, a constraint it can't satisfy as drawn. This is the one place
   Blueprint pushes back on the shape, because it is the first pass that actually reads the codebase.

Density is the point. A region that's a new leaf file with an obvious home gets a line; a region
carrying a load-bearing constraint or a real conflict gets the room it needs. **No sequence, no
"do this first", no effort estimates** — that is a different skill's job, and it stays out of the
tickets too (§ Cutting tickets).

## Input

One optional free-text argument naming **the target to blueprint**. Three ways it resolves, and the
skill detects which:

- **Architect handoff present** (the prior turn produced an Architect reframe/verdict, or the user
  pastes one) → that laundered shape _is_ the target. Blueprint does the half Architect refused:
  ground it. This is the intended primary path.
- **A feature or subject named, no Architect run** → Blueprint is standalone. Pin the target shape
  itself — from the user's description plus a read of any existing fragments — with the same
  completeness bar Architect's reconstruction uses, then ground it. Don't silently skip the shape
  work; a thin target yields a thin blueprint.
- **Nothing given** → use the prior turn's Architect output if there is one; otherwise ask what to
  blueprint rather than guessing.

Echo the resolved target, the mode (handoff / standalone), and the rough scope in one line before
anything else, so the user can re-scope.

Everything runs on the default model; a large grounding read may fan out (Phase 2).

## Phase 1 — Pin the target + scope, then get sign-off

**Blueprint grounds a target; it must be certain what the target is.** In handoff mode the target shape
is already the approved Architect output — restate it in one tight paragraph and name the scope (the
directories and layers the build will touch) so the user can correct the footprint. In standalone mode,
do the shape work: state what the feature is, its essential pieces and the behavior it must cover, at a
level complete enough that the mapping won't have holes — surfacing any genuinely-undecided point as an
open question rather than resolving it silently.

Either way, also pin **scope**: which parts of the codebase this touches and, explicitly, which it does
_not_. The boundary is load-bearing — it's what keeps the blueprint from sprawling.

**Sign-off gate (blocking).** Print the target restatement + the scope boundary as a short summary and
**stop**. Nothing is read in depth and nothing is produced until the user approves it: a blueprint of the
wrong target, or the wrong footprint, wastes the whole pass. Apply corrections and re-print if material;
otherwise proceed.

## Phase 2 — Ground it: read the codebase and its house rules

Two reads, both real, done together. For a large scope this can fan out to parallel readers, each over
a slice of the tree; the synthesis stays with the orchestrator.

**Read the code that the target lands in.** The files that get created near, changed, absorbed, or left
untouched — enough to know the current decomposition, who owns which state today, the seams the target
must meet, and what already exists that the target might duplicate. This is what makes placement calls
and reality conflicts real rather than guessed.

**Read the project's own rules — this is what makes the house-rule binding work, and what keeps a global
skill project-aware.** Discover the rules the codebase already carries and would otherwise surface only
once a builder is inside a matching file:

- `CLAUDE.md` / `AGENTS.md` / `README`, and any `docs/` or rules directory (e.g. `.claude/rules/*.md`,
  including path-scoped ones whose triggers match the scope).
- Lint / format / type configuration that encodes a real constraint.
- 1–2 sibling parts of the codebase _outside_ the target, as exemplars of the house granularity,
  state-ownership idioms, and layering — the same way you'd learn a codebase's taste by reading its
  neighbors.

Extract from these the rules that will actually bite this build — module splitting, function-size
limits, colocation-vs-globalization, comment authoring, i18n/string handling, naming, whatever the
project enforces — so Phase 3 can bind each to the region it governs. **In a repo with no such rules,
degrade to general good practice; never invent a rule the project doesn't hold.**

## Phase 3 — Map, bind, reconcile

Resolve the target shape onto the ground:

- **Map** every piece of the target to a concrete home, and state the constraint behind each non-obvious
  placement. Render the delta from what exists today as a map, and name the untouched boundary.
- **Bind** each applicable house rule to the region it governs, in place.
- **Reconcile** the target against what you read: where it duplicates, collides with, or can't fit the
  existing code, surface it as a reality conflict and say what the target should do instead — reuse this,
  extend that, adjust the seam. Where a conflict changes the shape materially, flag it plainly; the user
  may want to loop back to Architect.

Do not invent structure the target didn't call for, and do not smuggle in a sequence. If the target has
genuine gaps (a state nobody specified, a behavior left open), list them as open questions rather than
papering over them.

## Phase 4 — Publish the plan as the artifact

The plan's standard output is the artifact, not a chat report. **`cp` the cached template at
[`assets/blueprint-artifact-template.html`](assets/blueprint-artifact-template.html) into the
scratchpad, then fill it with `Edit`, never `Write`.** The copy's style block and script — together
the bulk of the file — carry the full design system and self-contained review layer and never
change between runs; `Edit` can only land a diff against the marked `{{TOKENS}}` and FILL-marked
spans, so the fixed boilerplate can't get re-authored by construction. Publish the edited copy's
contents with the `Artifact` tool. The plan fills the template's regions:

1. **Hub — the verdict.** A plain proposed-architecture paragraph, then the call and ≤5 ranked moves
   (each linking its chapter), then the open questions. The hub is the whole plan at a glance — a
   reader can stop there and know the shape.
2. **Chapters — one per heavy region.** Each leads with its placement + the constraint that forces
   it, then folds detail beneath by facet. Group by region of the target, not file-system order.
3. **Linked topics — say-once.** A rule or constraint that recurs lives once as a topic and is
   pointed at; never restated per region.
4. **Decisions.** Open questions + assumptions become the `ch-open` chapter's answer boxes.

Structural rules the template encodes and this run must respect:

- **Hub reads as a verdict**, not a link box: proposed architecture → call + moves → open questions.
- **Heavy vs light.** A heavy region gets its own chapter, opened in the dialog (prev/next follows
  document order). A light region gets a move line only — no chapter.
- **A chapter leads with its forcing constraint;** detail folds beneath by facet — **Contract /
  Delta / Conflict.** Delta names the untouched boundary; add the `clash` Conflict fold only where
  the shape gives way to existing code. A recurring house rule binds to its region as a margin
  annotation (`.mrule`), not a full-flow block.
- **`Today → Change` is an optional tool** — use it on concrete element chapters, drop it on
  conceptual ones (plain `.prose`). Don't stack frame + box + folds by rote; every region carries
  real prose.
- **Boxes are earned and sparing;** keep the editorial register (restrained cards + shadow), not
  austere-flat. Plain framing headers, never clever titles.
- **Colour = meaning** — one reserved accent for a Conflict, one open-decision mark (hollow→filled).
  Reuse it; don't recolour.
- **Auto-wired from structure** — the moves' marks, the contents and prev/next order, the answer
  boxes, and the single export all generate from the markup. Author content only; never hand-write
  the machinery.
- **One hub, one export** — every view stays in the document (a chapter is moved into the dialog and
  back, never out), so the one export gathers all of them.
- **Labels a reader sees are copy** — get sign-off (→[K:user-copy-signoff]); artifact chrome is not
  app code, so no i18n.

No sequence, no fixes-ordering, no estimates anywhere in the artifact. Improve the template file
itself as the format gains features, rather than re-deriving a one-off page per run.

## Phase 5 — Review rounds

The user reviews **in the artifact** — inline comments on any block, text-selection highlights,
answers in the open-question boxes — then clicks **Export** and pastes the resulting markdown notes
back into chat. Blueprint:

1. Reads the pasted notes and applies them: revise placements, resolve open questions, fold in new
   reality conflicts, adjust regions.
2. Re-fills the same template tokens and republishes with `Artifact`, **updating the same artifact in
   place** — never a new one; the user is tracking one URL across rounds.
3. Waits. This repeats a few rounds, however many the user needs.

Do not cut tickets on any round short of the user explicitly saying they're satisfied — a pause or
silence is still open, not consent, same discipline `/groom` holds during its own review loop.

## Phase 6 — Cut tickets (gated)

Only once the user has signalled satisfaction with the artifact. Blueprint **captures and cuts**, the
same discipline `/groom`'s split step applies but earlier in the pipeline — it does not groom the
tickets it cuts; they still ride the normal `/backlog` → `/triage` → `/groom` pipeline afterward.

- **Granularity — Blueprint decides.** Group the artifact's regions into the smallest
  independently-verifiable tickets it can (one or more), the same split floor `/groom` uses: each
  ticket must be something a reviewer can confirm works on its own once it lands.
- **Blueprint wires the `Blocked By` graph across the siblings it cuts.** Set `Blocked By` — never
  `Blocks`; Notion fills that reciprocal relation on its own — on each dependent ticket, naming every
  sibling it depends on (→[K:ticket-dependencies]). This is a second deliberate exception to `/groom`
  normally owning dependency wiring, justified the same way as writing `## Tech details` at cut: the
  artifact rounds already settled the split and its build ordering, so the graph is known at cut;
  `/groom` verifies and refines it rather than building it from scratch. A one-line rationale naming
  why a sibling is blocked may still ride that sibling's `## Tech details` as documentation, but the
  relation itself is wired at cut, not deferred as an instruction for `/groom` to act on.
- **Fields at cut** — follow [`ticket-authoring.md`](../../rules/ticket-authoring.md)'s cut rule
  exactly: `Status = Backlog`, `Assignee` empty, `Priority` empty, `Target` empty, `Type` set only
  when the kind is obvious. **Never `Ready`, never `Needs More Info`** — the artifact rounds resolved
  the _design_, not the board classification; that's `/backlog` and `/triage`'s pass, not this one.
- **Body — cut-time only.** `## Product description` (product terms, 1–3 lines) naming what the
  ticket delivers, plus `## Tech details` carrying the resolved placement/contract/constraint/
  house-rules encoding for that ticket's regions, plus `## Open questions` for anything the artifact
  rounds left genuinely unresolved. **This is a deliberate exception to**
  [`ticket-authoring.md`](../../rules/ticket-authoring.md)'s section-owner table, which assigns
  `## Tech details` to `/groom`: the artifact review rounds already settled this design with the
  user, so the encoding is durable-worthy at cut, and since the artifact itself is ephemeral — a
  per-viewer review surface, never a spec-of-record — the ticket body is its only durable home.
  `/groom` **refines** this `## Tech details`, it does not regenerate it from scratch. Never
  pre-written `## Acceptance criteria` — that's triage's to write from the product description; a cut
  ticket doesn't smuggle in a groomed shape it hasn't earned.
- **Epic** — attach to an existing Epic Board epic when one fits ([`task-board-schema.md`](../../rules/task-board-schema.md)
  for the data source). If nothing fits, **propose** a new epic (one-line scope, per
  [`ticket-authoring.md` → New epics](../../rules/ticket-authoring.md#new-epics)) and only create it
  on the user's explicit approval — a second, separate gate from the ticket-cut go.
- **Delegate the writes.** Blueprint never writes Notion directly — hand the grouped tickets, the
  full dependency graph (which ticket blocks which), and, if approved, the new epic to the
  `ticket-author` agent ([`.claude/agents/ticket-author.md`](../../agents/ticket-author.md)), the
  project's single board-writer. It creates every sibling first to get their page IDs, then sets each
  dependent ticket's `Blocked By` to the tickets it depends on. It re-fetches and confirms each
  write — tickets and relations alike — landed before reporting (→[K:notion-write-verification]) —
  relay that confirmation, don't re-derive it.

## Guardrails

- **Read-only on source, always.** Never edit, format, lint, test, commit, or open a PR against the
  codebase. Its only writes are the review artifact (Phase 4–5) and, gated, board tickets and a new
  epic (Phase 6).
- **Never cut tickets before the user is satisfied with the artifact.** A review round in progress —
  even one with no open comments left — is not a go; wait for the explicit signal.
- **Never create an epic without the user's approval**, separate from the ticket-cut go. Propose,
  don't assume.
- **Never sequence.** No "do this first", no phases, no order of operations, no effort or time
  estimates anywhere — plan or ticket. Sequencing is a deliberately separate concern.
- **Never emit literal signatures, type definitions, or code skeletons.** Guideline fidelity only:
  placement, contract, constraint. Implementation stays the builder's.
- **Never blueprint before Phase-1 sign-off.** A wrong target or footprint wastes the pass.
- **Never invent a house rule the project doesn't hold**, and never bind a rule to a region it doesn't
  govern. Bind only what you actually read out of the project's own rules.
- **A placement call needs its constraint.** "This goes global" without the reason it must is a guess;
  state what forces it, or don't assert it.
- **Reality conflicts are evidenced from the code you read**, not from a guess about how it behaves. If
  you can't confirm the collision against the real code, label it a suspicion or drop it.
- Brevity > completeness. The plan is a builder's orientation, not a transcript of everything read.

## When NOT to invoke

- A single-file or trivial change — the placement is obvious; just build it.
- The target shape is still genuinely unsettled — run `/architect` first; Blueprint grounds a shape, it
  doesn't design one.
- No target named and no prior Architect output — ask what to blueprint rather than guessing.
- User-invoked only; never auto-trigger after a design pass or a commit.
