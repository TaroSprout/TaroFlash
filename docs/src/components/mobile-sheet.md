---
lastUpdated: 2026-07-10T17:37:36Z
---

# Mobile Sheet

`mobile-sheet` (`src/components/layout-kit/sheet/mobile-sheet.vue`) is a themed panel used as the content container inside a mobile-sheet modal. It provides a structured header (with a wave/cloud decoration, close button, and optional pattern texture), a body, and an optional sidebar/overlay.

## Basic usage

Content goes in the default slot — there is no `body` slot.

```html
<mobile-sheet title="Settings" @close="close()">
  <p>Content here</p>
</mobile-sheet>
```

## Header

The header renders automatically when any of `title`, `header-content`, or `header` slots are provided. If none of these are present, the header section is omitted entirely.

### Default header layout

The default header is a flex row that centers its content. A close button is rendered in the top-left corner (absolutely positioned) unless `show-close-button` is `false`.

```html
<mobile-sheet title="Edit Deck" @close="close()">
  <p>...</p>
</mobile-sheet>
```

### Custom header content

Replace the centered title area with `header-content`. The close button remains fixed in the top-left:

```html
<mobile-sheet @close="close()">
  <template #header-content>
    <my-custom-title />
  </template>
  <p>...</p>
</mobile-sheet>
```

### Full header replacement

Replace the entire header element (including the wave/cloud border and pattern) with `header`. This also takes over the close affordance — the built-in close button is not rendered when `header` is provided.

```html
<mobile-sheet @close="close()">
  <template #header>
    <my-fully-custom-header />
  </template>
  <p>...</p>
</mobile-sheet>
```

### Close button

`show-close-button` (default `true`) toggles the built-in close button. `close-icon` sets its icon (default `'close'`) and `close-label` overrides its tooltip/accessible label (defaults to the `mobile-sheet.close-label` translation).

```html
<mobile-sheet :show-close-button="false" @close="close()"> ... </mobile-sheet>
```

## Header border

`header-border` controls the shape of the header's bottom edge: `'wave'` (default), `'cloud'`, or `'none'`.

```html
<mobile-sheet header-border="cloud" title="Settings" @close="close()"> ... </mobile-sheet>
```

## Surface

`surface` controls the body background: `'standard'` (default) or `'inverted'`.

```html
<mobile-sheet surface="inverted" @close="close()"> ... </mobile-sheet>
```

## Pattern texture

Pass `pattern_config` to apply a themed background pattern to the header area.

```html
<mobile-sheet
  title="Settings"
  :pattern_config="{ theme: 'blue-500', pattern: 'dots', pattern_opacity: '0.25' }"
  @close="close()"
/>
```

## Sidebar & overlay slots

`sidebar` renders alongside the main body inside the sheet's bordered container — useful for a persistent side panel. `overlay` renders into an absolutely-positioned, pointer-events-none layer above the whole sheet (e.g. for decorative or teleported content); read it back out with `useMobileSheetOverlay()` as a `Teleport` target scoped to the same sheet instance.

```html
<mobile-sheet @close="close()">
  <template #sidebar>
    <my-sidebar />
  </template>
  <template #overlay>
    <my-decoration />
  </template>
  <p>...</p>
</mobile-sheet>
```

## Sizing the side padding

`sheet_px` overrides the `--sheet-px` custom property that drives the header's horizontal padding (defaults to `4.5rem`, `2rem` on `lg`+).

```html
<mobile-sheet sheet_px="2rem" @close="close()"> ... </mobile-sheet>
```

## Props

| Prop                | Type                 | Default      | Description                                                                               |
| ------------------- | -------------------- | ------------ | ----------------------------------------------------------------------------------------- |
| `pattern_config`    | `SheetPatternConfig` | `undefined`  | `{ theme, theme_dark, pattern, pattern_size, pattern_opacity }` for the header background |
| `title`             | String               | `undefined`  | Title text rendered in the default header                                                 |
| `show_close_button` | Boolean              | `true`       | Renders the built-in close button (only when no `header` slot is used)                    |
| `close_label`       | String               | `undefined`  | Overrides the close button's label; falls back to `mobile-sheet.close-label`              |
| `close_icon`        | String               | `'close'`    | Icon for the close button                                                                 |
| `surface`           | `SheetSurface`       | `'standard'` | `'standard'` or `'inverted'` body background                                              |
| `header_border`     | `SheetHeaderBorder`  | `'wave'`     | `'wave'`, `'cloud'`, or `'none'`                                                          |
| `sheet_px`          | String               | `undefined`  | Overrides the `--sheet-px` custom property                                                |

## Emits

| Event   | Payload | Description                              |
| ------- | ------- | ---------------------------------------- |
| `close` | —       | Emitted when the close button is clicked |

## Slots

| Slot             | Description                                                       |
| ---------------- | ----------------------------------------------------------------- |
| `sidebar`        | Renders alongside the body, inside the sheet's bordered container |
| `overlay`        | Absolutely-positioned, pointer-events-none layer above the sheet  |
| `header`         | Replaces the entire header element, including the close button    |
| `header-content` | Replaces the centered title within the default header             |
| default          | Main content area                                                 |
