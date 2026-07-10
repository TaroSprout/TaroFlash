---
lastUpdated: 2026-07-10T17:37:36Z
---

# Popover

`ui-popover` positions floating content relative to a trigger element using [Floating UI](https://floating-ui.com/). It supports click and hover modes, a smart arrow, and a customisable arrow slot.

## Basic usage

```html
<ui-popover :open="isOpen" @close="isOpen = false">
  <template #trigger>
    <ui-button @click="isOpen = true">Open</ui-button>
  </template>

  <div class="p-4">Popover content</div>
</ui-popover>
```

## Modes

### Click

The default. Set `:open` to show the popover and listen to `@close` to hide it. `@close` fires when the user clicks anywhere outside the popover.

```html
<ui-popover :open="open" @close="open = false">
  <template #trigger>
    <ui-button @click="open = !open">Toggle</ui-button>
  </template>
  ...
</ui-popover>
```

### Hover

Set `mode="hover"` — the popover shows on hover, no open state needed.

```html
<ui-popover mode="hover">
  <template #trigger>
    <ui-button>Hover me</ui-button>
  </template>
  <div class="p-3">Tooltip content</div>
</ui-popover>
```

## Placement

The `position` prop accepts any [Floating UI placement](https://floating-ui.com/docs/computePosition#placement) value. The popover automatically flips if there is not enough room.

```html
<ui-popover position="bottom-start" :open="open" @close="open = false"> ... </ui-popover>
```

## Arrow

An arrow is shown by default. Disable it with `:use-arrow="false"`.

To customise the arrow's appearance, use the `arrow` slot. It receives `{ side }` — the resolved side the popover is on (`'top'`, `'right'`, `'bottom'`, or `'left'`).

```html
<ui-popover :open="open" @close="open = false">
  <template #trigger>...</template>
  <template #arrow="{ side }">
    <my-custom-arrow :pointing="side" />
  </template>
  ...
</ui-popover>
```

To change just the arrow color without replacing the slot, set the `--popover-arrow-color` CSS variable on the popover container or any ancestor:

```css
.my-context {
  --popover-arrow-color: var(--color-blue-500);
}
```

## Anchoring to a virtual element

Pass `anchor_rect` to anchor the popover to an arbitrary `DOMRect` instead of the `trigger` slot's element — useful for a text-selection popover, which has no DOM element of its own to wrap.

```html
<ui-popover :open="open" :anchor_rect="selectionRect" @close="open = false">
  <div class="p-4">Selection actions</div>
</ui-popover>
```

When `anchor_rect` is set, the `trigger` slot is no longer used for positioning.

## Teleporting

By default the popover renders inline in the DOM. Set `teleport` to render it into `<body>` instead — useful to escape an `overflow: hidden` / clipping ancestor.

```html
<ui-popover teleport :open="open" @close="open = false"> ... </ui-popover>
```

## Matching the reference width

Set `match_reference_width` to floor the popover's width at the trigger's width — its own content can still push it wider.

```html
<ui-popover match_reference_width :open="open" @close="open = false"> ... </ui-popover>
```

## Props

| Prop                    | Type              | Default                              | Description                                                               |
| ----------------------- | ----------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `mode`                  | String            | `'click'`                            | `'click'` or `'hover'`                                                    |
| `open`                  | Boolean           | `false`                              | Controls visibility (click mode)                                          |
| `position`              | `Placement`       | `'top'`                              | Preferred placement relative to the trigger                               |
| `gap`                   | Number            | `14`                                 | Space between the trigger and the popover (px), in addition to arrow size |
| `strategy`              | String            | `'fixed'`                            | Floating UI positioning strategy: `'fixed'` or `'absolute'`               |
| `transition_duration`   | Number            | `100`                                | Fade transition duration (ms)                                             |
| `padding`               | Number            | `24`                                 | Viewport padding used by the `shift` middleware                           |
| `clip_margin`           | Number            | `0`                                  | Padding used by the `hide` middleware (reference-hidden clipping)         |
| `fallback_placements`   | Array             | `['right', 'left', 'top', 'bottom']` | Ordered list of placements to try if the preferred one doesn't fit        |
| `shadow`                | Boolean           | `false`                              | Adds a drop shadow to the popover                                         |
| `use_arrow`             | Boolean           | `true`                               | Renders the directional arrow                                             |
| `clip`                  | Boolean           | `true`                               | Hides the popover when the trigger scrolls out of view                    |
| `anchor_rect`           | `DOMRect \| null` | `null`                               | Anchors to a virtual element's rect instead of the `trigger` slot         |
| `teleport`              | Boolean           | `false`                              | Renders the popover into `<body>` via `Teleport`                          |
| `match_reference_width` | Boolean           | `false`                              | Floors the popover's width at the trigger's width                         |

## Emits

| Event   | Payload | Description                                            |
| ------- | ------- | ------------------------------------------------------ |
| `close` | —       | Emitted when the user clicks outside (click mode only) |

## Slots

| Slot      | Scoped props | Description                                                |
| --------- | ------------ | ---------------------------------------------------------- |
| `trigger` | —            | The element the popover is anchored to                     |
| default   | —            | Popover body content                                       |
| `arrow`   | `{ side }`   | Custom arrow element. `side` is the resolved popover side. |
