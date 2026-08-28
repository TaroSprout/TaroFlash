---
lastUpdated: 2026-08-08T00:00:00Z
paths:
  - 'src/sfx/**/*'
  - 'src/**/*.vue'
---

# Sound effects

**Owns how a sound effect is wired into a component or seam.** Reaches you touching `src/sfx/` or
adding sound to any `.vue` component.

Audio runs through a lightweight custom engine in `src/sfx/`, surfaced as the `v-sfx` directive and the imperative `emitSfx()`.

## Name the intent, never the file

`src/sfx/roles.ts` is the only place an audio filename may appear. Everywhere else names a
`namespace.intent` role from that catalogue — `ui.press`, `dialog.close`, `card.flip-away`.

- **A trigger no listed role covers is a question for the user, not a new role you mint.** Adding a
  role is a decision about what the app sounds like; the catalogue is closed until they make it.
- **A `PostToolUse` hook blocks an edit to `roles.ts` that stops referencing a sound `config.ts`
  still declares.** Repointing a role away from its sound silently orphans that sound rather than
  failing anything — the hook catches it because nothing else can. Delete the sound from `SOUNDS` in
  the same change if you mean to retire it; give it a role otherwise.
- **Volume, bus and debounce belong to the role, not the call.** `emitSfx` takes no options bar
  `preview_bus`, which the audio-settings sliders use to hear a drag on the dial it moves and which
  cannot change which sound plays.
- **Reach the player through `src/sfx/volume-seam.ts`** — it is the only path from the member's
  audio preferences to what comes out of the speakers.

## The `sfx` prop is one shape across ui-kit and layout-kit

`sfx?: SfxOptions` — each channel takes a role, or `false` to silence it. Never add a second
sound-shaped prop beside it, and never a `silent` boolean.

```html
<ui-button :sfx="{ press: 'ui.select' }">…</ui-button>
<ui-tappable :sfx="{ hover: false }">…</ui-tappable>
```

Every primitive already defaults its own `hover`, so pass that channel only to change it. **`press`
never defaults** — a button stays silent on press until a call site names a role, because most
already play their own cue from the handler behind `@press`. `press` / `tap_pre` route through
staged-tap; the directive handles `hover` and `focus`.

## A recurring sound lives in its seam

A sound that should play for **every** instance of an action belongs in the single function that performs it — a store action, a mutation, a mode setter — not wired at each call site, where copies drift and double up ([`architecture/api-layer`](./architecture/api-layer.md) states the general rule). The deck mode-switch chime lives in `setMode`, and the per-call-site duplicates were deleted.

There is no option that suppresses a follow-on sound. When a caller needs a different cue for the same seam-owned transition, give the seam function an optional role parameter defaulting to its usual cue (`setMode(mode, chime = 'ui.select')`) and have the caller pass its own — never fire a second sound alongside the seam's.

Centralise only for genuine instances of _that_ action — don't fold in unrelated uses of the same role.

## Every sound debounces by default — set the role's own when a cue can't take it

`player.ts` runs every call through a shared 10ms trailing debounce keyed by sound name, whether or
not the role asked for one. That's invisible at the call site, so a rhythmic or latency-sensitive
cue — one paced by something other than the debounce itself, like a drag's `requestAnimationFrame`
loop or a countdown tick — inherits a delay that lands wherever the timer happens to fire, not on the
beat the caller intended. Give such a role `debounce: 0` in `roles.ts`; a call site can't set one.

## Don't double up on one element

If a click handler already calls `emitSfx(...)` imperatively, don't add a parallel `v-sfx` press
binding next to it — it double-plays and splits the configuration surface. Leave `v-sfx` to
hover/focus on that element.

**One `v-sfx` per element, ever.** The directive keys its listeners off the element, so a second
binding that falls through to the same root — a `v-sfx` on a component whose own root already
carries one — silently replaces the first without cleaning it up and leaks its listeners. Pass the
`sfx` prop to the child instead of binding the directive over it.
