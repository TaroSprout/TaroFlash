---
name: fork-dev
description: Spin up an isolated named dev server for a specific agent or branch. Creates a git worktree with a symlinked node_modules, starts Vite with a unique browser tab title, and reports the local URL. Use when you need to run multiple dev servers simultaneously for parallel agent work.
allowed-tools: Bash
argument-hint: '<description of work>'
arguments:
  - name: description
    description: A plain-English description of the work this dev server is for (e.g. "add dark mode toggle"). Used to infer the worktree name, branch, and port.
lastUpdated: 2026-06-14T00:00:00Z
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

```sh
git worktree add ../TaroFlash-<slug> <branch>
```

Symlink `node_modules` so Vite runs without a fresh install:

```sh
ln -s "$(pwd)/node_modules" "../TaroFlash-<slug>/node_modules"
```

Copy gitignored env files if they exist:

```sh
[ -f .env ] && cp .env ../TaroFlash-<slug>/.env
[ -f .env.local ] && cp .env.local ../TaroFlash-<slug>/.env.local
```

### Step 4 — Start the dev server

Run in the background (`run_in_background: true`):

```sh
cd ../TaroFlash-<slug> && VITE_APP_TITLE="[<slug>] TaroFlash" node_modules/.bin/vp dev --port <port> --host 2>&1 | tee /tmp/fork-dev-<slug>.log
```

Wait ~3 seconds, then read the log to confirm the actual port Vite bound to:

```sh
grep -m1 "Local:" /tmp/fork-dev-<slug>.log
```

Retry once after 2 more seconds if the log isn't ready yet.

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
