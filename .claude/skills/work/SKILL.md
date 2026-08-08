---
name: work
description: Work a single Notion Task Board ticket interactively, in this session. `/work <ID>` pulls the ticket, briefs you on what it asks for, waits for your sign-off, then implements it here — no subagents, no worktrees, no PR orchestration. For parallel autonomous multi-ticket runs, use `/batch`. Trigger on `/work`, "work ticket X", "let's do TARO-N".
allowed-tools: Read, Edit, Write, Grep, Glob, Bash, Skill, mcp__notion__notion-query-data-sources, mcp__notion__notion-fetch, mcp__notion__notion-update-page
argument-hint: '<ID>'
arguments:
  - name: <ID>
    description: The numeric ticket ID to work (e.g. `264` / `TARO-264`). Required.
lastUpdated: 2026-08-07T00:00:00Z
---

## Steps

1. **Fetch** the ticket — `notion-query-data-sources` on
   `collection://3630953c-224c-8065-8864-000bb9fe7bad` for `WHERE "userDefined:ID" = <ID>`, then
   `notion-fetch` the page url for the body.
2. **Brief** the user, ≤10 lines: title, what it asks for, the acceptance criteria, anything
   unclear or contradictory, and the plan in a few bullets. Flag open blockers (`Blocked By` rows not
   `Done`/`Won't Do`/`Duplicate`) and any `## Open questions` left in the body.
3. **Wait for sign-off.** Do not edit anything until the user says go. Answer questions, adjust the
   plan, re-brief if it changes materially.
4. **Branch** — if the current branch's scope doesn't match, cut a fresh one off `master`.
5. **Set `Status = In Progress`** on the ticket.
6. **Implement** to the acceptance criteria. Follow `.claude/rules/*` and CLAUDE.md as normal —
   including the golden no-tests rule.
7. **Commit** in logical chunks as you go, conventional messages. No PR unless asked.
8. **Report** what landed vs. each acceptance criterion, and anything left undone. Leave the ticket
   in `In Progress` — the user promotes it.

## Self-heal

Run every correction through [`self-heal.md`](../../rules/self-heal.md) — this session is interactive,
so pushback arrives constantly and is the richest signal there is. Specific to this skill: a miss
about **how the brief was framed or what got skipped before sign-off** heals this skill; a miss about
the **code** routes by the table in the rule; a wrong or ambiguous **AC** is a `/groom` miss — flag it
for regroom, don't heal here.
