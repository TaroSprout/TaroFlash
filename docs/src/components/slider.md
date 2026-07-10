---
lastUpdated: 2026-07-10T17:37:36Z
---

# Slider

`ui-slider` is a horizontal drag slider bound via `v-model`. It works with both mouse and touch input, and supports a custom min/max/step range with optional tick marks.

## Basic usage

`v-model` is required — the component has no internal fallback value.

```html
<ui-slider v-model="opacity" />
```

By default the range is `0`–`100` in steps of `1`.

## Range & step

```html
<ui-slider v-model="value" :min="0" :max="10" :step="1" />
```

## Label

```html
<ui-slider v-model="opacity" label="Opacity" />
```

The label and current value render inside the track, clipped so the fill portion shows an inverted (on-primary) color automatically.

## Ticks

Tick marks are shown by default between `min` and `max` when the step count is small enough (2–20 steps). Set `:ticks="false"` to disable them.

```html
<ui-slider v-model="value" :min="0" :max="5" :step="1" />
<ui-slider v-model="value" :ticks="false" />
```

## Behaviour

- Dragging is handled via `useGestures`, so the slider works on both mouse and touch.
- Arrow keys / Home / End move the value by `step` while the slider is focused.
- Each notch crossed while dragging plays a tick sfx (`sfx.tick`, routed through `sfx.bus`).
- The fill uses `--theme-primary`; the handle uses `--theme-on-primary`.

## Props

| Prop    | Type                             | Default | Description                                              |
| ------- | -------------------------------- | ------- | -------------------------------------------------------- |
| `min`   | Number                           | `0`     | Minimum value                                            |
| `max`   | Number                           | `100`   | Maximum value                                            |
| `step`  | Number                           | `1`     | Increment step                                           |
| `label` | String                           | —       | Optional label rendered inside the track                 |
| `ticks` | Boolean                          | `true`  | Shows tick marks when the step count is between 2 and 20 |
| `sfx`   | `{ tick?: SoundKey; bus?: Bus }` | `{}`    | Sound played on each notch while dragging, and its bus   |

## Model

| Model     | Type     | Description                                     |
| --------- | -------- | ----------------------------------------------- |
| `v-model` | `number` | Required. Current value, clamped to `min`–`max` |
