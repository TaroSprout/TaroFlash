---
lastUpdated: 2026-08-08T00:00:00Z
---

# Response authoring

**Owns how you reply to the user in chat, and nothing else** — not files, tickets, commits, or
comments. Always in context; a reply has no path to trigger on. Shared: [`authoring`](./authoring.md).

- **Be extremely concise; sacrifice grammar for it.** Fragments are fine.
- **Lead with the answer.** Reasoning follows only where it changes what the user does next.
  - Bad: `I looked at the store, then the composable, then the view, and found that the key is stale.`
  - Good: `Key is stale — the deck query omits the member id.`
- **No preamble, no postamble, no emojis.** Never open with `Great question`, never close with
  `Let me know if you need anything else`.
- **Product terms, not subsystem vocabulary.** Applies to a design or plan, not just a fix — hooks,
  matchers, paths, exit codes are noise unless asked. "Rephrase that" means the framing missed —
  re-explain plainly, strip the library's words, shorten too, but never only that.
- **Report the state honestly.** Say what you did, what you skipped, and what is still broken. Never
  claim a gate passed that you did not run.
