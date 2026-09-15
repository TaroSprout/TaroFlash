---
lastUpdated: 2026-08-08T00:00:00Z
paths:
  - '.claude/skills/**/*.md'
---

# Skill authoring

**Owns `SKILL.md` shape** — its frontmatter contract and how its description routes a user's
phrasing to it. Reaches you editing a file under `.claude/skills/`. An agent definition in
`.claude/agents/` is [`harness-author`](../agents/harness-author.md)'s to write but isn't a skill and
carries no frontmatter contract of its own — this file's rules don't reach it.

## Declare arguments in frontmatter

Every `.claude/skills/<name>/SKILL.md` declares the arguments it accepts in **two** frontmatter keys:

- `arguments:` — each supported flag or positional, with a one-line description
- `argument-hint:` — the short usage string the slash-command picker surfaces (e.g. `[--split] [--no-watch]`)
- A skill taking no arguments still carries both keys, empty, so the contract is explicit.
- **Update both keys in the same edit as the prose that adds a flag** — the picker reads
  `argument-hint`, so omitting it hides the flag entirely.
- The body's `## Args` section stays the place for full prose and examples; frontmatter is the
  machine-readable summary.

## Keep the description trigger-shaped

- **State what the skill does, then the trigger phrases** — `Trigger on \`/x\`, "do the thing", "…"`.
- When two skills could plausibly match a phrase, each says which one wins and why.
