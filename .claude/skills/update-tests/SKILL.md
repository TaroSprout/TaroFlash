---
name: update-tests
description: Mine the current conversation for cross-cutting test obligations, then dispatch the `test-author` subagent to handle diff/coverage-driven tests + the obligations.
allowed-tools: Read, Glob, Grep, Agent
arguments:
  - name: additional-context
    type: string
    description: Optional context to help understand the changes
argument-hint: '[additional-context]'
lastUpdated: 2026-05-17T00:00:00Z
---

The main thread runs **only** the obligation-mining step below. The subagent has none of this conversation in its context, so the cross-cutting tests that depend on it must be discovered here and passed in explicitly. Everything mechanical (coverage baseline, diff, type selection, writing, validation, re-measure, report) happens inside the subagent.

## Step A — Mine the conversation for test obligations

When the skill is invoked mid-session, the conversation carries the _why_ behind the changes — invariants, race conditions, edge-case guards, bugs found and fixed. The diff alone never reveals these. Walk the conversation and build a short list of **test obligations** the subagent must satisfy in addition to whatever diff/coverage analysis surfaces.

Mine for:

- **Verbal invariants** agreed mid-session but not encoded as a comment (e.g. "member id is sourced from the session, not the profile query, to avoid an auth-restore race" → assertion that `.id` is defined the moment the session restores, regardless of the profile query's state).
- **Edge-case guards with a stated reason** — `if (!x) return` added because `x` could be undefined in a known scenario → cover that scenario.
- **Invalidation / state-flow contracts** — which query keys a mutation invalidates, what cross-cutting fields (debounce keys, deck_id, etc.) are required on the wire, what happens when they're absent.
- **Bugs found and fixed mid-session** — the failing case is a guaranteed-valuable regression test; preserve it before moving on.
- **`$ARGUMENTS`** — if non-empty, fold the user's additional context into the obligation list.
- **Memory entries** — scan `memory/MEMORY.md` for project decisions relevant to the changed files (paradigm choices, topology rules, etc.) and add any that map to a missing test.

Each obligation is one line: a concrete behaviour to assert, plus a one-phrase rationale. Aim for high signal — only include obligations that the subagent, reading the diff cold, would plausibly miss.

If invoked cold on an already-merged branch with no session context and no `$ARGUMENTS`, the list may be empty. That's fine — the subagent still runs and handles diff/coverage scope alone.

## Step B — Dispatch the `test-author` subagent

Spawn the subagent with the obligation list + `$ARGUMENTS` in the prompt. The subagent reads `AGENT_PROMPT.md` (sibling file) for the full workflow.

```
Agent({
  subagent_type: "test-author",
  description: "update-tests run",
  prompt: `Read .claude/skills/update-tests/AGENT_PROMPT.md and execute it end-to-end.

Cross-cutting test obligations from the orchestrating conversation (treat as mandatory; satisfy each one in addition to whatever the diff/coverage scope surfaces):

<bulleted list from Step A, or "None — no session context.">

Additional context from \$ARGUMENTS: <verbatim $ARGUMENTS, or "None.">

Return the final report defined in the workflow's Step 8.`
})
```

## Step C — Relay the report

Print the subagent's final report back to the user verbatim. Don't re-run the workflow, don't summarise, don't second-guess coverage numbers. If the subagent surfaced a suspected source bug or asked a clarifying question, forward that to the user and wait.
