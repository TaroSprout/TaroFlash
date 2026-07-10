---
lastUpdated: 2026-07-10T17:37:36Z
---

# Button

`ui-button` is a versatile and customizable button component. It supports icons, sizes, variants, loading/disabled states, and touch-aware tap feedback.

## Basic Usage

Listen on `@press`, not `@click` — the button owns its own click handling so it can defer the action a beat on touch to play the tap animation/sfx first.

```html
<ui-button @press="console.log('save')">Save</ui-button>
```

## Icons

Add icons on either side of the label with `icon-left` and `icon-right`. Both accept a string matching an SVG filename in `src/assets/svgs`.

```html
<ui-button icon-left="close">Close</ui-button>
<ui-button icon-right="arrow-forward">Next</ui-button>
```

### Icon Only

Use `icon-only` to render just the icon with no label. The label still renders into a tooltip on hover/focus (desktop always; mobile only when `mobile-tooltip` is set).

```html
<ui-button icon-left="close" icon-only>Close</ui-button>
```

## Sizes

```html
<ui-button size="xl" icon-left="check">XL</ui-button>
<ui-button size="lg" icon-left="check">Large</ui-button>
<ui-button size="base" icon-left="check">Base</ui-button>
<ui-button size="sm" icon-left="check">Small</ui-button>
```

## Variants

```html
<ui-button icon-left="check">Solid</ui-button>
<ui-button variant="outline" icon-left="check">Outline</ui-button>
<ui-button variant="ghost" icon-left="check">Ghost</ui-button>
```

### Inverted

`inverted` flips the color scheme — useful on dark or colored backgrounds.

```html
<ui-button inverted icon-left="check">Solid</ui-button>
<ui-button inverted variant="outline" icon-left="check">Outline</ui-button>
```

## Loading

`loading` fills the button with an animated stripe overlay and a spinner, and suppresses the fancy-hover sweep.

```html
<ui-button :loading="isSaving" icon-left="check">Save</ui-button>
```

## Disabled

`disabled` mutes and inerts the label region only — a `trailing` slot (e.g. a split-button caret) stays fully live. Set `click-when-disabled` to still emit `press` while disabled, so a validation error can surface on click.

```html
<ui-button disabled>Save</ui-button>
<ui-button disabled click-when-disabled @press="showValidationError">Save</ui-button>
```

## Tap Feedback

On coarse (touch) pointers, `play-on-tap` (on by default) defers the `press` emit a beat to play a tap animation + sfx first. `tap-animate` switches that tap from a quiet background sweep to the full scale/rotate bounce.

```html
<ui-button :play-on-tap="false">Instant</ui-button> <ui-button tap-animate>Bouncy tap</ui-button>
```

## Props

| Prop                  | Type         | Default     | Description                                                                       |
| --------------------- | ------------ | ----------- | --------------------------------------------------------------------------------- |
| `size`                | String       | `base`      | `xl`, `lg`, `base`, or `sm`                                                       |
| `variant`             | String       | `solid`     | `solid`, `outline`, or `ghost`                                                    |
| `inverted`            | Boolean      | `false`     | Inverts the button's color scheme                                                 |
| `icon-only`           | Boolean      | `false`     | Renders only the icon, label moves into a tooltip                                 |
| `icon-left`           | String       | `undefined` | SVG filename for a left-aligned icon                                              |
| `icon-right`          | String       | `undefined` | SVG filename for a right-aligned icon                                             |
| `rounded-full`        | Boolean      | `false`     | Forces a fully rounded (pill) border radius                                       |
| `full-width`          | Boolean      | `false`     | Stretches the button to fill its container                                        |
| `fancy-hover`         | Boolean      | `true`      | Enables the diagonal-stripe hover/active sweep                                    |
| `active`              | Boolean      | `false`     | Forces the active (pressed) visual state, e.g. to mirror state owned elsewhere    |
| `loading`             | Boolean      | `false`     | Shows a spinner over a filled overlay; suppresses fancy-hover                     |
| `disabled`            | Boolean      | `false`     | Mutes + inerts the label region only; a `trailing` slot stays live                |
| `click-when-disabled` | Boolean      | `false`     | While `disabled`, still emits `press` instead of swallowing the click             |
| `play-on-tap`         | Boolean      | `true`      | On coarse pointers, defers `press` a beat to play a tap animation + sfx           |
| `tap-animate`         | Boolean      | `false`     | With `play-on-tap`, plays the full scale/rotate bounce instead of the quiet sweep |
| `mobile-tooltip`      | Boolean      | `false`     | When `true`, shows the icon-only tooltip on mobile too (desktop always shows it)  |
| `sfx`                 | `SfxOptions` | `{}`        | Hover/focus/blur/tap sound overrides — see `src/sfx/config`                       |

## Emits

| Event   | Payload      | Description                                                                                     |
| ------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `press` | `MouseEvent` | The button's primary action. Fires instead of native `click` — always listen here, not `@click` |

## Slots

| Slot       | Description                                                                           |
| ---------- | ------------------------------------------------------------------------------------- |
| default    | Button label                                                                          |
| `trailing` | Extra content after the label (e.g. a split-button caret) with its own click handling |
