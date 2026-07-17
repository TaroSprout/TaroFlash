---
lastUpdated: 2026-04-16T23:13:06Z
paths:
  - 'supabase/**/*'
  - 'src/api/**/*'
---

# Supabase Conventions

## Buckets in migrations, not config.toml

Provision storage buckets via SQL migrations. `[storage.buckets.X]` in `config.toml` requires `supabase seed buckets` which doesn't run on deploy — stage/prod will diverge.

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cards', 'cards', true, 10485760, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
```

## storage.objects RLS — always add SELECT

Gate on `auth.uid()::text = (storage.foldername(name))[1]` when paths start with `<member_id>/...`. **Always include a SELECT policy** when the client uploads: `supabase-js` upsert-upload emits `INSERT ... ON CONFLICT DO UPDATE`, which needs SELECT for the conflict check. Without it, every upload fails with "new row violates row-level security policy."

`NEW.owner::text = foldername[1]` is a _consistency_ check, not isolation — compare against `auth.uid()` for per-caller scoping.

`storage.protect_delete` blocks direct `DELETE FROM storage.objects`, so DELETE policies can only be verified in the UI, not via pgTAP.

## Capability functions for authorization

Gate role/plan-based access through named capability functions, not inline `auth_role()`/`auth_plan()` checks. Mirrors `src/composables/can.ts`'s naming rule: name for the grant, not the role — `can_manage_members()`, never `is_admin()`.

- One SQL function per capability, `stable`, returns `boolean`, body combines `auth_role()`/`auth_plan()`.
- Colocate a new capability function in the migration of the feature that first needs it — don't pre-create capabilities for hypothetical future features.
- Every capability function needs `grant execute on function public.can_x() to authenticated` — required for edge functions to reach it via `rpc()`.
- RLS policies: `using (can_x())`. Edge functions: `requireCapability(req, 'can_x')` from `supabase/functions/_shared/require-capability.ts`.

## Declarative schemas — the default workflow

`supabase/schemas/` is the source of truth for all DDL (tables, views, functions, triggers, policies, grants). **Never hand-write DDL migrations.** To change schema:

1. Edit the object's file in `supabase/schemas/` — files are hand-organized by domain (single files like `20_members.sql`, or domain dirs like `30_decks/` whose `00_tables.sql` holds tables/policies/grants and each big RPC gets its own file, e.g. `30_decks/save_deck.sql`).
2. `supabase db diff -f <migration-name>` — generates the migration by diffing declared state against migration history.
3. Review the generated file, then `supabase migration up --local`.

Apply order is `schema_paths` in `config.toml` — new files must be added there. `scripts/dump-schemas` writes a raw type-bucketed snapshot of the local DB to git-ignored `supabase/.schema-snapshot/` for drift comparison; it never touches `supabase/schemas/` (the real drift check is `supabase db diff` returning empty).

**Still hand-written migrations** (db diff can't track them): DML — storage bucket inserts, `cron.schedule`, vault secrets, seed rows; default privileges; comment changes.

**CREATE OR REPLACE FUNCTION only replaces an identical argument list** — a changed signature silently creates a second overload. The declarative flow generates the DROP for you; the pgTAP overload guard (`tests/00029`) fails CI if a duplicate slips through.

## Migration workflow

- `supabase migration up --local` immediately after writing — catches errors while the context is fresh. Never `supabase db reset`.
- Editing a migration file is allowed only if it's **unapplied** AND **added in the current branch**. Check via `supabase migration list --local`.
- To rewrite an applied branch-local migration before PR: `supabase migration repair --status reverted --local <version>` → edit → `migration up --include-all`. Don't do this for anything already shipped.

## Views and function signatures

- `SELECT d.*` in a view is expanded at creation time. New table columns don't propagate — `DROP VIEW` + `CREATE VIEW` to pick them up.
- `CREATE OR REPLACE FUNCTION` can't change `RETURNS TABLE(...)` column names or types. Rename → `DROP` + `CREATE`.

## pgTAP

`BEGIN; SELECT plan(N); ... SELECT * FROM finish(); ROLLBACK;`. Use `tests.create_user()` + `tests.set_claims()` from `00000_helpers.sql`. Switch roles with `SET LOCAL role = 'authenticated' | 'postgres'` — re-set claims before each role switch.

"Bad plan. You planned N but ran M" means an earlier statement threw — scroll up for the actual error.
