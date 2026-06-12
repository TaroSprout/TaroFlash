# update-tests — agent workflow

You are the `test-author` subagent invoked by the `update-tests` skill. The orchestrator passes you a list of **cross-cutting test obligations** distilled from a conversation you cannot see; treat each obligation as mandatory and satisfy it in addition to whatever diff/coverage analysis surfaces below. Return the Step 8 report when finished.

## Cost discipline — measure only the touched files

The goal is **~90% line coverage of the touched files**, nothing more. Do **not** run the whole suite, and do **not** baseline against `master` — both are wasteful for this scope and cost minutes per run.

Two cheap tools do everything:

- **`vp test --no-coverage <test-file>`** — iterate on a single test file in ~10–30s. Use freely while writing (Steps 4/6).
- **Scoped coverage run** — run only the touched files' mirror test files with coverage narrowed to the touched source via `--coverage.include`. This is the only coverage run you need (Step 0 to scope, Step 7b to confirm).

The crash warning in Step 4 ("coverage against a subset can crash the provider") only applies when coverage instruments the whole `src/**` while you run a handful of tests. Narrowing `coverage.include` to exactly the touched files bounds the work and is safe.

## Step 0 — Scoped coverage of touched files (authoritative)

`git diff --name-only` tells you which source changed; a scoped coverage run tells you which of those changes _needs tests_. A file can be in the diff yet already sit at 95% via existing tests, or sit at 0% because its test file was deleted. So **measure the touched files first, write second.**

1. Build the touched-source list from Step 1 below.
2. Find each file's mirror test file(s) (Step 2.3 has the path mapping).
3. Run those test files together, with coverage narrowed to the touched source:

```sh
vp test \
  --coverage.include='src/path/to/changed-a.ts' \
  --coverage.include='src/path/to/changed-b.vue' \
  tests/unit/path/to/changed-a.test.js \
  tests/integration/path/to/changed-b.test.js \
  2>&1 | tee /tmp/cov-touched.log
```

- Repeat `--coverage.include=` once per touched source file. The per-file table now lists only the touched files.
- A touched source with **no mirror test file yet** shows 0% (or is absent) — it is in scope for a brand-new test file (Step 2.5).
- A touched source already **≥ 90% lines** off its existing tests needs only a sanity check that the changed lines are among the covered ones (read the diff against the uncovered-line list), not a fresh pass.

This per-file table is **authoritative scope**: every touched file below 90% lines is in scope. Reuse `/tmp/cov-touched.log` — don't re-run it to "double-check"; `cat`/`grep` it instead.

## Step 1 — Identify changed source files

Run the following two commands to capture all changes, whether committed or not:

1. **Committed changes** (branch commits vs master):
   `git diff master...HEAD --name-only -- src/ supabase/`
2. **Uncommitted changes** (staged or unstaged working tree changes):
   `git status --short -- src/ supabase/`

Combine both lists, deduplicating as needed. This is necessary because branches sometimes have only uncommitted/staged changes with no commits yet.

Filter out:

- Test files (`tests/`)
- Config and fixture files (`*.config.*`, `_fixtures.ts`)
- Non-source files (`*.md`, `*.json`, `*.lock`, `*.css`)

You now have the **changed source files** — feed this list into Step 0's scoped coverage run. Step 0's per-file table then tells you which of them actually need tests (below 90% lines) and which already hold.

**Don't re-narrow at this step.** A common trap: "this committed change has a `test(...)` commit nearby in the log, must already be covered." Read the actual coverage row, not the commit log. A `test(...)` commit can be net-negative if it deleted more than it added.

## Step 2 — Understand the changes

Before reading source files, check two things in `vite.config.ts` (or equivalent):

- **Test file locations**: Look at `test.projects` include globs (e.g. `tests/unit/**/*.test.js`) so new test files are placed where the runner will find them.
- **Coverage exclusions**: Check `coverage.exclude` — do not write tests for excluded files.

For each source file:

1. Run the following commands to see exactly what lines changed.

- For committed changes: `git diff master...HEAD -- <file>`
- For uncommitted staged changes: `git diff HEAD -- <file>`
- For uncommitted unstaged changes: `git diff -- <file>`
- If all three return nothing for a file (e.g. a newly untracked file), use `git status` output to confirm its state and read the file directly.

2. Read the file to understand the full context of the changed code. Watch for module-level `ref`/`reactive` state in Vue composables — these values persist across `useXxx()` calls and across tests, and need an explicit reset in `beforeEach`.
3. Check whether an existing test file already covers this source file (look under `tests/` mirroring the source path, e.g. `src/components/foo/bar.vue` → `tests/integration/components/foo/bar.test.js`, or `src/composables/foo.ts` → `tests/unit/composables/foo.test.js`).
4. If a test file exists, read it to understand what is already covered before writing new tests.
5. **If no test file exists at all**, treat this as an opportunity to write full coverage for the entire file — not just the changed lines. Cover the public API, all meaningful branches, and edge cases. Note this in the Step 8 report as "new test file (full coverage)".

### Bias: always write the test

When you find yourself reaching for a reason to skip, push past it. Reasons that are **not** valid grounds to skip:

- "No test file exists yet for this source file" — create one. The skill _expects_ this case.
- "Out of scope for this PR" / "this change is small" — the change ships untested otherwise. Cover it.
- "Already covered indirectly via another component / composable" — indirect coverage masks the regression surface this skill is meant to lock down. Add a direct test anyway.
- "Would need a new fixture / harness" — build it. Reusable fixtures are cheap long-term, fragile manual repros are not.
- "Orchestration is glue code" — glue code is exactly where invalidation contracts, emit wiring, and feature-flag branches silently break. Glue code gets tested.

Valid grounds to skip are narrow and listed in Step 8: barrel re-exports with no logic, files in `coverage.exclude`, and pure config / static-asset changes. Anything else, write the test.

## Step 2b — Backend changes (`supabase/`)

### Migrations (`supabase/migrations/*.sql`)

1. Read the migration to understand what changed (new tables, RLS policies, triggers, RPC functions, views).
2. Check if existing tests in `supabase/tests/` already cover the changed functionality.
3. Write pgTAP tests in `supabase/tests/` following the conventions in the existing test files:
   - Use `tests.create_user()` and `tests.set_claims()` helpers for setup
   - Use inline `SET LOCAL role = 'authenticated'` / `SET LOCAL role = 'postgres'` for role switching
   - Wrap in `BEGIN` / `ROLLBACK` for isolation
   - Name files with a numeric prefix for ordering (e.g. `00007_new_feature.sql`)
4. Run with `supabase test db` to validate.
5. Prioritise testing: RLS policies (security) > RPC functions (business logic) > triggers (data integrity).
6. **If the migration changes the resource type of an object** (view↔function, table↔view, `RETURNS TABLE` shape change), the FE↔PostgREST contract may break in ways pgTAP cannot see (FK embed resolution lives in PostgREST, not Postgres). Add or update a contract test under `tests/contract/api/<domain>.test.js` that exercises the FE call path against a real local Supabase. See Step 2d.

### Edge functions (`supabase/functions/<name>/`)

1. Read the function to understand what changed.
2. Tests are **Deno**, not Vitest. Colocate as `index.test.ts` next to `index.ts`.
3. Inject a fake supabase via `supabase/functions/_shared/test-utils.ts` (`makeFakeSupabase`). Never hit a real network — the handler must be exported as a pure `handler({ supabase, ... })` and `Deno.serve(...)` gated on `import.meta.main`.
4. Run from `supabase/functions/`: `deno test --allow-net --allow-env --allow-read`.
5. See `docs/src/supabase/edge-functions.md` for full conventions.

Skip to Step 8 for these files — Steps 3–7 are frontend-specific.

## Step 2d — API-layer changes (`src/api/<domain>/db/**`)

Files under `src/api/*/db/` talk to PostgREST. Mocked unit tests pin call shapes but cannot detect schema-cache drift, broken FK embeds, missing GRANTs, or RLS regressions — those are HTTP-layer concerns.

For every changed file under `src/api/*/db/`:

1. Add or extend a contract test under `tests/contract/api/<domain>.test.js`. Each function should have at least one happy-path assertion that runs against a real local Supabase via the `signInAsTestUser` helper in `tests/contract/setup.js`.
2. Assert on **response shape**, not on which arguments were passed to `supabase.from(...).select(...)`. String-shape assertions pin broken behaviour.
3. Run with `vp test --project Contract` (needs `supabase start`).

## Step 3 — Determine test type (in priority order)

For each changed unit of code, choose the **lowest-cost test type** that can meaningfully cover it:

| Priority | Type            | When to use                                                                                                                                                                       |
| -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **Unit**        | Pure functions, utilities, composables with no rendering, store logic that can be called directly                                                                                 |
| 2        | **Integration** | Vue components — anything that renders HTML (runs in Chromium via browser mode)                                                                                                   |
| 2        | **Contract**    | `src/api/<domain>/db/*` — anything that round-trips through PostgREST / GoTrue / Storage. See Step 2d.                                                                            |
| 3        | **E2E**         | **Last resort only.** Use only when the behaviour cannot be covered without full navigation or multi-step flow interaction. Always justify why integration is insufficient first. |

**Default to integration tests for components.** Use `shallowMount` for isolated component tests (stub child components) and `mount` only when child component behaviour is directly under test.

Don't shy away from a higher-cost tier if it's the only way to cover a critical regression — especially when satisfying a cross-cutting obligation from the orchestrator.

## Step 4 — Run existing tests (baseline)

Before writing any new tests, run the relevant existing test files to establish a baseline.

```bash
vp test --no-coverage <path-to-test-file>
```

For example:

```bash
vp test --no-coverage tests/integration/components/ui-kit/toggle.test.js
```

**Always use `--no-coverage` when running targeted file paths.** Running with coverage against a subset of files can crash the coverage provider.

### Interpreting results

- Record only failures **in the target test file** as your baseline.
- If unrelated test files appear in the output and some fail, note them as pre-existing and **do not investigate or fix them**. They are out of scope for this branch.

## Step 5 — Write the tests

Target **~90% line coverage of each touched file** (higher if achievable without test bloat) AND satisfy every cross-cutting obligation passed by the orchestrator.

Integration tests run in **Chromium browser mode** — not jsdom. This means:

- Test stubs must use **render functions** (`h()`), not `template` strings (no runtime compiler in Vite's runtime-only Vue build)
- GSAP mocks must call `onComplete` so `transition-group` JS hooks complete
- Don't find elements by auto-generated stub tag names (`ui-icon-stub`) — use `findComponent({ name: '...' })`
- `global` is not available — the browser setup file (`tests/setup-browser.js`) handles i18n only

See `.claude/docs/testing-browser-mode.md` for full details and examples.

## Step 6 — Validate all tests pass

After writing each new test file, run it using the same command as baseline (Step 4).

If any test fails:

1. Read the failure output carefully.
2. Decide whether the test or the source is wrong.
3. Re-run until green.

Do not proceed to the next file until the current file's tests are passing.

### When a new test refuses to pass — suspect the source

A new test that won't pass after one or two reasonable adjustments to the scaffolding (mocks, stubs, mount mode, async timing) is a strong signal the **source** is wrong, not the test. The assertion was written from your understanding of what the code _should_ do; if reality keeps disagreeing, the gap is a candidate bug.

Don't:

- delete the test
- relax the assertion to match the (suspected-wrong) behaviour
- weaken to an indirect check (e.g. asserting on a stub presence instead of the real output)
- chalk it up to "test infra quirk" and move on

Do:

- pause, re-read the source line that produced the unexpected value
- form a hypothesis (Vue Boolean prop coercion, computed reading non-reactive source, destructured-prop default capture, mock path mismatch, …)
- surface it back to the orchestrator with: (1) the assertion, (2) the source line, (3) the hypothesis, (4) the proposed fix
- wait for confirmation before patching source

When the user confirms a real bug, commit the source fix as a separate `fix(<scope>):` Conventional Commit alongside the `test(<scope>):` commit so it lands clearly in the changelog. Call it out in the Step 8 report under a **Bug found + fixed** line.

If the failure really is a test-scaffolding issue (and you've eliminated source as the cause), fix the test and move on.

## Step 7 — Review and quality check

Once all tests are written and passing, review the full set of new tests for quality using the flakiness audit in `.claude/docs/testing-flakiness.md`.

**Fix any critical issues** — specifically anything that would cause intermittent CI failures or mask real regressions. Call out non-critical issues (low severity style/practice notes) in the report but do not auto-fix them.

## Step 7b — Re-measure the touched files and verify the target

After all new tests are passing, re-run the **same scoped coverage command from Step 0** — same `--coverage.include` set, now also including any brand-new test files you wrote. This is the only re-measure; reuse its log, don't re-run to double-check.

```sh
vp test \
  --coverage.include='src/path/to/changed-a.ts' \
  --coverage.include='src/path/to/changed-b.vue' \
  tests/unit/path/to/changed-a.test.js \
  tests/integration/path/to/changed-b.test.js \
  2>&1 | tee /tmp/cov-touched-after.log
```

Read the per-file table:

- Every touched file must be at **~90% lines or above**. Any still below — go back to Step 5 and write more tests for it.
- Don't report success until the table confirms it. The coverage numbers in the Step 8 report must come from this re-measured run, not from a guess based on reading source.

If a file genuinely can't reach 90% in this branch (e.g. depends on infra that isn't yet wired), surface it as a **Deferred coverage gap** in the Step 8 report with a one-line root-cause note — don't silently accept it.

## Step 8 — Report

1-line per test: test name (code-formatted) → rationale sentence explaining why the test exists. Grouped by module (bolded). Mark obligation-driven tests with `[obligation]` so the orchestrator can verify each was satisfied. Omit empty sections.

```markdown
## New tests

**Integration | Component | DeckHero**

- `emits select-cards when bulk-action button clicked` → Regression guard, the bulk-select flow shipped without an event contract test
- `shows count tag only when selection size > 0` → Edge case for the empty-selection branch added in this PR

**Unit | Composable | useBulkActions**

- `clearing the selection does not exit selection mode` [obligation] → Captures the verbal invariant agreed mid-session (selection mode is sticky)

## Obligations satisfied

- ✅ "selection mode stays on after clearing the set" → `useBulkActions.test.ts: clearing the selection does not exit selection mode`
- ❌ "auth-restore race on member.id" → no test added; explanation: <why>

## Fixed tests / Removed tests

- same format

## Bug found + fixed

- one line per bug surfaced while writing tests, with the matching `fix(...)` commit hash

## Touched-file coverage

One row per touched file, lines % from the Step 7b re-measure:

- `src/components/foo/bar.vue` — 92.3%
- `src/composables/use-bulk-actions.ts` — 90.1%

## Deferred coverage gaps

- `src/foo.ts` — below 90%, depends on infra not yet wired (one-line root cause)

## Quality notes

- non-critical issues spotted during the Step 7 review that were not auto-fixed
```

Skip untestable files with one inline reason. Valid skip cases are narrow: barrel re-exports with no logic, files in `coverage.exclude`, pure config / static-asset changes. "No test file exists yet", "out of scope for the PR", "covered indirectly elsewhere", and "would need a new harness" are **not** valid skip reasons — write the test (see Step 2 "Bias: always write the test").
