---
lastUpdated: 2026-07-10T17:37:36Z
---

# Radio

`ui-radio` is a circular toggle that represents a selected or unselected state. It supports an intermediate state and an externally-forced active state.

## Basic usage

```html
<ui-radio :checked="selected === 'a'" @click="selected = 'a'" />
```

## Active

`active` forces the hover/press visual state on — useful when a caller wants to mirror a hover/focus that lands elsewhere in the DOM (e.g. the radio itself is `pointer-events-none` and a wrapping element owns the interaction).

```html
<ui-radio :checked="isSelected" :active="rowHovered" />
```

## Intermediate

The `intermediate` prop renders a minus icon inside the circle — for use in "select all / some" patterns.

```html
<ui-radio :checked="false" :intermediate="someSelected" />
```

## Props

| Prop           | Type         | Default | Description                                                                        |
| -------------- | ------------ | ------- | ---------------------------------------------------------------------------------- |
| `checked`      | Boolean      | —       | Required. Whether the radio appears selected                                       |
| `intermediate` | Boolean      | `false` | Shows a minus icon (for indeterminate / partial state)                             |
| `active`       | Boolean      | `false` | Forces the active (hover/press) visual, e.g. to mirror interaction owned elsewhere |
| `sfx`          | `SfxOptions` | `{}`    | Hover/focus/blur/press sound overrides — press defaults to `'select'`              |
