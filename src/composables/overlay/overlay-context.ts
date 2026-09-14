import type { OverlayEntry } from '@/stores/overlay-stack'
import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'

export type OverlayCloseRequest = () => Promise<boolean> | boolean

export type OverlayContext = {
  // Close this overlay with a result value (explicit finish — bypasses the veto).
  close: (outcome?: unknown) => void
  // Request close via the veto pipeline (backdrop/esc/close-button semantics).
  dismiss: () => void
  // Register a veto: return false to cancel the close, true to allow it.
  onCloseRequest: (fn: OverlayCloseRequest) => void
  // Resolves once this overlay's enter animation completes.
  entered: Promise<void>
}

export type OverlayContextSource = {
  entry: OverlayEntry
  close: (outcome?: unknown) => void
  dismiss: () => void
}

export const OVERLAY_CONTEXT_KEY: InjectionKey<OverlayContext> = Symbol('overlay-context')

/**
 * Build and provide the inside-content overlay context for a single entry.
 *
 * Called by `overlay-entry` — the one ancestor of ALL overlay content (the
 * window primitives AND their slotted content). The surface CANNOT provide
 * this: Vue scopes slot content to its owner, which sits above the surface, so
 * a surface `provide` never reaches the content that needs it.
 *
 * Wires the entry's lifecycle: creates the `entered` promise (resolved by the
 * host's after-enter hook via `entry.markEntered`) and routes `onCloseRequest`
 * to the entry's veto `interceptor`.
 */
export function provideOverlayContext(source: OverlayContextSource): OverlayContext {
  let resolve_entered!: () => void
  const entered = new Promise<void>((resolve) => {
    resolve_entered = resolve
  })
  source.entry.markEntered = resolve_entered

  const context: OverlayContext = {
    close: source.close,
    dismiss: source.dismiss,
    entered,
    onCloseRequest: (fn) => {
      source.entry.interceptor = async () => fn()
    }
  }

  provide(OVERLAY_CONTEXT_KEY, context)
  return context
}

/**
 * Read the overlay context from inside any overlay descendant: `close(outcome)`
 * to finish with a value, `dismiss()` to request close through the veto,
 * `onCloseRequest(fn)` to veto, and `entered` to await the enter animation.
 * Throws if called outside an overlay.
 */
export function useOverlayContext(): OverlayContext {
  const context = inject(OVERLAY_CONTEXT_KEY)
  if (!context) {
    throw new Error('useOverlayContext must be called inside an overlay')
  }

  return context
}
