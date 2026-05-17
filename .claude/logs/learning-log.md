---
lastUpdated: 2026-04-17T00:00:00-07:00
---

# Backend Learning Log

After each backend teaching session, list the key concepts covered as touchpoints (e.g., "RLS policies", "transactions", "JWT claims") so the user has prompts to react to rather than recalling from scratch. Let them reflect on what clicked and what didn't, and note any follow-up questions they ask — those are strong signals of understanding depth. Based on their reflection, their questions throughout the session, and your knowledge of the topic's actual depth, estimate their understanding of each concept on a scale of 1-100.

**Scoring rules:**

- Always err on the side of a lower score. If in doubt, pick the lower number.
- Log only concept and score — no rationale column.
- Append new entries chronologically.

## Sessions

<!-- Append new sessions below this line -->

### 2026-04-13 — pgTAP setup & RLS/triggers/RPC testing

| Concept                     | Score |
| --------------------------- | ----- |
| RLS (Row Level Security)    | 8     |
| Transactions                | 6     |
| Triggers                    | 4     |
| SECURITY DEFINER vs INVOKER | 5     |
| JWT claims & auth.uid()     | 3     |
| pgTAP testing               | 2     |

### 2026-04-15 — card.note migration: nullable ADD COLUMN, view snapshots, security_invoker

| Concept                               | Score |
| ------------------------------------- | ----- |
| Nullable ADD COLUMN (zero-downtime)   | 7     |
| View column snapshotting / recreation | 7     |
| security_invoker vs security_definer  | 4     |

### 2026-04-16 — decks_with_stats view, cards_with_images retrofit

| Concept                                    | Score |
| ------------------------------------------ | ----- |
| Views as a unified read shape              | 3     |
| security_invoker on views                  | 9     |
| Correlated subqueries                      | 4     |
| Views replacing trigger-maintained columns | 8     |
| View column snapshotting (second exposure) | 8     |

### 2026-04-16 — insert_card RPC, plpgsql, advisory locks

| Concept                                     | Score |
| ------------------------------------------- | ----- |
| Plpgsql syntax fundamentals                 | 6     |
| Function return types as part of signatures | 7     |
| RETURNING ... INTO                          | 6     |
| Variable/column disambiguation              | 3     |
| Advisory locks                              | 6     |
| Fractional ranks + BE-owned rank            | 3     |

### 2026-04-16 — media slot-dedupe trigger + unique partial index

| Concept                                      | Score |
| -------------------------------------------- | ----- |
| Trigger function vs trigger (two-part split) | 8     |
| NEW / OLD / TG_OP record variables           | 8     |
| BEFORE vs AFTER triggers                     | 8     |
| SECURITY INVOKER on trigger functions        | 9     |
| Partial unique indexes                       | 6     |
| Trigger (behavior) vs index (invariant)      | 7     |

### 2026-04-16 — storage bucket + storage.objects RLS

| Concept                                               | Score |
| ----------------------------------------------------- | ----- |
| storage.buckets declarative config (config.toml)      | 5     |
| storage.objects RLS with owner column                 | 9     |
| UPSERT requires SELECT policy (ON CONFLICT DO UPDATE) | 2     |
| storage.foldername + path-based member isolation      | 8     |

### 2026-04-17 — Stripe backend: plans table, webhook, checkout + portal

| Concept                                                 | Score |
| ------------------------------------------------------- | ----- |
| Lookup table vs postgres enum                           | 6     |
| ALTER COLUMN TYPE USING \<expr\>                        | 5     |
| Dropping dependent objects before column retype         | 7     |
| `is not distinct from` for NULL-safe equality           | 5     |
| Webhook signature verification (raw body, SubtleCrypto) | 4     |
| Service-role vs user-scoped edge-function clients       | 6     |
| Idempotent webhook handlers                             | 6     |
| checkout.session.completed vs customer.subscription.\*  | 8     |
| Embedded Checkout vs Payment Element                    | 3     |
| Server-side plan→price resolution                       | 3     |
| Stripe customer lookup ladder                           | 5     |
| Billing Portal as hosted flow                           | 3     |

### 2026-04-19 — insert_card_at: drop+create, neighbor resolution, advisory locks

| Concept                                                | Score |
| ------------------------------------------------------ | ----- |
| DROP + CREATE vs CREATE OR REPLACE                     | 9     |
| Function overloading by argument types                 | 8     |
| Server-resolves-neighbor pattern                       | 8     |
| `LIMIT 1` ordered queries for nearest-neighbor         | 9     |
| `pg_advisory_xact_lock`                                | 9     |
| EXCEPTION blocks + SQLSTATE matching                   | 3     |
| `RETURNS TABLE` + `RETURNING ... INTO` + `RETURN NEXT` | 6     |

### 2026-04-19 — cards_with_images: window functions, view recreate, composite indexes

| Concept                                                | Score |
| ------------------------------------------------------ | ----- |
| Window functions vs aggregates                         | 4     |
| `PARTITION BY` semantics                               | 1     |
| SQL execution order (WHERE → window → LIMIT)           | 5     |
| View recreation: DROP + CREATE vs CREATE OR REPLACE    | 9     |
| `WITH (security_invoker = true)` inline on CREATE VIEW | 7     |
| Composite btree indexes + sort-order alignment         | 10    |

### 2026-04-19 — move_card: exclude-self lookup, scalar returns

| Concept                                                         | Score |
| --------------------------------------------------------------- | ----- |
| Excluding the moved row from neighbor lookup                    | 6     |
| Collapsing existence check + data lookup into one SELECT...INTO | 8     |
| `RETURNS scalar` vs `RETURNS TABLE` (single value vs row)       | 9     |

### 2026-04-19 — delete_cards_in_deck: arrays, NULL logic, diagnostics

| Concept                                      | Score |
| -------------------------------------------- | ----- |
| Postgres typed arrays + `<> ALL` / `= ANY`   | 6     |
| SQL three-valued logic (NULL handling)       | 8     |
| `GET DIAGNOSTICS ROW_COUNT`                  | 6     |
| RLS vs RPC decision rule (when each fits)    | 8     |
| pgTAP `results_eq` + `VALUES` literal tables | 6     |

### 2026-04-19 — backfill-null-ranks: DO blocks, ALTER NOT NULL, SELECT INTO ambiguity

| Concept                                                       | Score |
| ------------------------------------------------------------- | ----- |
| `DO $$ ... $$` anonymous block + `FOR ... IN SELECT ... LOOP` | 8     |
| `ALTER COLUMN ... SET NOT NULL` (locks column post-backfill)  | 8     |
| `SELECT col INTO var` ambiguity (no row vs row with NULL col) | 8     |

### 2026-04-19 — bulk_insert_cards_in_deck: jsonb args, RETURNS SETOF

| Concept                                                           | Score |
| ----------------------------------------------------------------- | ----- |
| `jsonb` parameter + `jsonb_array_elements()` iteration            | 1     |
| `->` vs `->>` (jsonb extraction operators)                        | 1     |
| `RETURNS SETOF table_name` + `RETURN NEXT row_var`                | 1     |
| `MAX(rank) + step` append pattern (no neighbor resolution needed) | 1     |
