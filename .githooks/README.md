# Git hooks

Tracked git hooks for this repo. Activated by pointing git at this directory:

```sh
git config core.hooksPath .githooks
```

Run that once per clone (it's a local git setting, not carried in the repo).

## `post-commit` — the Archivist

Runs [the Archivist agent](../.claude/agents/archivist.md) after each commit to
keep the [`corpus/`](../corpus/) domain-knowledge docs honest. See
[`corpus/CONTRIBUTING.md`](../corpus/CONTRIBUTING.md) for what the corpus and the
Archivist are.

**How it works**

1. `post-commit` runs a cheap synchronous pre-filter, then detaches
   `archivist-review.sh` so your commit returns immediately.
2. The worker runs `claude -p --agent archivist` headlessly over the commit's
   diff. Baseline outcome is **do nothing** — most commits produce no change.
3. When a commit crosses the domain/system line, the Archivist makes the smallest
   corpus edit that fixes the record and commits it **on its own**, isolated:
   a `corpus/`-only commit tagged `[archivist]`. It never blocks, never touches
   your staged index, never pushes.

**It stays quiet unless a change is domain-level.** Two loop guards and a
relevance pre-filter keep it from re-triggering on its own output or waking for
implementation-only commits:

- skips any commit whose message contains `[archivist]`;
- skips commits touching only `corpus/`;
- skips commits that don't touch `supabase/schemas|functions|migrations` or
  `src/api|views|composables|stores|styles`;
- skips merges, rebases, and concurrent runs (`.git/archivist.lock`).

**New hazards** are flagged, not filed: the Archivist writes a `NEW HAZARD:` line
into its commit body (Notion isn't reachable headlessly). Grep the log or its
commits and file the backlog ticket yourself.

**Log:** `.git/archivist.log`.

**Config / opt-out**

- `ARCHIVIST_DISABLE=1` on a commit skips the Archivist for that commit.
- `ARCHIVIST_MODEL=<model>` overrides the model (default `sonnet`).
- Disable entirely: `git config --unset core.hooksPath`.
