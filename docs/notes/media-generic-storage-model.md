# Design note — generic media ownership + registry-driven reaper

> Forward-looking design for a future PR. Nothing here is implemented yet. This
> is a plan-first task — read, then propose; don't build off this note alone.
> Written alongside the card-image paywall work (branch
> `feat/gate-card-image-uploads`), which shipped the first generic reaper pass.

## The problem

`public.media` is the ledger that maps a stored object (`bucket` + `path`) to the
thing that uses it. Today it points at owners with **one nullable FK column per
owner type**:

- `card_id` → `cards`
- `deck_id` → `decks`
- `lesson_id` → `lessons`
- plus a nullable `slot` enum (`card_front` / `card_back`) for the card sub-slot.

And each owner type has its **own `BEFORE DELETE` trigger** to soft-delete that
owner's media and null the FK so the parent delete doesn't trip a constraint
(`soft_delete_media_before_card_delete`, `…_deck_delete`, `…_lesson_delete`).

So every new media-owning feature (deck backgrounds, avatars, …) means: a new
`ALTER TABLE` column, a new trigger, and edits to the read views. That's the
sparse-polymorphic-FK smell, and it doesn't scale.

**Key framing:** the reaper cron is _not_ the bottleneck. It only reads
`(bucket, path, deleted_at)` and already iterates buckets generically (the orphan
pass added in the card-image PR derives its bucket set from
`SELECT DISTINCT bucket FROM media`). What doesn't scale is _ownership_ — the FK
columns and per-owner triggers.

## Target shape

**1. Polymorphic owner pointer.** Replace the per-type FK columns with one pair,
and generalise `slot`:

```
owner_type text      -- 'card' | 'deck' | 'lesson' | …
owner_id   bigint
variant    text      -- 'front' | 'back' | NULL   (was `slot`)
```

No FK on `owner_id` (a column can't FK two tables). That's consistent with the
direction the schema already took — `media_member_id_fkey` was dropped and
`lesson_id` is trigger-managed `NO ACTION` rather than a hard cascade.

**2. Owner-type registry.** A tiny lookup table maps each `owner_type` to its
table so the reaper can check owner liveness generically:

```sql
create table public.media_owner_types (
  owner_type  text primary key,
  owner_table text not null   -- regclass-resolvable, e.g. 'public.cards'
);
```

**3. Generic dangling-owner reaper pass.** One plpgsql function replaces all the
per-entity cascade triggers: for each registry row, soft-delete `media` whose
`owner_id` no longer exists in `owner_table` (dynamic SQL per type). The existing
storage-GC passes then reap the bytes. So deleting a card/deck/lesson/member
needs **no media trigger** — the row just goes dangling and the next cron run
cleans it up.

The reaper then has three generic passes, none with per-type knowledge baked in:

1. **Soft-deleted refcount sweep** (exists today) — object whose only references
   are soft-deleted, refcounted across content-addressed sharing.
2. **True-orphan sweep** (shipped in the card-image PR) — object in a
   media-tracked bucket with no `media` row at all, time-gated by `created_at`.
3. **Dangling-owner sweep** (new) — `media` row whose `owner_id` is gone.

## What adding a new media kind looks like

Pure data, no schema migration:

1. create the bucket (one `insert into storage.buckets`),
2. `insert into public.media_owner_types` one row,
3. the feature inserts `media` rows with its `owner_type`.

No `ALTER TABLE`, no new trigger. The reaper covers it automatically.

## Trade-offs (call these out at review)

- **Eventual, not synchronous, cleanup.** Today triggers soft-delete media the
  instant the owner is deleted; the dangling-owner pass defers that to the next
  cron run (≤1h). Fine for storage GC; worth a sanity check for anything that
  reads media expecting it to vanish immediately on owner delete.
- **No DB-level referential integrity on the owner.** The dangling-owner pass is
  the compensating control. Consistent with already-dropped FKs, but it means a
  bad `owner_type`/`owner_id` won't be rejected at write time — RLS + app code
  must keep them honest.
- **Read views get slightly more verbose.** `cards_with_images` and the lesson
  views join on `(owner_type, owner_id, variant)` instead of `card_id + slot`.
  That's per-feature query code, not per-bucket schema churn.

## Migration sketch (future PR)

1. Add `owner_type` / `owner_id` / `variant`; backfill from the existing FK
   columns + `slot` (a `card_front` row → `owner_type='card'`, `variant='front'`).
2. Add `media_owner_types` and seed `card` / `deck` / `lesson`.
3. Recreate `cards_with_images` and the lesson views/RPCs onto the new columns
   (DROP + CREATE — `SELECT *`/`RETURNS TABLE` shapes don't auto-pick-up).
4. Add the dangling-owner reaper function; wire it into `cleanup-media`.
5. Drop the three per-entity soft-delete triggers and the
   `card_id` / `deck_id` / `lesson_id` / `slot` columns.

Sequence so each step is independently valid (backfill before dropping columns,
views recreated before old columns drop). Apply each with `migration up --local`
as written, never `db reset`.
