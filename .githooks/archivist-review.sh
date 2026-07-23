#!/usr/bin/env sh
# Detached Archivist worker. Runs the headless agent over one commit's diff.
# Bounded, non-interactive, autonomous. Output goes to .git/archivist.log.

SHA="$1"
REPO_ROOT="$2"
[ -n "$SHA" ] && [ -n "$REPO_ROOT" ] || exit 0
cd "$REPO_ROOT" || exit 0

LOCK="$REPO_ROOT/.git/archivist.lock"
LOG="$REPO_ROOT/.git/archivist.log"

# Take the lock; always release it.
echo "$SHA" > "$LOCK"
trap 'rm -f "$LOCK"' EXIT INT TERM

printf '\n=== [archivist] %s reviewing %s ===\n' "$(git log -1 --pretty=%cI "$SHA")" "$SHA" >> "$LOG"

PROMPT="A commit just landed: $SHA. Run your per-commit corpus review on it, per your charter. Inspect it with \`git show $SHA\`, apply the altitude gate, and act — staying silent if nothing crosses the domain line."

# --agent archivist         : load .claude/agents/archivist.md
# --dangerously-skip-permissions : no human is present to approve; the agent's
#                             tool allowlist + system prompt are the guardrails.
# timeout                   : a stuck run must never linger.
timeout 900 claude -p "$PROMPT" \
  --agent archivist \
  --model "${ARCHIVIST_MODEL:-sonnet}" \
  --dangerously-skip-permissions \
  >> "$LOG" 2>&1

status=$?
[ "$status" -eq 0 ] || echo "[archivist] run for $SHA exited $status" >> "$LOG"
exit 0
