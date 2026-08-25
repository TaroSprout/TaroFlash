---
name: prepare-pr
description: Fully autonomous — prepare a branch for PR by rewriting commit messages into release-notes-friendly Conventional Commits, renaming the branch if it no longer fits the changes, running a lint + type-check + knowledge-pointer gate, drafting a PR title and body, then creating a single PR directly (not a draft) and watching CI until green. Works on a named branch against a named base without checking anything out. Never asks for permission or feedback before the PR opens. Use when a feature branch is code-complete and ready for review.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
argument-hint: '[--branch <name>] [--base <ref>] [--no-watch] [--ticket <ID>] [--ticket-url <URL>] [--acceptance <path>]'
arguments:
  - name: --branch <name>
    description: The branch to open the PR for. Defaults to the checked-out branch. Never checked out — the working tree does not move.
  - name: --base <ref>
    description: The base the PR merges into and the diff is taken against (default `master`). Pass a peer branch to stack this PR on it.
  - name: --no-watch
    description: Skip the post-create CI watch (Step 10).
  - name: --ticket <ID>
    description: Prefix the PR title with the ticket key `TARO-<ID>` (e.g. `TARO-207: …`). Omit for no prefix.
  - name: --ticket-url <URL>
    description: Notion ticket URL. When given alongside `--ticket`, the PR body opens with a `[TARO-<ID>](<URL>)` link line. Omit to render just `TARO-<ID>` text (or nothing if `--ticket` is also absent).
  - name: --acceptance <path>
    description: File holding the ticket's acceptance criteria, one per line. The PR body answers every one of them (Step 8).
lastUpdated: 2026-07-31T00:00:00Z
---

## Args

- **`--branch <name>`** (optional) — the branch the PR is opened for. Defaults to the checked-out branch. **The working tree never moves**: every inspection reads refs (`<base>..<branch>`), and `gh pr create --head <branch>` opens the PR with nothing checked out. A caller orchestrating several branches gets one PR each without a human's tree being dragged around.
- **`--base <ref>`** (optional, default `master`) — the base branch. It is the diff range's left side, the `--base` of `gh pr create`, and the ref every "is this already on the base" judgement is made against. Pass a peer branch to stack this PR on it.
- **`--acceptance <path>`** (optional) — a file of the ticket's acceptance criteria, one per line. The body answers each (Step 8).
- **`--no-watch`** (optional) — skip the post-create CI watch (Step 10). Default behaviour blocks on CI after opening the PR until every check settles, fixing failures as they surface.
- **`--ticket <ID>`** (optional) — the Notion Task Board ticket ID this PR resolves. When given, the PR **title** is prefixed with `TARO-<ID>: ` and the PR **body** opens with a ticket-link line (Step 8). This affects the PR title and body only — commit subjects stay clean (ticket refs still belong in a commit-body `Refs:` trailer, per Notes). Omit to open a PR with no ticket prefix or link.
- **`--ticket-url <URL>`** (optional) — the Notion page URL for the ticket. When given with `--ticket`, the body's top line renders as a markdown link `[TARO-<ID>](<URL>)`. Without it, the top line falls back to plain `TARO-<ID>` text. Ignored when `--ticket` is absent.

## Fully autonomous — no approval gates

This skill never stops to ask for permission or feedback before the PR opens. It always:

- Produces **exactly one PR** per run. There is no split mode — the whole branch's work always lands as a single PR.
- Makes its own calls on commit grouping, message wording, branch renaming, and CI-failure classification, and records those calls in the Step 11 report instead of pausing to ask.
- Only stops mid-run for the hard-safety cases called out in Step 10's "when to abort the watch" — those are genuine stop-and-report conditions, not permission requests, and they happen only _after_ the PR is already open.

## Why this skill exists

Feature branches accumulate vague commits ("fix", "tests", "refactor study-session to be cleaner"), stale branch names, unrelated drive-bys, no release-notes thought. Skill fixes all of it in one autonomous pass so the PR is ready for review and merge lands clean in the changelog.

Output:

1. The branch's own work bundled into one PR, with anything else in the tree left where it was.
2. All branch commits grouped into a single PR.
3. Commits renamed to **Conventional Commits** (see style guide below).
4. Branch renamed if slug no longer fits.
5. Working tree lint-, type- and knowledge-clean (gate run, issues fixed) before any push.
6. Branch pushed (force-with-lease if rewritten, fresh push if new).
7. PR **created directly** via `gh pr create` — no browser, never a draft — then its CI watched until green.

History may be published — **user pre-authorised force-push on this branch** — don't block on upstream.

## Conventional Commits

Message format, the allowed type list, scope, and squash discipline are owned by
[`commit-authoring`](../../rules/commit-authoring.md). Rewrite every message to that spec — this
skill adds only the PR-time constraints below.

- Keep the subject under ~72 chars so it reads in a changelog and in `git log --oneline`.
- Prefer a scope already used on this branch or in recent `git log` over inventing a new one.

## Workflow

### Step 1 — Sanity check

Resolve `<branch>` (from `--branch`, else `git rev-parse --abbrev-ref HEAD`) and `<base>` (from `--base`, else `master`). **Every command below names those refs; none of them checks anything out.**

```sh
git log <base>..<branch> --oneline
git diff <base>..<branch> --stat
git status --short
gh auth status
```

Block and warn if any true:

- `<branch>` is `master` or `main`.
- `<base>..<branch>` empty **and** nothing pending for this branch. Nothing to prepare.
- `gh` not authenticated. Final step need it; authenticate now or agree to skip auto-open.

**Pending work is committed only when `<branch>` is the checked-out branch**, and only the paths that branch's work touched. A branch handed over by someone else is already complete — leave the tree alone entirely.

When it is checked out, read `git diff` and `git diff --cached`, and decide **per path** whether it belongs to this branch's work. Then:

- **Stage explicit pathspecs** — `git add <path> …`, one commit per concern with a Conventional Commits message. **Never `git add -A`, never `git add .`, never `git commit -a`**: the user keeps unrelated edits in the tree, and a blanket add sweeps them into someone else's PR ([`commit-authoring`](../../rules/commit-authoring.md)).
- **Untracked files are opted in one at a time**, never swept. A path you can't tie to this branch's work stays untracked.
- Name in the Step 11 report every path you left uncommitted, so the user can see what stayed behind.

Note the branch's current upstream (`git rev-parse --abbrev-ref --symbolic-full-name <branch>@{u} 2>/dev/null`) so the push step can decide flags.

### Step 2 — Inspect each commit

For each SHA from `git log <base>..<branch> --oneline`, run:

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

The whole branch always lands as a single PR — there is no split mode. Build the rename table for every commit in `<base>..<branch>`:

| SHA (short) | Current                                | Proposed                                                                  |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `71538c8`   | add edit functionality to session      | `feat(study-session): edit card text mid-session`                         |
| `e6d0a22`   | Refactor study-session to be cleaner   | `refactor(study-session): extract composables and introduce deck context` |
| `7475c52`   | refactor card editing network pipeline | `refactor(cards): replace CardRecord class with saveCard API`             |

Apply directly — no approval pause. Messages already good Conventional Commits can stay as-is. Record the table in the Step 11 report so the user can see what changed.

### Step 4 — Rewrite commit messages

**`filter-branch` refuses to run against a dirty tree, and it rewrites whatever is checked out.** So run it in a scratch worktree for `<branch>` — the user's tree keeps its uncommitted work and never moves:

```sh
git worktree add "$TMPDIR/prepare-pr-$$" <branch>
# …rewrite there, then…
git worktree remove "$TMPDIR/prepare-pr-$$"
```

Skip the scratch worktree only when `<branch>` is checked out **and** `git status --short` is empty.
**Remove it even when the rewrite fails partway** — a failed `filter-branch` still leaves a worktree
behind; check it per [`git-workflow`](../../rules/git-workflow.md) and remove it before you stop or
report, not only on the path where the rewrite succeeded.

**`git worktree add` can fail** — most commonly because `<branch>` is already checked out in a
sibling worktree. Check its own exit status directly; never pipe it through `tail`/`head`/`grep`
first, which replaces that status with the filter's and lets `set -e` sail past a failed checkout.
Then `cd` into the new path and verify you landed there (e.g. `pwd` matches the worktree path, or
`git rev-parse --show-toplevel` resolves to it) before running anything from this step onward —
`filter-branch`, `reset --soft`, or any commit. A `cd` into a directory that was never created also
fails silently and leaves later commands running against whatever tree the shell was already in,
which for `git reset --soft` / `git commit` means rewriting the user's own checked-out branch.

Inside it, use `git filter-branch --msg-filter` with `case` on `$GIT_COMMIT` (pre-rewrite SHA). Preserves authorship, dates, trailers, parentage — only subject changes.

```sh
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter '
case "$GIT_COMMIT" in
  <full-sha-1>) echo "<new message 1>" ;;
  <full-sha-2>) echo "<new message 2>" ;;
  *) cat ;;
esac
' <base>..<branch>
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

Verify with `git log <base>..<branch> --oneline` and `git log <base>..<branch> --stat` (diffs unchanged from before rewrite).

### Step 5 — Evaluate and, if needed, rename the branch

PR titles in GitHub UI default to:

- single commit's subject if branch has **one** commit off the base, or
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

### Step 6 — Lint + type-check + knowledge gate (before any push)

Run the linter, the type-checker **and** the knowledge check against `<branch>`'s tree — the scratch worktree from Step 4 when `<branch>` isn't checked out — and fix everything they flag **before** pushing. These are the cheapest CI failures to catch locally, and the most annoying to discover after the PR is already open.

```sh
vp lint
pnpm type-check
node scripts/knowledge-lint.mjs
node scripts/migration-knowledge-gate.mjs --base origin/<base>
```

- **Type-check uses `pnpm type-check` (vue-tsc), not `vp`.** CI runs `pnpm type-check`, and vue-tsc is stricter than `vp check`'s type pass — a `vp`-clean tree can still fail CI on types. Use the same command CI uses so the gate actually matches it.
- **The knowledge check runs on every branch, not just doc branches.** A pointer breaks when the code it names moves. `migration-knowledge-gate.mjs` only speaks when the branch adds a migration; its answer goes in that migration's header, per [`knowledge-addressing`](../../rules/knowledge-addressing.md).
- If all clean → continue to the push.
- If they report errors → fix them. Most lint hits are mechanical (unused import left by a refactor, `prefer-const`, missing return); `vp lint --fix` / `vp fmt <path>` handle the auto-fixable ones — name the paths you touched, per [`FE-formatting`](../../rules/FE-formatting.md). Type errors after a refactor are usually moved/renamed symbols or a changed signature — chase them to the changed call sites.
- Re-run both until clean. Commit the fixes onto the branch with a `fix(<scope>):` or `chore(<scope>):` Conventional Commit (or amend into the commit that introduced the issue if it hasn't been pushed yet and belongs there) so the fix rides with the work it corrects.
- Pre-existing lint warnings unrelated to this branch's diff aren't a blocker — don't expand scope chasing them. Errors (lint or type), and warnings in code this branch touched, must be resolved.

Do not push until `vp lint`, `pnpm type-check` and the knowledge checks are clean.

### Step 7 — Push the branch

User pre-authorised force-push here.

Push by refspec so the branch goes up whether or not it's checked out.

- No upstream previously: `git push -u origin <branch>:<branch>`
- Had upstream under same name: `git push --force-with-lease origin <branch>:<branch>`
- Renamed and had upstream under old name:
  ```sh
  git push -u origin <new-name>:<new-name>
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

**Body** — structured for skim. When `--ticket <ID>` is given, the **first line** of the body is the ticket link, followed by a blank line, before the `## Summary` heading:

- with `--ticket-url <URL>`: `[TARO-<ID>](<URL>)`
- without a URL: plain `TARO-<ID>`

```md
[TARO-<ID>](URL)

## Summary

- <what changed and why>
- <second bullet if it earns its place>

## Acceptance criteria

- [x] <criterion, in the ticket's own words>
- [ ] <criterion> — <why it isn't met, and what would meet it>
```

**Every criterion in `--acceptance` gets a line, in the ticket's order, none dropped or merged.**
Ticked means met, and carries nothing else — a tick with an explanation is a reviewer's cue that it
isn't really ticked. Unticked always carries one, so an unmet criterion can't pass as an oversight.
An unticked box is not a failure to hide: a PR that answers honestly is reviewable, one that ticks
everything is not.

Omit the section when `--acceptance` is absent. Otherwise `## Summary` and nothing else — **never add
a `## Test plan` section**, or any heading the repo template doesn't carry. The user doesn't work a
checklist per PR, and extra headings bury the point.

Omit the ticket-link line entirely when `--ticket` is absent. `.github/pull_request_template.md` is
the source of truth for the body's shape — follow it and fill its sections, still prepending the
ticket-link line above the template body when `--ticket` is given.

Keep body tight. A handful of short bullets beats a wall of text.

### Step 9 — Create the PR

**Create the PR directly — never as a draft, never via the `--web` pre-filled form.** The PR opens immediately and CI is watched right away — nothing is left for the user to submit.

```sh
gh pr create \
  --head <branch> \
  --base <base> \
  --title "<title from Step 8>" \
  --body "<body from Step 8>"
```

- **`--head <branch>` is what keeps the working tree still** — never check a branch out to open its PR.
- Do **not** pass `--draft` and do **not** pass `--web`.
- Capture the URL `gh pr create` prints — needed for the Step 11 report.
- The PR number is available the moment `gh pr create` returns (`gh pr view <branch> --json number,url`), so Step 10 can start watching CI right away.

Immediately after the PR is created, open it in the user's browser — the user wants to watch CI themselves from the start, not just get a URL in the final report:

```sh
open "<pr-url>"
```

(macOS `open`; fall back to `gh pr view <pr-number> --web` if `open` is unavailable.) If this fails (headless environment, no display), skip silently and just leave the URL in the Step 11 report.

If `gh` is unavailable or auth failed in Step 1: print the title, body, and base as fenced blocks so the user can create manually, then note the CI watch was skipped.

### Step 10 — Watch CI (skip with `--no-watch`)

After the PR is created, block on its CI run and diagnose any failures. Skip this step entirely if invoked with `--no-watch`.

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

#### When to abort the watch

Stop Step 10 and hand back to the user if:

- CI fails repeatedly (≥ 2 fix attempts on the same check) — likely a deeper issue. Summarise the root-cause hypothesis, not just the failure output.
- A failure involves shared infrastructure (DB migrations against prod, secrets, CDN) or touches auth/billing/RLS in a way that needs human judgement to fix safely.
- The user pushes their own commits while you're waiting — let them drive, surface what's left.

"This test is flaky / red on master" is **not** an automatic reason to stop — default to fixing (see 10b step 3). Defer (don't stop) only when the root-cause fix would be a big lift outside this PR's scope; in that case log it under Deferred items and continue.

Record what happened in the Step 11 report (CI status, fixes applied) so the user can see at a glance what was done after the PR opened.

### Step 11 — Report

Output summary:

```
PR: <branch>   (base: <base>)   (was: <old-name>)   # omit "was" if unchanged
  <url>
  Commits renamed: <n>
  Left uncommitted: <paths, or "nothing">
  Acceptance: <n met / n total>
  CI: <green | fixed after N attempts | needs attention — see Deferred items>
```

If anything was deferred, skipped, or needed a judgment call instead of a real fix (gh unavailable, push blocked, an ambiguous CI failure you resolved by best guess, a flake deferred as a big lift), list it under **Deferred items** so it isn't forgotten.

## Notes

- **Coverage percentages are deliberately not read here — don't re-add that.** They aren't comparable across runs, because the instrumented file set varies with what a given run touched: one PR reported 94.77% lines against a denominator ~620 lines smaller than its neighbours, which reads as a 5pp regression and isn't one. Chasing it costs a round of tests written for a problem that doesn't exist. CI's own gate on the branch's uncovered files is a different thing and is watched like any other check.
- **The Step 10 watch covers every check, not just tests.** Coverage, knowledge pointers, unfinished-work markers, types — a red check is a red check, and the PR isn't done until all of them settle green.
- **Scope is always `<base>..<branch>`.** Never rewrite or rename anything already on the base.
- Don't prefix subjects with ticket numbers; belong in body as `Refs: PROJ-123` trailer if used.
- Don't add co-author trailers during rename — leave authorship alone.
