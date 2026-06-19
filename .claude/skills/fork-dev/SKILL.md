---
name: fork-dev
description: Spin up an isolated named dev server for a specific agent or branch. Creates a git worktree with a symlinked node_modules, starts Vite with a unique browser tab title, and reports the local URL. Use when you need to run multiple dev servers simultaneously for parallel agent work.
allowed-tools: Bash
argument-hint: '<description of work> | bring-forward [<slug>]'
arguments:
  - name: description
    description: A plain-English description of the work this dev server is for (e.g. "add dark mode toggle"). Used to infer the worktree name, branch, and port.
  - name: --from-master
    description: Branch the worktree off master instead of the current branch.
  - name: bring-forward
    description: Tear down the active fork and migrate its branch + uncommitted changes back into the main workspace. Pass the slug if more than one fork is active.
lastUpdated: 2026-06-19T00:00:00Z
---

## What this skill does

Takes a plain-English description of the work being done, infers a slug, branch, and free port, then creates a git worktree at `../TaroFlash-<slug>` and starts a named Vite dev server inside it. The browser tab title is set to `[<slug>] TaroFlash` so it's distinguishable when multiple servers are running.

## Steps

### Step 1 — Infer slug, branch, and port

**Slug**: Derive a short kebab-case slug from the description (3–4 words max). Example: "add dark mode toggle" → `dark-mode-toggle`. If `../TaroFlash-<slug>` already exists as a worktree, append the next unused number (`-2`, `-3`, …) to match the saga branch.

**Branch**: Derive a branch name from the slug using the project's naming convention (check `git log --oneline -10` to see the pattern — typically `feat/<slug>` or `chore/<slug>`). This is always a new branch. However, the same work may span a saga of numbered branches — check `git branch` for `<branch>`, `<branch>-2`, `<branch>-3`, etc. and pick the next unused number. If no existing saga, use the bare name (no suffix).

**Port**: Find the next free port starting from 5174:

```sh
for port in 5174 5175 5176 5177 5178; do
  lsof -ti :$port > /dev/null 2>&1 || { echo $port; break; }
done
```

### Step 2 — Check for an existing worktree

```sh
git worktree list
```

If a worktree at `../TaroFlash-<slug>` already exists, skip creation and jump to Step 4. Report that you're reusing it.

### Step 3 — Create the worktree

This is always a **new** branch, so use `-b`. Branch from the current branch by default; use `master` only when `--from-master` was passed:

```sh
# default — branch from current HEAD
git worktree add -b <branch> ../TaroFlash-<slug> HEAD

# with --from-master
git worktree add -b <branch> ../TaroFlash-<slug> master
```

Use the bare form (no `-b`) only when reusing an existing branch that was previously checked out somewhere else.

Symlink `node_modules` so Vite runs without a fresh install:

```sh
ln -s "$(pwd)/node_modules" "../TaroFlash-<slug>/node_modules"
```

Copy all gitignored env files that exist — missing env vars cause silent runtime crashes:

```sh
for f in .env .env.local .env.*.local; do
  [ -f "$f" ] && cp "$f" "../TaroFlash-<slug>/$f"
done
```

### Step 4 — Start the dev server

Run in the background (`run_in_background: true`):

```sh
cd ../TaroFlash-<slug> && VITE_APP_TITLE="[<slug>] TaroFlash" node_modules/.bin/vp dev --port <port> --host 2>&1 | tee /tmp/fork-dev-<slug>.log
```

Poll for the URL instead of sleeping a fixed amount:

```sh
for i in $(seq 15); do grep -m1 "Local:" /tmp/fork-dev-<slug>.log 2>/dev/null && break || sleep 1; done
```

If nothing appears after 15 seconds, read the log and surface the error.

### Step 5 — Report

```
Worktree:   ../TaroFlash-<slug>  (<branch>)
Dev server: http://localhost:<actual-port>/
Tab title:  [<slug>] TaroFlash
Log:        /tmp/fork-dev-<slug>.log

To stop:  kill $(lsof -ti :<actual-port>)
To clean: git worktree remove ../TaroFlash-<slug>
```

## Notes

- The worktree shares the main repo's git object store — branches are isolated from each other and from the main checkout.
- Don't run `vp install` in the worktree — `node_modules` is symlinked from the main repo.
- If `vp dev` fails to start, read `/tmp/fork-dev-<slug>.log` and surface the error.
- `git worktree remove ../TaroFlash-<slug>` will refuse if there are uncommitted changes; use `--force` only after the agent's work is merged or discarded.

---

## `bring-forward` — tear down a fork and return to the main workspace

Invoke when the user says `bring-forward` (optionally followed by a slug).

### Step 1 — Identify the fork

```sh
git worktree list
```

Find all worktrees whose path matches `../TaroFlash-*`. If there is exactly one, derive `<slug>` and `<branch>` from it. If there are multiple, require the user to pass the slug explicitly — surface the list and ask. The main worktree is never a candidate.

### Step 2 — Stash uncommitted changes in the worktree

```sh
git -C ../TaroFlash-<slug> stash push -m "bring-forward/<slug>"
```

If the worktree is clean (`git -C ../TaroFlash-<slug> status --porcelain` is empty), skip — nothing to stash.

### Step 3 — Kill the dev server

Read the port from the fork's log file:

```sh
port=$(grep -m1 "Local:.*localhost:" /tmp/fork-dev-<slug>.log 2>/dev/null | grep -oE '[0-9]{4,5}' | tail -1)
[ -n "$port" ] && kill $(lsof -ti :$port) 2>/dev/null || true
```

### Step 4 — Remove the worktree

```sh
git worktree remove --force ../TaroFlash-<slug>
```

`--force` handles any leftover untracked files (e.g. the symlinked `node_modules`).

### Step 5 — Clean the main workspace if needed

`gsync` requires a clean working tree. If the main workspace has uncommitted changes, stash them first:

```sh
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash push -m "bring-forward/main-workspace"
  main_was_dirty=true
fi
```

### Step 6 — Run gsync

```sh
gsync
```

This fast-forwards `master`, switches to it, and prunes gone branches.

### Step 7 — Checkout the working branch

```sh
git checkout <branch>
```

### Step 8 — Reapply changes

Pop the worktree stash first (these are the real in-progress changes):

```sh
git stash pop
```

If the main workspace was also stashed (Step 5), pop that too and tell the user:

```sh
git stash pop   # second pop for main-workspace stash
```

### Step 9 — Report

```
Branch:   <branch>
Stash:    applied  (or "nothing to apply" if worktree was clean)
gsync:    done
Server:   killed (port <port>)
Worktree: removed
```

If the main workspace had a stash, surface a note: "Your main-workspace changes were re-applied on top — check `git diff` to confirm."
