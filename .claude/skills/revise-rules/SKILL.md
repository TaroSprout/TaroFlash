---
name: revise-rules
description: Revise rule files under `.claude/rules/` and skill files under `.claude/skills/` so they stay accurate and consistent with the code — driven by `.claude/.last-updated.json`. This is a revision task, not a write-from-scratch one; flag drift, confirm with the user, then edit minimally.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
argument-hint: ''
arguments: []
lastUpdated: 2026-04-17T01:31:17Z
---

## Model

`.claude/.last-updated.json` holds a single ISO timestamp representing **when the rules + skills were last verified against the codebase**. Every run:

1. Enumerates every `src/` and `supabase/` change since that timestamp.
2. Reads every rule file and SKILL.md, **then re-scans the surface area each one actually governs** — not just the files that changed. A rule that forbids a pattern can drift even when nothing recent has touched the area it polices; the check has to sweep the full scope.
3. Flags inconsistencies to the user, applies confirmed fixes, and stamps what it touched.

The intent here is **revision, not authorship**. The skill does not invent new rules or new skills. It verifies existing ones, flags contradictions, and minimally edits.

## Rule scopes

Rules can declare a `paths:` array in their frontmatter to scope their claims to a subset of the codebase. Example:

```markdown
---
title: Use Vitest for Vue 3 Testing
paths:
  - 'tests/**/*'
---
```

When present, this skill treats `paths:` as the rule's source of truth — drift is verified by re-scanning those globs every run, not only by looking at what changed since the last sync. Rules without a `paths:` array are treated as repo-wide; the skill proposes a scope when the rule's content makes one obvious, and adds it in Step 5 once the user confirms.

The user has asked the skill to actively **maintain scope metadata**. Scope drift is itself a form of drift the skill should catch:

- **Missing** — rule has no `paths:` but the content points at an obvious subset of the tree.
- **Added** — rule's content references directories that are not covered by its current `paths:` (e.g. the pattern's reach has grown since the scope was written). Propose adding the new globs.
- **Removed** — `paths:` entries that no longer match anything in the current codebase (file renamed, directory gone). Propose dropping or updating them.
- **Changed** — a scoped path was moved or renamed. Propose rewriting the glob to the new location.

All four surface in Step 4 alongside pattern drift, and get the same "confirm before edit" treatment.

## What counts as drift

For a **rule** (`.claude/rules/*.md`):

- The rule cites an API, pattern, directory, or file that has since been renamed, moved, or removed.
- The rule forbids a pattern the codebase now uses (or mandates one the codebase no longer follows).
- The rule overlaps with or contradicts another rule.
- The rule references a tool command that is no longer accurate (e.g. toolchain rename).
- The rule's example code has become wrong given current APIs.

For a **skill** (`.claude/skills/*/SKILL.md`):

- A command in the workflow no longer works (renamed CLI, removed flag, changed path).
- A referenced file, directory, or config key no longer exists.
- A step refers to a convention that a rule has since overridden.
- The skill's `description` frontmatter no longer matches what the skill actually does.

Stylistic tightening is out of scope unless the user has complained about it — this skill is for _correctness_, not _polish_.

## Always write concisely

Rules auto-load into the prompt whenever their `paths:` match a file in the working set. Long prose and verbose examples pollute context for every unrelated task. When writing or revising:

- Favor bullets and short code blocks over narrative.
- Cut "why" paragraphs. One-line rationale at most.
- When a new rule would need more than ~50 lines to be clear, split the expository half into `.claude/docs/` and keep the rule a thin pointer.

This applies to new rules authored under confirmation in Step 5, and to revisions — surgical edits stay surgical; don't expand surrounding prose "while you're there."

## Workflow

### Step 1 — Load the sync anchor

```sh
TS=$(jq -r .lastUpdated .claude/.last-updated.json)
echo "Last revision sync: $TS"
```

If the anchor file is missing, stop and ask — don't silently recreate it.

### Step 2 — Enumerate code changes since the anchor

Committed, plus uncommitted:

```sh
git log --since="$TS" --name-only --pretty=format: -- src/ supabase/ | sort -u | sed '/^$/d'
git status --short -- src/ supabase/
```

Filter out tests, fixtures, lockfiles, and generated assets. The remaining set is the **change surface** — the code that rules/skills must still line up with.

Also capture any direct edits to the rules/skills themselves since the anchor:

```sh
git log --since="$TS" --name-only --pretty=format: -- .claude/rules/ .claude/skills/ | sort -u | sed '/^$/d'
git status --short -- .claude/rules/ .claude/skills/
```

These are the files the user already decided to touch — they're candidates for consistency review.

If both lists are empty, report "no drift possible since `$TS`" and stop. **Do not bump the anchor on an empty run.**

### Step 3 — Walk every rule and skill

For each file in `.claude/rules/*.md` and `.claude/skills/*/SKILL.md`:

1. **Read the whole file**, including frontmatter.

2. **Resolve the rule's surface area:**
   - If the rule declares `paths:`, use those globs as the verification surface.
   - If no `paths:` is declared, fall back to the full `src/`/`supabase/` tree and mark the rule as _scope-missing_ for Step 4.
   - For skills, the surface is whatever files / directories / commands the skill references in its workflow.

3. **Re-scan the surface for pattern drift.** This is the core check and goes beyond Step 2's change surface, because a drifted pattern can exist in files that haven't been touched since the last sync.
   - Rule forbids a pattern → Grep the scope for that pattern; any hit is drift.
   - Rule mandates a pattern → Grep the scope for the opposite (or for places that should use the mandated pattern but don't).
   - Rule cites an API, directory, or file → confirm it resolves.
   - Skill references a CLI command → confirm the command still works (`package.json` scripts, toolchain).

4. **Check scope drift against the current tree:**
   - Each `paths:` glob should match at least one file — if it matches none, the target moved or was deleted (propose removal or update).
   - The rule's content should not consistently reference directories _outside_ its `paths:` glob — if it does, the scope has grown and should be extended.
   - If a rule was moved or a referenced directory was renamed (visible in Step 2's change surface), the `paths:` entry probably needs rewriting.

5. **Cross-check** rules against each other for contradiction; cross-check each skill's steps against the rules.

Be efficient: for rules with narrow `paths:` globs, scan only those globs. For rules without, lean on Step 2's change surface plus targeted Greps for the rule's forbidden/mandated patterns.

### Step 4 — Surface findings before editing

**Do not edit anything yet.** Present a compact report:

1. **Drift** — one line per finding: `<file>: <what's wrong>`. If empty, say so.
2. **Scope changes** — one line per proposed `paths:` mutation, tagged `[add]`, `[remove]`, `[change]`, or `[missing → propose]`:
   - `[missing → propose]` — rule has no `paths:`; propose a glob based on the rule's content.
   - `[add]` — rule's content now covers directories outside its current glob; propose extending.
   - `[remove]` — a glob entry no longer matches any file; propose dropping.
   - `[change]` — a target moved or was renamed; propose rewriting the glob.
3. **Proposed edits** — one line per non-scope edit (fix a command, rename a cited path in the prose, update an example). Minimal surgery only.
4. **Questions** (only if any, max 3) — things you can't resolve without user input. E.g. "`animations.md` forbids magic timeouts, but `phone.ts` uses one — was this a deliberate exception?"
5. **Possibly new rule territory** — if the code clearly establishes a pattern with no corresponding rule, mention it as _one line_. Do **not** draft the rule. The user decides whether a new rule is warranted.

**Wait for the user** before Step 5.

### Step 5 — Apply confirmed edits

For each edit the user greenlit:

- Keep the change as small as possible — update a line, fix an example, rename a path.
- Preserve the file's existing structure and tone. No rewrites.
- If the user said "drop this rule entirely", delete the file. Grep for references in other rules and skills and clean those up too.

**Applying scope edits:**

- `[missing → propose]` — add a `paths:` array to the existing frontmatter (or create a minimal frontmatter block if none exists). Preserve all other frontmatter fields.
- `[add]` — insert the new glob(s) into the existing `paths:` array.
- `[remove]` — delete the unmatched glob entry. If this leaves the array empty, ask before removing the whole `paths:` key (the user may prefer to delete the rule instead).
- `[change]` — rewrite the glob in place. Keep array ordering so diffs stay small.

A scope edit is the only structural change this skill should make to frontmatter besides bumping `lastUpdated` in Step 6. Leave `title`, `name`, `description`, and other fields alone.

### Step 6 — Stamp timestamps

```sh
NEW_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

For every rule/skill file edited or created in Step 5, update its frontmatter `lastUpdated: $NEW_TS`. For new files without frontmatter, add one:

```
---
lastUpdated: <NEW_TS>
---
```

SKILL.md files always have frontmatter; inject/update the `lastUpdated:` line inside the existing block.

Then write the global:

```sh
printf '{\n  "lastUpdated": "%s"\n}\n' "$NEW_TS" > .claude/.last-updated.json
```

Only bump the global when at least one rule or skill was edited. A "verified, nothing to change" run must not advance the anchor — the anchor represents the last time something actually changed.

### Step 7 — Report

| File | Kind         | Change                                 | Scope change                      |
| ---- | ------------ | -------------------------------------- | --------------------------------- |
| ...  | rule / skill | what was edited (or "none — verified") | add / remove / change / added / — |

- One line per file verified-but-unchanged (grouped).
- **Deferred** section for anything raised in Step 4 that wasn't resolved (including scope proposals the user declined).
- State the new anchor: `rules + skills verified through <NEW_TS>`.
