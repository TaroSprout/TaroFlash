import type { OverlayEntry } from '@/stores/overlay-stack'
import { inject, provide } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export type OverlayCloseRequest = () => Promise<boolean> | boolean

export type OverlayContext = {
  // Close this surface with a result value (explicit finish — bypasses the veto).
  close: (outcome?: unknown) => void
  // Request close via the veto pipeline (backdrop/esc semantics); runs onCloseRequest.
  dismiss: () => void
  onCloseRequest: (fn: OverlayCloseRequest) => void
  is_downgraded: Ref<boolean>
  entered: Promise<void>
}

export type ProvideOverlayContextOptions = {
  close: (outcome?: unknown) => void
  dismiss: () => void
  is_downgraded: Ref<boolean>
  entered: Promise<void>
}

export type OverlayHostEntry = {
  entry: OverlayEntry
  close: (outcome?: unknown) => void
  dismiss: () => void
}

export const OVERLAY_CONTEXT_KEY: InjectionKey<OverlayContext> = Symbol('overlay-context')

export const OVERLAY_HOST_ENTRY_KEY: InjectionKey<OverlayHostEntry> = Symbol('overlay-host-entry')

/**
 * Build and provide the inside-surface contract for a single overlay entry.
 * The host calls this once per entry; descendants read it via
 * `useOverlayContext`. `onCloseRequest` writes the entry's veto `interceptor`,
 * replacing the old module-level `request_close_handlers` side-Map.
 *
 * @param entry - the stack entry this surface renders
 * @param opts - `dismiss` (host close-pipeline trigger) + `is_downgraded` (from the downgrade resolver)
 */
export function provideOverlayContext(
  entry: OverlayEntry,
  opts: ProvideOverlayContextOptions
): OverlayContext {
  const context: OverlayContext = {
    close: opts.close,
    dismiss: opts.dismiss,
    is_downgraded: opts.is_downgraded,
    entered: opts.entered,
    onCloseRequest: (fn) => {
      entry.interceptor = async () => fn()
    }
  }

  provide(OVERLAY_CONTEXT_KEY, context)
  return context
}

/**
 * Provide the host→surface channel for a single stack entry. The host calls
 * this once per entry (via the per-entry wrapper); the surface reads it with
 * `useOverlayHostEntry` to complete the content-facing context. Carries the
 * raw `entry` (so the surface can point `markEntered` at its own `entered`
 * resolver) and `dismiss` (the host's close-pipeline trigger for this entry).
 */
export function provideOverlayHostEntry(channel: OverlayHostEntry): void {
  provide(OVERLAY_HOST_ENTRY_KEY, channel)
}

/**
 * Read the host→surface channel from inside a surface. Throws if called
 * outside an overlay host.
 */
export function useOverlayHostEntry(): OverlayHostEntry {
  const channel = inject(OVERLAY_HOST_ENTRY_KEY)
  if (!channel) {
    throw new Error('useOverlayHostEntry must be called inside an overlay host')
  }

  return channel
}

/**
 * Read the overlay contract from inside a surface: `dismiss()` to request
 * close, `onCloseRequest(fn)` to veto, and the reactive `is_downgraded` flag.
 * Throws if called outside an overlay surface.
 */
export function useOverlayContext(): OverlayContext {
  const context = inject(OVERLAY_CONTEXT_KEY)
  if (!context) {
    throw new Error('useOverlayContext must be called inside an overlay surface')
  }

  return context
}
