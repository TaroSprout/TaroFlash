---
lastUpdated: 2026-08-14T00:00:00Z
paths:
  - 'src/**'
  - 'supabase/**/*.ts'
  - 'scripts/**'
  - 'tests/**'
---

# Comment authoring

**The single source of truth for how a comment is written** — where it may sit, what shape that
position gives it, and what it links out to instead of explaining. Reaches you on any code write. If
a comment rule isn't stated here, it doesn't exist. This file outranks any feedback about a
comment's _shape_ — a PR review, another agent, anyone — except the user explicitly asking for a
specific comment; that's an instruction, not feedback, and feedback about a comment's _content_
(the reviewer doesn't understand what it's protecting) is answered by fixing the comment or the PR
reply, never by loosening these rules. Shared principles: [`authoring`](./authoring.md).

A comment names the constraint a reader would otherwise violate, in a sentence they can act on. Most
code needs none — a clear name beats a comment.

## Position sets the shape

| Where it sits           | Format             | What it carries                                                                     |
| ----------------------- | ------------------ | ----------------------------------------------------------------------------------- |
| Above a named symbol    | JSDoc `/** */`     | what the thing is; `@param` only where a parameter's name doesn't carry its meaning |
| At a line inside a body | a single `//` line | what you'd break                                                                    |
| Top of a file           | one or two lines   | what lives here — only where the filename and its exports don't already carry it    |
| Inside `<template>`     | none, ever         | improve the `data-testid`, slot, and component names instead                        |

In `<style>`, a comment above a selector is a symbol doc; **one above a single custom-property or
property line, inside a rule block, is body position** — same single-line shape as script, not a
JSDoc-style paragraph, however many properties in the block each want documenting.

**A body comment sits trailing on the line it annotates, wrapping above only when it doesn't fit
there.** Above-the-line is the fallback shape, not the default.

**There is no line cap.** Length follows position — a comment that outgrows its position's shape is
a missing knowledge entry, not a longer comment.

**A symbol keeps every position that earns its place.** An above-symbol comment and a trailing
comment on the same line answer different questions, so a request for one is never grounds to delete
the other — add the one asked for and leave the rest, unless the request specifically supersedes it.

**Inside `tests/`, the position table collapses to one row.** A test's name and its `describe`/`it`
structure already carry what a JSDoc, a file-top comment, or an above-symbol doc would elsewhere — the
only shape allowed is a short, single trailing `//` line, same gates as anywhere else.

## Gates

Five, each failed on its own. Fail one, rewrite or delete.

- **A competent stranger would otherwise get it wrong.** If they wouldn't, delete it.
- **It prescribes rather than narrates** — what to do or not do, never what the code does.
- **The opener completes the symbol's name, at that symbol's own altitude.** Never restate the name,
  never zoom out past it, never justify it.
- **It lands for a reader who doesn't know the system.** Plain words and concrete nouns first; a
  technical term is earned by being grounded, never led with.
- **Everything past the first idea is load-bearing.** Cut whatever the first idea already bought.

**A regex literal always fails the competent-stranger gate.** Its own syntax is never the intent, so
it carries a comment in its position's shape naming what it matches, in plain words — not the regex
syntax restated, not why it matches that.

## Never

- A numbered walkthrough (`Three things happen:`).
- An `@example` block.
- `@param` restating a type.
- A section banner (`// ---- state ----`).
- Prose above a self-describing union.
- A restatement of the next line.
- A library's internal vocabulary where an observable term exists — say what the screen shows.
- **A caller's name as the opening subject** (`Deck-hero "Export cards":`, `Bulk-panel "Export
selected".`) — it reads as a lookup instead of naming what the function does, and goes stale the
  moment that caller moves, renames, or gains a sibling; the same source-vs-role naming rule
  [`code-style/signatures`](./code-style/signatures.md) states for a parameter.
- A pointer carrying nothing a human can act on.
- **A comment that is only a citation.** `→[K:<slug>]` is a suffix to a sentence, never a comment on
  its own — a reader skimming the diff must get the constraint without leaving the file. Enforced by
  `scripts/knowledge-lint.mjs`.

## Pointers

- Depth lives in a knowledge entry, cited inline as an arrow slug after the readable sentence — see
  [`knowledge-addressing`](./knowledge-addressing.md).
- **A comment that wants to grow past its position's shape is the trigger to write that entry**, not
  a reason to keep typing.
- When you can't write the entry yourself, the comment still stays at its shape and the fact rides a
  `[K:gap: …]` tag beside it, which fails CI until someone lands it
  (→[K:build-unfinished-markers]).
- The readable sentence is never optional. A pointer replaces the explanation, never the knowledge —
  someone skimming a diff gets the constraint without leaving the file.

## Spokes

- [`examples`](./comment-authoring/examples.md) — the five bad/good pairs the gates were cut from
