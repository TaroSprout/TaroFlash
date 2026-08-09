# Golden Rules

- When reporting information to me, be extremely concise and sacrifice grammar for the sake of conciseness.
- **NEVER touch tests until I explicitly ask.** No checking, running, writing, or updating tests — not after edits, not after refactors, not for reported bugs, not for coverage, not "while I'm here." This holds even when tests clearly should change. At most, note in one line that tests may need attention, then leave them. I will tell you when it's test time. (User-invoked test skills/agents like `/update-tests` are the explicit ask.)
- **Every correction is a defect in the rules, not just the artifact.** Fix what I pointed at, then run the lesson through `.claude/rules/self-heal.md` — every session, not just skill runs. `/heal` is the explicit verb for it.
- **NEVER write user-facing copy without my sign-off.** Any new or changed string a user reads — button labels, headings, empty states, toasts, alerts, error messages, ticket ACs quoting copy — stops and asks. Offer at least 3 reasonably-varied options per line and let me pick; never choose for me, never defer it to "wording TBD". Reusing an existing string is fine, but say which one. This applies everywhere, not just in tickets.
- **Never verify visually in the browser.** Don't open Chrome, curl the dev server, or screenshot a page to check that a change "looks right" — I always confirm visually myself and will give you that feedback directly. Your visual read is worse than mine, so it adds false confidence rather than verification. Driving the browser to _debug_ something genuinely broken is fine and encouraged; the ban is on verification, not on debugging.
- **"Rephrase that" means the framing missed, not just the length.** Re-explain in plain product terms — what the screen shows, what the user experiences — and strip the vocabulary of whatever library or subsystem the answer came from. Shorten in the same pass, but never only shorten.
- **Wiring logic doesn't license inventing UI.** When I ask you to wire up state, behaviour, or a composable, write the script side — refs, computeds, handlers — plus only the structural markup the logic actually needs. Building UI out of **existing paradigms** (`ui-kit` / `layout-kit` primitives, an established pattern from a sibling view) is fine. Inventing novel controls, layouts, or one-off styled elements I didn't ask for is not — expose the state and let me build it.
- Always use translation strings (e.g. `t('deck.settings-modal.title')`) instead of hardcoded text.
- Confirm this file loaded by printing message to console on startup.

# Where the knowledge lives

This file carries only the rules that hold everywhere. Everything else lives in a file that reaches
you when it applies: **`.claude/rules/*.md` with a `paths:` list auto-load the moment you read a
matching file** — don't go hunting for them, and don't restate them in tickets or code comments.

Always in context alongside this file: [`toolchain`](.claude/rules/toolchain.md) (`vp` commands, never
`pnpm`, the `pnpm type-check` gate) · [`git-workflow`](.claude/rules/git-workflow.md) (branching,
Conventional Commits, PR etiquette) · [`self-heal`](.claude/rules/self-heal.md) (turning a correction
into a rule change).

| Working on                               | Loads / read                                                                                                                                                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anything in `src/` or `supabase/`        | [`corpus`](.claude/rules/corpus.md) — domain truths + the **trap register**, `corpus/hazards.md`                                                                                                                            |
| Where code lives, which doc governs it   | [`architecture`](.claude/rules/architecture.md)                                                                                                                                                                             |
| Any `.ts` / `.vue`                       | [`code-style`](.claude/rules/code-style.md), [`FE-formatting`](.claude/rules/FE-formatting.md), [`animations`](.claude/rules/animations.md), [`safari-gotchas`](.claude/rules/safari-gotchas.md)                            |
| A `.vue` file                            | [`vue-templates`](.claude/rules/vue-templates.md), [`vue-script-order`](.claude/rules/vue-script-order.md), [`vue-props`](.claude/rules/vue-props.md), [`css`](.claude/rules/css.md), [`theming`](.claude/rules/theming.md) |
| Copy, locales                            | [`i18n`](.claude/rules/i18n.md)                                                                                                                                                                                             |
| `src/api/`, server data & caching        | [`server-state`](.claude/rules/server-state.md)                                                                                                                                                                             |
| `src/composables/`                       | [`composables`](.claude/rules/composables.md)                                                                                                                                                                               |
| `src/views/`                             | [`skeleton-loading`](.claude/rules/skeleton-loading.md), [`study-session-architecture`](.claude/rules/study-session-architecture.md)                                                                                        |
| `src/sfx/`                               | [`sfx`](.claude/rules/sfx.md)                                                                                                                                                                                               |
| `supabase/` — migrations, RLS, functions | [`supabase`](.claude/rules/supabase.md) — **never `supabase db reset`**, always `migration up`                                                                                                                              |
| `tests/`                                 | [`testing`](.claude/rules/testing.md) and its siblings — only when I ask for tests                                                                                                                                          |
| Skills and agents                        | [`skill-authoring`](.claude/rules/skill-authoring.md)                                                                                                                                                                       |
| Tickets — "cut a ticket", "file that"    | [`ticket-authoring`](.claude/rules/ticket-authoring.md) + [`task-board-schema`](.claude/rules/task-board-schema.md) — read by name; they don't auto-load                                                                    |

New tickets always land in `Backlog` — never `Ready`/`Queued`. For a batch, delegate to the
`ticket-author` agent.
