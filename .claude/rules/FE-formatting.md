---
lastUpdated: 2026-09-15T00:00:00Z
paths:
  - 'src/**/*'
  - 'supabase/functions/**/*'
---

# Formatting

**Owns when and how the formatter runs** — `vp fmt` is the project's one formatter for both `src/`
and the Deno edge functions; nothing else reformats these trees. Reaches you on every file you
create or edit.

## Running it

- **Run `vp fmt <path>` on every file you create or edit, before reporting the work as done.** One
  path costs ~700ms — never skip it.
- **Always name the paths; never run a bare `vp fmt`.** The committed tree carries files the
  formatter disagrees with — `vp fmt --list-different` lists 6 on `master` today — so a whole-tree
  run rewrites files outside your diff and sweeps that churn into your PR. It also reaches into
  sibling worktrees under `.claude/worktrees/`, which `.git/info/exclude` hides from git but not from
  the formatter.
- **Run `vp fmt <path>` yourself rather than relying on the `PostToolUse` hook alone** — the hook in
  `.claude/settings.json` re-formats touched files automatically, but running it yourself surfaces
  any errors immediately and keeps the working tree clean between turns.
- **Format Deno edge code under `supabase/functions/` with `vp fmt`, never `deno fmt`.** Those files
  carry a `deno.json` fmt block, but the repo standardises on one formatter — running `deno fmt`
  produces drift the next `vp fmt` undoes, polluting diffs. `deno check` / `deno test` remain the
  right tools for type-checking and running Deno tests; this rule is only about formatting.
  </content>
