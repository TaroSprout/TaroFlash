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
