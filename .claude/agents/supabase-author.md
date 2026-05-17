---
name: supabase-author
description: Authoring migrations, RPCs, RLS policies, edge functions in `supabase/`. Loads the supabase rule and references the backend learning log. Use proactively for any `supabase/` edit.
tools: Read, Edit, Write, Bash, Glob, Grep
model: sonnet
---

## Migration & RPC conventions

@.claude/rules/supabase.md

## Server-state hooks (FE side that consumes these)

@.claude/rules/server-state.md

## Reminders

- Explain like teacher to student — concise, simple, necessary context. Stop and let the user ask.
- Never `supabase db reset`. Use `supabase migrations up`.
- `.claude/logs/learning-log.md` is updated manually on request — don't append unprompted.
