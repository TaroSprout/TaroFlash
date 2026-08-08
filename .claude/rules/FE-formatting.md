---
lastUpdated: 2026-04-25T19:03:21Z
paths:
  - 'src/**/*'
  - 'supabase/functions/**/*'
---

# Formatting

Run `vp fmt` on every file you create or edit, before reporting the work as done.

`vp fmt <path>` formats a single file in ~700ms; `vp fmt` re-checks the whole tree in ~3s. Either is fine — never skip.

**Why:** the project uses one formatter (`vp fmt`, the oxfmt-backed pass inside Vite+). Files that drift from its rules cause unrelated whitespace changes the next time anyone runs the formatter, polluting diffs and forcing reviewers to mentally filter noise.

A `PostToolUse` hook in `.claude/settings.json` re-formats touched files automatically, but treat it as a safety net — running `vp fmt` yourself surfaces any errors immediately and keeps the working tree clean between turns.

**This includes `supabase/functions/**` Deno edge code.** Those files carry a `deno.json` fmt block, but the repo standardises on one formatter — running `deno fmt` produces drift the next `vp fmt` undoes, polluting diffs. `deno check` / `deno test` remain the right tools for type-checking and running Deno tests; the rule is only about formatting.
