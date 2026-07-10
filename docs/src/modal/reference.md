---
lastUpdated: 2026-07-10T17:37:36Z
---

# API Reference

All types and values exported from `@/composables/modal`.

---

## `useModal()`

```ts
function useModal(): {
  open<T>(component: Component, args?: OpenArgs): OpenModalResult<T>
  pop(): void
  modal_stack: Ref<ModalEntry[]>
}
```

### `open(component, args?)`

Opens a modal and returns `{ response, close }`.

| Option                | Type            | Default     | Description                                                                                         |
| --------------------- | --------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `props`               | `object`        | `{}`        | Props passed to the component. `close` is always injected too.                                      |
| `backdrop`            | `boolean`       | `false`     | Show a blurred backdrop. Clicking it triggers a close request.                                      |
| `mode`                | `ModalMode`     | `'dialog'`  | Controls layout and animation. See [Modes](./modes).                                                |
| `context`             | `ModalContext`  | `undefined` | Vue injection to provide into the modal subtree.                                                    |
| `mobile_below_width`  | `BreakpointKey` | `'sm'`      | Overrides the width threshold below which `mobile-sheet` renders as a sheet. See [Modes](./modes).  |
| `mobile_below_height` | `BreakpointKey` | `'sm'`      | Overrides the height threshold below which `mobile-sheet` renders as a sheet. See [Modes](./modes). |

### `pop()`

Closes the topmost modal in the stack.

---

## `useModalRequestClose(handler)`

```ts
function useModalRequestClose(handler: () => void): void
```

Registers a handler that runs when the backdrop is clicked or `Esc` is pressed, instead of the default `pop()`. Must be called inside a component that renders inside a modal. The handler is automatically removed on component unmount.

See [Intercepting Close](./request-close).

---

## `useModalAfterEnter()`

```ts
function useModalAfterEnter(): Promise<void>
```

Returns a promise that resolves once this modal's enter transition finishes. Must be called during component setup (uses `inject()` internally to find the modal's id). Resolves immediately if called outside a modal.

Useful for deferring GSAP-driven warmup work (e.g. measuring layout, starting an animation) until the modal is actually visible and settled, instead of racing the enter transition.

### `resolveModalAfterEnter(id)`

```ts
function resolveModalAfterEnter(id: string): void
```

Internal — called by `modal.vue`'s `@after-enter` handler once the enter transition for the given modal id completes. Resolves the matching promise from `useModalAfterEnter()`. You shouldn't need to call this directly.

---

## Types

### `OpenModalResult<T>`

```ts
type OpenModalResult<T> = {
  response: Promise<T>
  close: ModalCloseFn<T>
}
```

### `ModalCloseFn<T>`

```ts
type ModalCloseFn<T> = (responseValue?: T) => void
```

### `ModalMode`

```ts
type ModalMode = 'dialog' | 'mobile-sheet' | 'popup'
```

| Value            | Layout                                      | Animation                                                                                   |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `'dialog'`       | Centered                                    | Slide-up fade-in / slide-down fade-out                                                      |
| `'mobile-sheet'` | Bottom sheet on mobile, centered on desktop | Slide-up from edge / slide-down to edge (mobile); slide-up fade / slide-down fade (desktop) |
| `'popup'`        | Centered                                    | Spring scale-in / scale-fade-out                                                            |

### `ModalContext`

```ts
type ModalContext = {
  key: InjectionKey<unknown> | string
  value: unknown
}
```

### `MODAL_ID_KEY`

```ts
const MODAL_ID_KEY: InjectionKey<string>
```

Provided by `modal-slot.vue` into every modal's subtree. Identifies which modal a component belongs to. Used internally by `useModalRequestClose`. You rarely need this directly.
