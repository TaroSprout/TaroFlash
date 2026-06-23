---
name: update-tests
description: Mine the current conversation for cross-cutting test obligations, then dispatch the `test-author` subagent to handle diff/coverage-driven tests + the obligations.
allowed-tools: Read, Glob, Grep, Agent, Bash
arguments:
  - name: additional-context
    type: string
    description: Optional context to help understand the changes
argument-hint: '[additional-context]'
lastUpdated: 2026-06-23T00:00:00Z
---

The main thread runs **only** the obligation-mining step below. The subagent has none of this conversation in its context, so the cross-cutting tests that depend on it must be discovered here and passed in explicitly. Everything mechanical (scoped per-file coverage of touched files, diff, type selection, writing, validation, re-measure, report) happens inside the subagent. The subagent measures coverage **only for touched files** and targets ~90% lines each — it does not run the full suite or baseline against master.

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

Return the final report defined in the workflow's Step 8. Do NOT commit anything — leave every new and modified test file uncommitted in the working tree for the orchestrator to review and commit.`
})
```

## Step C — Review, decide, commit

The subagent returns its report and leaves all test changes **uncommitted** in the working tree. You own the decision of whether coverage is sufficient and the responsibility for committing it. Time-box the whole skill run — initial dispatch, your review, and at most **one** focused re-dispatch — to **~10 minutes**. Favour a single targeted re-dispatch over an open-ended loop; if gaps remain after one, commit what's solid and report the rest rather than iterating.

### Review the report against reality — don't take it at face value

The subagent works from a cold diff and can mis-scope or over-claim. Cross-check before trusting it:

1. **Scope completeness.** Run `git diff master...HEAD --name-only -- src/ supabase/` and `git status --short -- src/` yourself, and compare against the report's coverage table. A file the subagent claims "wasn't in the diff" but that actually appears here is a **missed obligation, not a scope decision** — this is the most common and most damaging failure. Every changed source file must be accounted for (covered, or an explicit justified deferral).
2. **Obligations.** Every Step-A obligation must appear under "Obligations satisfied" with a ✅. Any ❌ or silent omission is a gap to close.
3. **No collateral breakage.** The branch's own source changes can have broken existing test files the subagent never ran (it scopes to "touched files" and may not realise an untouched test exercises touched source). A composable that gained a new query dependency, for instance, throws `getActivePinia()` in every pre-existing test until its harness mocks the new hook; a barrel that now re-exports a heavier module makes every partial `vi.mock` of that barrel's transitive deps fail the ESM named-export check.
4. **Coverage floor.** Touched files should be ~90% lines; note any genuine deferrals.

### Mandatory final gate — run the FULL suite

Before you commit, run the **entire** suite, not just the touched/mirror files:

```
vp test --no-coverage
```

This is non-negotiable. The subagent only ever runs touched-file scope, so collateral breakage in **untouched** test files is invisible to it — and that is the single most common reason these PRs fail CI (it happens on nearly every move/barrel/mock-shape change). The mirror-file check in item 3 is necessary but **not sufficient**: a file-move or barrel-widening refactor breaks tests that don't mirror any touched source at all (e.g. a sibling feature whose `vi.mock('@/some/barrel')` is now missing a newly-transitive export). Only a full run catches those.

If the full suite is red:

- Fix the failures yourself when they're mechanical (repoint a moved import, add the missing export to a `vi.mock` factory, mock the barrel the source now imports instead of the old deep path). These are review fixes, not new authoring — keep them in the test commit.
- Re-dispatch the subagent only if the failures reveal a genuine missing-coverage gap, not just a broken harness.
- Do **not** commit until `vp test --no-coverage` is fully green. A green touched-file scope with a red full suite is a failed run.

### Decide

- **Gaps found, closable quickly** → re-dispatch the subagent with a _focused_ prompt naming exactly the files and obligations still uncovered. It has no memory of the first run, so restate the relevant obligations and conventions. One re-dispatch max within the budget.
- **Coverage is sufficient** (or the budget is spent and what exists is solid) → commit.

### Commit

Once satisfied, **you** commit — the subagent never does:

- `vp fmt` the new/changed test files, then commit them as `test(<scope>): <summary>`.
- If the subagent surfaced a suspected source bug and the user confirmed it, apply and commit the fix as a separate `fix(<scope>):` commit.

Then give the user a short summary: what was covered, any obligations left unmet, and any deferred gaps — you don't need to dump the full report verbatim.
