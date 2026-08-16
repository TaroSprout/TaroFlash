---
lastUpdated: 2026-08-09T00:00:00Z
paths:
  - 'src/**/*'
  - 'supabase/functions/**/*'
---

# Formatting

**Owns when and how the formatter runs** — `vp fmt` is the project's one formatter for both `src/`
and the Deno edge functions; nothing else reformats these trees. Reaches you on every file you
create or edit.

Run `vp fmt <path>` on every file you create or edit, before reporting the work as done. One path costs ~700ms — never skip it.

**Always name the paths; never run a bare `vp fmt`.** The committed tree carries files the formatter disagrees with — `vp fmt --list-different` lists 6 on `master` today — so a whole-tree run rewrites files outside your diff and sweeps that churn into your PR. It also reaches into sibling worktrees under `.claude/worktrees/`, which `.git/info/exclude` hides from git but not from the formatter.

A `PostToolUse` hook in `.claude/settings.json` re-formats touched files automatically, but treat it as a safety net — running `vp fmt <path>` yourself surfaces any errors immediately and keeps the working tree clean between turns.

**This includes Deno edge code under `supabase/functions/`.** Those files carry a `deno.json` fmt block, but the repo standardises on one formatter — running `deno fmt` produces drift the next `vp fmt` undoes, polluting diffs. `deno check` / `deno test` remain the right tools for type-checking and running Deno tests; the rule is only about formatting.
