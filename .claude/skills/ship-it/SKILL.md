---
name: ship-it
description: The end-of-session ritual. Pulls the current branch's work (committed + uncommitted) into an isolated git worktree, runs the `update-tests` skill and waits on it, then runs the fully-autonomous `prepare-pr` skill to open a single PR and watch CI to green — no permission prompts along the way. Notifies when done. Use when a session's work is code-complete and you want it tested, committed, and shipped as a PR without further back-and-forth.
allowed-tools: Read, Bash, Glob, Grep, Skill
argument-hint: '[additional-context]'
arguments:
  - name: additional-context
    description: Optional context to pass through to update-tests (same as its own argument).
lastUpdated: 2026-07-03T00:00:00Z
---

## What this skill does

This is the thing you'd otherwise do by hand at the end of every session: get the work into a clean isolated worktree, make sure it's tested, then ship it as a PR and babysit CI. `ship-it` chains three steps with no pauses in between:

1. **Worktree** — move the current branch's work (committed _and_ uncommitted) into a fresh git worktree, freeing the main workspace. No dev server is started — this skill doesn't need one.
2. **`update-tests`** — invoked in the worktree, run to completion, waited on.
3. **`prepare-pr`** — invoked in the worktree, fully autonomous: commits everything, opens exactly one PR, watches CI until green, fixes what it can.

Then it reports back and stops. Nothing in this chain asks for confirmation — that's the point.

## Step 1 — Move current work into a worktree

Derive `<slug>` from the current branch name (strip the `feat/`/`fix/`/`chore/` prefix, kebab-case the rest). Target path: `../TaroFlash-ship-<slug>`.

```sh
current_branch=$(git rev-parse --abbrev-ref HEAD)
git status --short
```

Block and warn if `current_branch` is `master` or `main` — nothing to ship.

**Stash uncommitted work** (staged + unstaged + untracked) so it can travel with the branch — worktrees don't share a working directory, but they do share the stash:

```sh
git stash push -u -m "ship-it/<slug>"
```

Skip if the working tree is already clean (`git status --short` empty).

**Free the branch** so it can be checked out in the new worktree — a branch can't be checked out in two worktrees at once:

```sh
git checkout --detach HEAD
```

**Create the worktree**, symlink `node_modules`, copy gitignored env files (same mechanics as `fork-dev` Step 3, minus starting a dev server):

```sh
git worktree add ../TaroFlash-ship-<slug> <current_branch>
ln -s "$(pwd)/node_modules" "../TaroFlash-ship-<slug>/node_modules"
for f in .env .env.local .env.*.local; do
  [ -f "$f" ] && cp "$f" "../TaroFlash-ship-<slug>/$f"
done
```

**Reapply the stash inside the worktree**:

```sh
git -C ../TaroFlash-ship-<slug> stash pop
```

Skip if nothing was stashed.

**Return the main workspace to `master`** so it's free for other work:

```sh
git checkout master
```

Report the worktree path once, then do all remaining work `-C ../TaroFlash-ship-<slug>` (or `cd` into it) — every step below runs there, not in the main workspace.

## Step 2 — Run `update-tests` and wait

Invoke the `update-tests` skill inside the worktree, passing `$ARGUMENTS` through as its `additional-context`. Wait for it to fully finish (it commits its own test changes per its own workflow) before moving on — do not start Step 3 concurrently.

## Step 3 — Run `prepare-pr`

Invoke the `prepare-pr` skill inside the worktree. It is fully autonomous by design: it commits all remaining pending work, opens exactly one PR, and watches CI until green, fixing what it can along the way without pausing for input.

Don't pass `--no-watch` — the point of this chain is to land green, not just open the PR.

## Step 4 — Notify

Once `prepare-pr` returns, report to the user in one short block:

```
Worktree: ../TaroFlash-ship-<slug>  (<branch>)
Tests:    <update-tests summary — one line>
PR:       <url>
CI:       <green | fixed after N attempts | needs attention — see Deferred items>
```

If `prepare-pr` stopped early (its own "when to abort the watch" conditions), surface that clearly — this is the one case where the chain doesn't end green, and the user needs to know before treating the branch as shipped.

The worktree is left in place — nothing here tears it down. Once the PR merges, remove it with `git worktree remove ../TaroFlash-ship-<slug>`.
