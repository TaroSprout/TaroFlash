---
name: prepare-pr
description: Prepare a branch for PR by committing any pending work, rewriting commit messages into release-notes-friendly Conventional Commits, renaming the branch if it no longer fits the changes, running a lint gate, drafting a PR title and body, then creating the PR directly (not a draft) and watching CI. Bundles all branch work — committed AND uncommitted (staged + unstaged) — into the PR by default. Pass `--split` to additionally analyse whether the work should be split into a stack of smaller PRs. Use when a feature branch is code-complete and ready for review.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
argument-hint: '[--split] [--no-watch]'
arguments:
  - name: --split
    description: Analyse the branch and propose splitting unrelated/oversized work into a stack of smaller PRs.
  - name: --no-watch
    description: Skip the post-create CI watch + coverage check (Step 12).
lastUpdated: 2026-06-23T00:00:00Z
---

## Args

- **`--split`** (optional) — analyse the branch and propose splitting unrelated or oversized work into a stack of smaller PRs (Steps 3 and 4). Without this flag, the whole branch is treated as a single PR — those steps are skipped.
- **`--no-watch`** (optional) — skip the post-create CI watch + coverage check (Step 12). Default behaviour blocks on CI after opening the PR(s) until checks settle, then inspects coverage and writes more tests if it regressed.

## Why this skill exists

Feature branches accumulate vague commits ("fix", "tests", "refactor study-session to be cleaner"), stale branch names, unrelated drive-bys, no release-notes thought. Skill fix all in one pass so PR ready for review and merge lands clean in changelog.

Output:

1. All branch work — committed AND uncommitted (staged + unstaged) — bundled into the PR. Uncommitted changes are committed as part of the workflow.
2. Branch commits grouped into one PR by default, or (with `--split`) into a stack of smaller PRs.
3. Commits renamed to **Conventional Commits** (see style guide below).
4. Branches renamed if slug no longer fit.
5. Working tree lint-clean (lint gate run, issues fixed) before any push.
6. Branches pushed (force-with-lease if rewritten, fresh push if new).
7. Each PR **created directly** via `gh pr create` — no browser, never a draft — for both single and multi-PR plans, then its CI watched.

History may be published — **user pre-authorised force-push on this branch** — don't block on upstream. Still surface actions before doing them.

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

Combine them into one logical view of pending work. Group by concern if multiple distinct changes are present, propose Conventional Commits messages (one commit per concern), wait for approval, then stage + commit each group. Treat the new commits as part of the branch for the rest of the workflow.

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

### Step 3 — Decide: one PR or several (only with `--split`)

**Skip this step entirely unless invoked with `--split`.** Default behaviour treats the whole branch as a single PR; jump to Step 5 with `<base>..HEAD` as the one group.

When `--split` is passed, decide single PR or split. Two forces push toward splitting:

**A. Unrelated concerns.** Commits touching different areas, could merge in any order. Review load, revert blast radius, changelog noise all worse when unrelated work rides together.

Signs:

- Different top-level domains/scopes, no shared code changes (e.g. `study-session` feature + `skills` tooling).
- One commit revertable without affecting others.
- Commit types tell you: `feat` + `chore` sharing no files ≈ two PRs.
- Drive-by fix, tooling change, or doc update tacked onto feature branch.

**B. Size.** Even related work unreviewable past a size. Reviewers skim or rubber-stamp big PRs.

Rough thresholds (judgment, not hard rule):

- **> ~400 net lines changed** or **> ~15 files touched** → consider split.
- **> ~800 net lines** → split unless mostly mechanical (generated, renames, lockfile churn). Call out mechanical portions so reviewers skim.
- Multiple logical phases (e.g. "introduce abstraction" → "migrate callers" → "delete old API") → each phase natural split point.

**Keep together when:**

- Commits tightly coupled, final state only makes sense as unit.
- Total size small (under thresholds).
- All share scope and single user-visible outcome.

Propose grouping as short plan:

```
Proposed PRs:
  1. <branch-name-1> — <one-line summary>
     - <sha> <subject>
     - <sha> <subject>
  2. <branch-name-2> — <one-line summary>   [stacked on #1]
     - <sha> <subject>
```

If PR depends on another (later PR's commits need earlier PR's changes to compile/run/make sense), mark stacked. **Wait for approval** before proceeding. If user want single PR, skip to Step 5 with whole branch as one group.

### Step 4 — Plan the split (only with `--split`, and only if Step 3 chose to split)

For each proposed PR, decide:

- **Branch name** — kebab-case, 3–6 words, describes PR's primary change. See Step 6 rules.
- **Base branch** — `master` for first (or only independent) PR. For stacked, base is previous PR's branch.
- **Commits** — SHAs belonging in this PR, in order.

Execute split. Mechanics depend on shape:

**Case A — Contiguous commits, splittable by cut point.** Commits already ordered so each PR's commits contiguous. Use `git branch` + `git reset` to carve:

```sh
# Starting state: current branch has commits A - B - C - D off master.
# Want PR#1 = A, B (base master) and PR#2 = C, D (base PR#1's branch).

git branch <pr2-branch>            # mark current tip for later
git reset --hard <sha-of-B>        # current branch now ends at B → becomes PR#1
git branch -m <pr1-branch>         # rename if needed
# PR#2's branch already points at D; its base will be <pr1-branch>
```

**Case B — Non-contiguous or interleaved commits.** Cherry-pick relevant commits onto fresh branches off correct base:

```sh
git checkout -b <pr1-branch> master
git cherry-pick <sha-a> <sha-c>    # PR#1's commits
git checkout -b <pr2-branch>       # off <pr1-branch>
git cherry-pick <sha-b> <sha-d>    # PR#2's commits, which depend on PR#1
```

After either case, run `git log <base>..HEAD --oneline` on each branch to confirm expected commits present, and `git diff <base>..HEAD --stat` to confirm diff expected. If cherry-pick hits conflict, stop and surface — don't resolve speculatively.

Keep note of which branch is which PR and each base. Remaining steps run **per branch**.

### Step 5 — Propose new commit messages

Per branch, show table:

| SHA (short) | Current                                | Proposed                                                                  |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `71538c8`   | add edit functionality to session      | `feat(study-session): edit card text mid-session`                         |
| `e6d0a22`   | Refactor study-session to be cleaner   | `refactor(study-session): extract composables and introduce deck context` |
| `7475c52`   | refactor card editing network pipeline | `refactor(cards): replace CardRecord class with saveCard API`             |

**Wait for approval.** Integrate user edits. Messages already good Conventional Commits can stay — call out rather than re-propose verbatim.

### Step 6 — Rewrite commit messages

Run per branch with messages to rewrite. Use `git filter-branch --msg-filter` with `case` on `$GIT_COMMIT` (pre-rewrite SHA). Preserves authorship, dates, trailers, parentage — only subject changes.

```sh
git checkout <branch>
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter '
case "$GIT_COMMIT" in
  <full-sha-1>) echo "<new message 1>" ;;
  <full-sha-2>) echo "<new message 2>" ;;
  *) cat ;;
esac
' <base>..HEAD
```

Use **full** 40-char SHAs in case — short SHAs won't match. `<base>` is `master` for root PR and parent PR's branch for stacked.

For multi-line messages (body after blank line), use heredoc inside case arm:

```sh
<sha>) cat <<'EOF'
feat(study-session): edit card text mid-session

Adds an edit button on the study card that swaps in a text editor
and debounces saves through saveCard.
EOF
;;
```

Verify with `git log <base>..HEAD --oneline` and `git log <base>..HEAD --stat` (diffs unchanged from before rewrite).

If stacked, rewrite base PR first, then rebase stacked children onto rewritten base so they pick up new parent SHAs:

```sh
git checkout <child-branch>
git rebase <parent-branch>
```

### Step 7 — Evaluate and, if needed, rename each branch

PR titles in GitHub UI default to:

- single commit's subject if branch has **one** commit off base, or
- branch name humanised (kebab-case → spaces, capitalised) if multiple commits.

So branch name is primary lever for good default title with multiple commits. Even with single commit, tidy branch name reads better in PR list and branch sidebar.

Per branch, compare name to commit subjects. If still fits, keep. Else propose kebab-case slug:

- 3–6 words
- Describes primary change for that PR (feature focus or primary refactor)
- Lowercase, hyphen-separated
- No ticket prefix unless repo convention uses one (check recent merged via `gh pr list --state merged --limit 10`)
- Humanises into clean sentence — e.g. `study-session-inline-edit-cleanup` → "Study session inline edit cleanup"

Show old → new, wait for approval, rename:

```sh
git branch -m <old-name> <new-name>
```

### Step 8 — Lint + type-check gate (before any push)

Run the linter **and** the type-checker on the working tree and fix everything they flag **before** pushing — these are the cheapest CI failures to catch locally, and the most annoying to discover after the PR is already open.

```sh
vp lint
pnpm type-check
```

- **Type-check uses `pnpm type-check` (vue-tsc), not `vp`.** CI runs `pnpm type-check`, and vue-tsc is stricter than `vp check`'s type pass — a `vp`-clean tree can still fail CI on types. Use the same command CI uses so the gate actually matches it.
- If both clean → continue to the push.
- If they report errors → fix them. Most lint hits are mechanical (unused import left by a refactor, `prefer-const`, missing return); `vp lint --fix` / `vp fmt` handle the auto-fixable ones. Type errors after a refactor are usually moved/renamed symbols or a changed signature — chase them to the changed call sites.
- Re-run both until clean. Commit the fixes onto the relevant branch with a `fix(<scope>):` or `chore(<scope>):` Conventional Commit (or amend into the commit that introduced the issue if it hasn't been pushed yet and belongs there) so the fix rides with the work it corrects.
- Pre-existing lint warnings unrelated to this branch's diff aren't a blocker — don't expand scope chasing them. Errors (lint or type), and warnings in code this branch touched, must be resolved.

Run this once for the whole working tree on a single-PR run; for `--split` runs, gate each carved branch before its own push (a fix may belong to only one of them).

Do not push until both `vp lint` and `pnpm type-check` are clean.

### Step 9 — Push branches

User pre-authorised force-push here.

Per branch:

- No upstream previously: `git push -u origin <branch>`
- Had upstream under same name: `git push --force-with-lease`
- Renamed and had upstream under old name:
  ```sh
  git push -u origin <new-name>
  git push origin --delete <old-name>
  ```

Push stacked in order — parents before children — so GitHub resolves base refs correctly.

If `--force-with-lease` rejected on any branch, stop and surface output. Remote has commits you don't have locally. Don't escalate to `--force` without explicit confirmation.

### Step 10 — Draft PR title and body (per PR)

**Title** — one line, release-notes friendly. Derive from:

- single `feat:` commit if PR has exactly one — use description (without `feat(scope):` prefix) capitalised, or
- concise summary of PR's work otherwise.

Examples:

- `Inline card editing during study sessions` (single feat commit)
- `Study session inline editing and architecture cleanup` (multiple commits, mixed types)

Avoid repeating Conventional-Commits prefix in title — GitHub release tooling reads commit subjects, not PR titles, and humans don't need `feat(study-session):` twice.

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

For **stacked PRs**, add short prelude at top of body pointing to parent so reviewers know context:

```md
> Stacked on #<parent-pr-number-or-branch>. Review after the base PR merges, or review the diff against the parent branch on the "Files changed" tab.
```

If parent PR not opened yet when drafting, reference by branch name and update body later (GitHub renders `#N` references live).

If `.github/pull_request_template.md` exists, use its structure and fill sections.

Keep body tight. One short paragraph + handful of bullets beats wall of text.

### Step 11 — Create each PR

**Create the PR directly — never as a draft, never via the `--web` pre-filled form.** The user wants the PR opened immediately and CI watched, not a form left for them to submit. This is the same for single-PR and multi-PR runs.

```sh
gh pr create \
  --base <base-branch> \
  --title "<title from Step 10>" \
  --body "<body from Step 10>"
```

- Do **not** pass `--draft` and do **not** pass `--web`.
- `<base-branch>` is `master` for the root (or only) PR and the parent PR's branch name for stacked PRs.
- Run parents before children. Capture the URL each invocation prints — needed for the Step 13 report and for substituting `#N` refs into stacked-child bodies before their own create call.
- The PR number is available the moment `gh pr create` returns (`gh pr view --json number,url`), so Step 12 can start watching CI right away — no waiting on a human to submit.

If `gh` is unavailable or auth failed in Step 1: skip this and print each PR's title, body, base as fenced blocks so the user can create manually, then note the CI watch was skipped.

### Step 12 — Watch CI and coverage (skip with `--no-watch`)

After each PR is created, block on its CI run, diagnose failures, and inspect the coverage report. Skip this step entirely if invoked with `--no-watch`. For `--split` runs with multiple PRs, run this step per PR sequentially (parents first) so failures on one don't get masked by noise from the next.

Because Step 11 creates every PR directly, the PR number is already available — resolve it with `gh pr view --json number,url` and start watching immediately. No waiting on a human to submit a form.

#### 12a — Wait for checks to settle

```sh
gh pr checks <pr-number> --watch
```

This blocks until every required check finishes. The command exits non-zero if any check fails.

Don't poll in a sleep loop — `--watch` is the supported wait primitive. If `gh pr checks --watch` is unavailable on the user's gh version, fall back to `gh run watch <run-id>` for the most recent workflow run on the PR's head SHA.

While waiting: do not start unrelated work. The expected outcome is either a green run (continue to 12c) or a failure to diagnose (12b).

#### 12b — Diagnose failures

For each failing check:

1. `gh pr checks <pr-number>` — list status of all checks; identify which failed.
2. `gh run view <run-id> --log-failed` — read the actual failure output for the failing job.
3. Classify the failure:
   - **Real regression introduced by this branch** — a test the branch broke, a type error in changed code, a lint rule the branch violated, a build failure tied to the branch's edits.
   - **Flaky test or failure already red on `master`** — a non-deterministic test, a race-prone assertion, or a check that's failing on `master` too. Default to fixing it in this branch — leaving flakes / master-red tests in place erodes CI signal and every future PR has to mentally filter them out. **Exception**: if the root cause is a big lift (significant refactor, infra change, multi-file rewrite, anything that would dwarf the actual PR scope), defer it. Log under Deferred items with: the failing test, the root-cause hypothesis, and a one-line estimate of why the fix is non-trivial.
   - **Ambiguous** — confirm with the user before editing.
4. Apply the fix:
   - **Minor (≤ ~20 lines, mechanical)** — fix directly, commit with a `fix(<scope>):` Conventional Commit (or `test(<scope>):` if the fix is the test itself), push, and wait for re-run. Examples: missed import, wrong type annotation, formatter drift, test expecting old i18n string, missing `data-testid`, race fixed by replacing a sleep with an event-driven wait.
   - **Non-minor** — propose the fix to the user and wait for explicit go-ahead before editing. Examples: behavioural test failures that suggest the branch changed semantics, schema/migration errors, anything touching auth/billing/RLS, structural rework of a flake (rewriting the test, not the source under test).
5. For flake fixes specifically: identify the root cause (timing, shared state, ordering, env drift) before patching. Re-running until green is not a fix. If the root cause requires changes outside this branch's scope, fix it anyway and call it out in the Step 13 report — fixing a flake here saves every subsequent PR.
6. After fixing, return to 12a and re-watch. If a check keeps failing after one fix attempt, stop, summarise the failure, and ask the user how to proceed rather than firing more guesses.

Never disable, mark `it.skip`, or comment out a failing test to make CI green. Treat the test as authoritative.

#### 12c — Inspect coverage

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

Stop Step 12 and hand back to the user if:

- CI fails repeatedly (≥ 2 fix attempts on the same check) — likely a deeper issue. Summarise the root-cause hypothesis, not just the failure output.
- A failure involves shared infrastructure (DB migrations against prod, secrets, CDN) — needs human judgement.
- The user pushes their own commits while you're waiting — let them drive, surface what's left.

"This test is flaky / red on master" is **not** an automatic reason to stop — default to fixing (see 12b step 3). Defer (don't stop) only when the root-cause fix would be a big lift outside this PR's scope; in that case log it under Deferred items and continue.

Record what happened in the Step 13 report (CI status, fixes applied, coverage delta) so the user can see at a glance what was done after the PR opened.

### Step 13 — Report

Output summary per PR:

```
PR 1: <branch>   (base: master)   (was: <old-name>)   # omit "was" if unchanged
  <url-or-draft-note>
  <new log — short>

PR 2: <branch>   (base: <parent-branch>) [stacked]
  <url>
  <new log — short>
```

Line under header:

- URL returned by each `gh pr create` (e.g. `https://github.com/org/repo/pull/123`) — same for single and multi-PR runs, since every PR is now created directly.

If anything skipped (split declined, rename declined, gh unavailable, push blocked), list under **Deferred items** so not forgotten.

## Notes

- **Scope is always `<base>..HEAD`.** Never rewrite or rename anything already on `master`/`main` — or, for stacked PRs, anything already on parent branch.
- Splitting branch may require reordering or cherry-picking commits onto fresh base. Expected here; not "rewriting history on master" — carving feature-branch history into reviewable units before merge.
- Don't prefix subjects with ticket numbers; belong in body as `Refs: PROJ-123` trailer if used.
- Don't add co-author trailers during rename — leave authorship alone.
- If branch based on something other than `master` (e.g. stacked PR on another feature branch), adjust base-ref everywhere (`<base>..HEAD`, `--base <base>`) and confirm with user first.
- After stacked PRs merge upstream, user may need to rebase remaining children onto `master` — outside skill's scope; flag in report if relevant.
