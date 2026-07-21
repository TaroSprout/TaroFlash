---
name: prepare-pr
description: Fully autonomous — prepare a branch for PR by committing all pending work, rewriting commit messages into release-notes-friendly Conventional Commits, renaming the branch if it no longer fits the changes, running a lint + type-check gate, drafting a PR title and body, then creating a single PR directly (not a draft) and watching CI until green. Never asks for permission or feedback before the PR opens. Always bundles all branch work — committed AND uncommitted (staged + unstaged) — into exactly one PR. Use when a feature branch is code-complete and ready for review.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
argument-hint: '[--no-watch] [--ticket <ID>]'
arguments:
  - name: --no-watch
    description: Skip the post-create CI watch + coverage check (Step 10).
  - name: --ticket <ID>
    description: Prefix the PR title with the ticket key `TARO-<ID>` (e.g. `TARO-207: …`). Omit for no prefix.
lastUpdated: 2026-07-20T00:00:00Z
---

## Args

- **`--no-watch`** (optional) — skip the post-create CI watch + coverage check (Step 10). Default behaviour blocks on CI after opening the PR until checks settle, then inspects coverage and writes more tests if it regressed.
- **`--ticket <ID>`** (optional) — the Notion Task Board ticket ID this PR resolves. When given, the PR **title** is prefixed with `TARO-<ID>: ` (Step 8). This affects only the PR title — commit subjects stay clean (ticket refs still belong in a commit-body `Refs:` trailer, per Notes). Omit to open a PR with no ticket prefix.

## Fully autonomous — no approval gates

This skill never stops to ask for permission or feedback before the PR opens. It always:

- Commits **all** pending work — staged, unstaged, and untracked — into the branch. Never leaves anything uncommitted.
- Produces **exactly one PR** per run. There is no split mode — the whole branch's work always lands as a single PR.
- Makes its own calls on commit grouping, message wording, branch renaming, and CI-failure classification, and records those calls in the Step 11 report instead of pausing to ask.
- Only stops mid-run for the hard-safety cases called out in Step 10's "when to abort the watch" — those are genuine stop-and-report conditions, not permission requests, and they happen only _after_ the PR is already open.

## Why this skill exists

Feature branches accumulate vague commits ("fix", "tests", "refactor study-session to be cleaner"), stale branch names, unrelated drive-bys, no release-notes thought. Skill fixes all of it in one autonomous pass so the PR is ready for review and merge lands clean in the changelog.

Output:

1. All branch work — committed AND uncommitted (staged + unstaged + untracked) — bundled into one PR. Uncommitted changes are committed as part of the workflow.
2. All branch commits grouped into a single PR.
3. Commits renamed to **Conventional Commits** (see style guide below).
4. Branch renamed if slug no longer fits.
5. Working tree lint-and-type-clean (gate run, issues fixed) before any push.
6. Branch pushed (force-with-lease if rewritten, fresh push if new).
7. PR **created directly** via `gh pr create` — no browser, never a draft — then its CI watched until green.

History may be published — **user pre-authorised force-push on this branch** — don't block on upstream.

## Conventional Commits — style guide

### Why

Release-notes tools (release-please, semantic-release, git-cliff, Changesets) read commit subject to categorise:

- `feat:` → **Features**, often minor bump
- `fix:` → **Bug Fixes**, patch bump
- `refactor:`, `perf:`, `docs:`, `test:`, `chore:`, `style:`, `build:`, `ci:`, `revert:` → **Internal** or omitted from user-facing notes
- `feat!:` / trailer `BREAKING CHANGE:` → **Breaking Changes**, major bump

Even without automation, format reads well in changelog and makes git log skim productive.

### Format

```
<type>(<scope>): <description>
```

- **type** — one of `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `style`, `build`, `ci`, `revert`. Pick by user-facing effect, not biggest file changed.
- **scope** — short domain tag (`study-session`, `cards`, `auth`, `deck-settings`). Omit only if truly cross-cutting. Prefer existing scope from branch or recent git log.
- **description** — imperative ("add X", not "added X" or "adds X"), lowercase, no trailing period, no ticket numbers. Describe user-visible change or concrete outcome — not mechanics. Under ~72 chars.

### Examples

Good:

- `feat(study-session): edit card text mid-session`
- `fix(auth): prevent infinite redirect after session refresh`
- `refactor(cards): replace CardRecord class with saveCard API`

Bad:

- `updates` — no type, no info
- `refactor study-session to be cleaner` — no scope, vague
- `fix: fixed the bug where clicking the button didn't work` — past tense, imprecise, redundant "fix"

## Workflow

### Step 1 — Sanity check

```sh
git rev-parse --abbrev-ref HEAD
git log master..HEAD --oneline
git diff master..HEAD --stat
git status --short
gh auth status
```

Block and warn if any true:

- Current branch is `master` or `main`.
- `master..HEAD` empty **and** no staged changes. Nothing to prepare.
- `gh` not authenticated. Final step need it; authenticate now or agree to skip auto-open.

**Uncommitted changes — both staged and unstaged are included in the PR.** Inspect `git status --short` and `git diff` / `git diff --cached`:

- **Staged** (`A`/`M`/`D`/`R` col 1): read the staged diff with `git diff --cached`.
- **Unstaged** (col 2 — `M`/`D`/`?`): read with `git diff` and `git status --short` (untracked files need `git diff --no-index /dev/null <path>` or just a `Read`).
- **Mixed**: read both.

Combine them into one logical view of pending work. Group by concern if multiple distinct changes are present, write Conventional Commits messages (one commit per concern), then stage + commit each group directly — no approval pause. Treat the new commits as part of the branch for the rest of the workflow. Record the grouping decisions made here in the Step 11 report.

Skip this step only if there are zero uncommitted changes.

Note current upstream (`git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null`) so push step can decide flags.

### Step 2 — Inspect each commit

For each SHA from `git log master..HEAD --oneline`, run:

```sh
git show --stat <sha>
```

Read enough of diff to understand user-visible effect. If stat ambiguous, `git show <sha> -- <path>` on interesting files. Goal: know what _belongs_ in subject, not just what got touched.

Per commit answer:

1. User-visible (feature, fix, UX tweak) or internal (refactor, test, docs, chore)?
2. Smallest accurate scope?
3. Concrete outcome in one imperative clause?
4. Depends on earlier commit, or independent?

### Step 3 — Decide new commit messages

The whole branch always lands as a single PR — there is no split mode. Build the rename table for every commit in `master..HEAD`:

| SHA (short) | Current                                | Proposed                                                                  |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `71538c8`   | add edit functionality to session      | `feat(study-session): edit card text mid-session`                         |
| `e6d0a22`   | Refactor study-session to be cleaner   | `refactor(study-session): extract composables and introduce deck context` |
| `7475c52`   | refactor card editing network pipeline | `refactor(cards): replace CardRecord class with saveCard API`             |

Apply directly — no approval pause. Messages already good Conventional Commits can stay as-is. Record the table in the Step 11 report so the user can see what changed.

### Step 4 — Rewrite commit messages

Use `git filter-branch --msg-filter` with `case` on `$GIT_COMMIT` (pre-rewrite SHA). Preserves authorship, dates, trailers, parentage — only subject changes.

```sh
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter '
case "$GIT_COMMIT" in
  <full-sha-1>) echo "<new message 1>" ;;
  <full-sha-2>) echo "<new message 2>" ;;
  *) cat ;;
esac
' master..HEAD
```

Use **full** 40-char SHAs in case — short SHAs won't match.

For multi-line messages (body after blank line), use heredoc inside case arm:

```sh
<sha>) cat <<'EOF'
feat(study-session): edit card text mid-session

Adds an edit button on the study card that swaps in a text editor
and debounces saves through saveCard.
EOF
;;
```

Verify with `git log master..HEAD --oneline` and `git log master..HEAD --stat` (diffs unchanged from before rewrite).

### Step 5 — Evaluate and, if needed, rename the branch

PR titles in GitHub UI default to:

- single commit's subject if branch has **one** commit off master, or
- branch name humanised (kebab-case → spaces, capitalised) if multiple commits.

So branch name is primary lever for good default title with multiple commits. Even with single commit, tidy branch name reads better in PR list and branch sidebar.

Compare name to commit subjects. If still fits, keep. Else derive a kebab-case slug:

- 3–6 words
- Describes primary change (feature focus or primary refactor)
- Lowercase, hyphen-separated
- No ticket prefix unless repo convention uses one (check recent merged via `gh pr list --state merged --limit 10`)
- Humanises into clean sentence — e.g. `study-session-inline-edit-cleanup` → "Study session inline edit cleanup"

Rename directly — no approval pause. Record old → new in the Step 11 report:

```sh
git branch -m <old-name> <new-name>
```

### Step 6 — Lint + type-check gate (before any push)

Run the linter **and** the type-checker on the working tree and fix everything they flag **before** pushing — these are the cheapest CI failures to catch locally, and the most annoying to discover after the PR is already open.

```sh
vp lint
pnpm type-check
```

- **Type-check uses `pnpm type-check` (vue-tsc), not `vp`.** CI runs `pnpm type-check`, and vue-tsc is stricter than `vp check`'s type pass — a `vp`-clean tree can still fail CI on types. Use the same command CI uses so the gate actually matches it.
- If both clean → continue to the push.
- If they report errors → fix them. Most lint hits are mechanical (unused import left by a refactor, `prefer-const`, missing return); `vp lint --fix` / `vp fmt` handle the auto-fixable ones. Type errors after a refactor are usually moved/renamed symbols or a changed signature — chase them to the changed call sites.
- Re-run both until clean. Commit the fixes onto the branch with a `fix(<scope>):` or `chore(<scope>):` Conventional Commit (or amend into the commit that introduced the issue if it hasn't been pushed yet and belongs there) so the fix rides with the work it corrects.
- Pre-existing lint warnings unrelated to this branch's diff aren't a blocker — don't expand scope chasing them. Errors (lint or type), and warnings in code this branch touched, must be resolved.

Do not push until both `vp lint` and `pnpm type-check` are clean.

### Step 7 — Push the branch

User pre-authorised force-push here.

- No upstream previously: `git push -u origin <branch>`
- Had upstream under same name: `git push --force-with-lease`
- Renamed and had upstream under old name:
  ```sh
  git push -u origin <new-name>
  git push origin --delete <old-name>
  ```

If `--force-with-lease` rejected, stop and surface output — remote has commits you don't have locally. Don't escalate to `--force` without explicit confirmation; this is one of the few things a local `git status` check can't safely resolve on its own.

### Step 8 — Draft PR title and body

**Title** — one line, release-notes friendly. Derive from:

- single `feat:` commit if PR has exactly one — use description (without `feat(scope):` prefix) capitalised, or
- concise summary of PR's work otherwise.

Examples:

- `Inline card editing during study sessions` (single feat commit)
- `Study session inline editing and architecture cleanup` (multiple commits, mixed types)

Avoid repeating Conventional-Commits prefix in title — GitHub release tooling reads commit subjects, not PR titles, and humans don't need `feat(study-session):` twice.

**Ticket prefix (`--ticket <ID>`).** If the skill was invoked with `--ticket <ID>`, prepend the ticket key to the drafted title: `TARO-<ID>: <title>` — e.g. `TARO-207: Close open modals and clear caches on logout`. Prefix only; the rest of the title is derived exactly as above. Do **not** add the prefix when `--ticket` is absent, and never put the ticket key into commit subjects (Notes).

**Body** — structured for skim:

```md
## Summary

<1–3 sentence overview of the user-visible outcome and why this PR exists.>

## Changes

- <bullet per meaningful change, grouped by commit type if helpful>
- ...

## Test plan

- [ ] <what to verify, manually or automated>
- [ ] ...
```

If `.github/pull_request_template.md` exists, use its structure and fill sections.

Keep body tight. One short paragraph + handful of bullets beats wall of text.

### Step 9 — Create the PR

**Create the PR directly — never as a draft, never via the `--web` pre-filled form.** The PR opens immediately and CI is watched right away — nothing is left for the user to submit.

```sh
gh pr create \
  --base master \
  --title "<title from Step 8>" \
  --body "<body from Step 8>"
```

- Do **not** pass `--draft` and do **not** pass `--web`.
- Capture the URL `gh pr create` prints — needed for the Step 11 report.
- The PR number is available the moment `gh pr create` returns (`gh pr view --json number,url`), so Step 10 can start watching CI right away.

Immediately after the PR is created, open it in the user's browser — the user wants to watch CI themselves from the start, not just get a URL in the final report:

```sh
open "<pr-url>"
```

(macOS `open`; fall back to `gh pr view <pr-number> --web` if `open` is unavailable.) If this fails (headless environment, no display), skip silently and just leave the URL in the Step 11 report.

If `gh` is unavailable or auth failed in Step 1: print the title, body, and base as fenced blocks so the user can create manually, then note the CI watch was skipped.

### Step 10 — Watch CI and coverage (skip with `--no-watch`)

After the PR is created, block on its CI run, diagnose failures, and inspect the coverage report. Skip this step entirely if invoked with `--no-watch`.

Because Step 9 creates the PR directly, the PR number is already available — resolve it with `gh pr view --json number,url` and start watching immediately.

#### 10a — Wait for checks to settle

```sh
gh pr checks <pr-number> --watch
```

This blocks until every required check finishes. The command exits non-zero if any check fails.

Don't poll in a sleep loop — `--watch` is the supported wait primitive. If `gh pr checks --watch` is unavailable on the user's gh version, fall back to `gh run watch <run-id>` for the most recent workflow run on the PR's head SHA.

While waiting: do not start unrelated work. The expected outcome is either a green run (continue to 10c) or a failure to diagnose (10b).

#### 10b — Diagnose failures

For each failing check:

1. `gh pr checks <pr-number>` — list status of all checks; identify which failed.
2. `gh run view <run-id> --log-failed` — read the actual failure output for the failing job.
3. Classify the failure:
   - **Real regression introduced by this branch** — a test the branch broke, a type error in changed code, a lint rule the branch violated, a build failure tied to the branch's edits.
   - **Flaky test or failure already red on `master`** — a non-deterministic test, a race-prone assertion, or a check that's failing on `master` too. Default to fixing it in this branch — leaving flakes / master-red tests in place erodes CI signal and every future PR has to mentally filter them out. **Exception**: if the root cause is a big lift (significant refactor, infra change, multi-file rewrite, anything that would dwarf the actual PR scope), defer it. Log under Deferred items with: the failing test, the root-cause hypothesis, and a one-line estimate of why the fix is non-trivial.
   - **Ambiguous** — make the best-supported call yourself (favour the safer, smaller fix) and record the reasoning under Deferred items / the report rather than pausing for input.
4. Apply the fix:
   - **Minor (≤ ~20 lines, mechanical)** — fix directly, commit with a `fix(<scope>):` Conventional Commit (or `test(<scope>):` if the fix is the test itself), push, and wait for re-run. Examples: missed import, wrong type annotation, formatter drift, test expecting old i18n string, missing `data-testid`, race fixed by replacing a sleep with an event-driven wait.
   - **Non-minor** (behavioural test failures that suggest the branch changed semantics, schema/migration errors, structural rework of a flake) — still fix it autonomously if you're confident in the root cause; commit and push as above. Only genuinely block (see "when to abort the watch" below) when the change touches auth/billing/RLS or otherwise needs human judgement to be safe.
5. For flake fixes specifically: identify the root cause (timing, shared state, ordering, env drift) before patching. Re-running until green is not a fix. If the root cause requires changes outside this branch's scope, fix it anyway and call it out in the Step 11 report — fixing a flake here saves every subsequent PR.
6. After fixing, return to 10a and re-watch. If a check keeps failing after two fix attempts, stop and hand back to the user per "when to abort the watch" below rather than firing more guesses.

Never disable, mark `it.skip`, or comment out a failing test to make CI green. Treat the test as authoritative.

#### 10c — Inspect coverage

After CI is green, check whether coverage regressed against `master`.

1. Pull the merge-base coverage baseline: `gh api repos/<owner>/<repo>/actions/artifacts` or `gh run download <master-run-id> --name coverage` — depends on how the project publishes coverage (look at `.github/workflows/` and the CI logs for the artifact name).
2. Pull the PR's coverage: same approach on the PR's most recent run.
3. Compare top-line `lines` / `branches` / `functions` / `statements` percentages.
4. If any metric dropped by **more than 0.2 percentage points** relative to the baseline, treat that as a regression to fix.
5. Drill into the per-file diff to find which changed file lost coverage. Common causes: new branch in changed file with no test, dead error path, new component with partial rendering test.
6. Invoke the `update-tests` skill on the affected files (or, if the skill isn't a fit, write the tests directly following its conventions). Default to the bias rule in `update-tests`: don't skip just because "no test file exists yet" or "out of scope."
7. Commit the new tests as `test(<scope>): …`, push, wait for CI to re-run, and verify coverage recovered.

If the CI workflow doesn't publish a coverage artifact, note that under Deferred items rather than guessing. Don't run `vp test --coverage` locally as a substitute — it tells you the branch's coverage in isolation, not whether the PR regressed against `master`.

#### When to abort the watch

Stop Step 10 and hand back to the user if:

- CI fails repeatedly (≥ 2 fix attempts on the same check) — likely a deeper issue. Summarise the root-cause hypothesis, not just the failure output.
- A failure involves shared infrastructure (DB migrations against prod, secrets, CDN) or touches auth/billing/RLS in a way that needs human judgement to fix safely.
- The user pushes their own commits while you're waiting — let them drive, surface what's left.

"This test is flaky / red on master" is **not** an automatic reason to stop — default to fixing (see 10b step 3). Defer (don't stop) only when the root-cause fix would be a big lift outside this PR's scope; in that case log it under Deferred items and continue.

Record what happened in the Step 11 report (CI status, fixes applied, coverage delta) so the user can see at a glance what was done after the PR opened.

### Step 11 — Report

Output summary:

```
PR: <branch>   (base: master)   (was: <old-name>)   # omit "was" if unchanged
  <url>
  Commits renamed: <n>
  CI: <green | fixed after N attempts | needs attention — see Deferred items>
  Coverage: <unchanged | regressed and fixed | flagged>
```

If anything was deferred, skipped, or needed a judgment call instead of a real fix (gh unavailable, push blocked, an ambiguous CI failure you resolved by best guess, a flake deferred as a big lift), list it under **Deferred items** so it isn't forgotten.

## Notes

- **Scope is always `master..HEAD`.** Never rewrite or rename anything already on `master`/`main`.
- Don't prefix subjects with ticket numbers; belong in body as `Refs: PROJ-123` trailer if used.
- Don't add co-author trailers during rename — leave authorship alone.
- If branch is based on something other than `master`, adjust base-ref everywhere (`master..HEAD`, `--base master`) accordingly and note the substitution in the Step 11 report.
