import type { OverlayEntry } from '@/stores/overlay-stack'
import { inject, provide } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export type OverlayCloseRequest = () => Promise<boolean> | boolean

export type OverlayContext = {
  dismiss: () => void
  onCloseRequest: (fn: OverlayCloseRequest) => void
  is_downgraded: Ref<boolean>
}

export type ProvideOverlayContextOptions = {
  dismiss: () => void
  is_downgraded: Ref<boolean>
}

export const OVERLAY_CONTEXT_KEY: InjectionKey<OverlayContext> = Symbol('overlay-context')

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
    dismiss: opts.dismiss,
    is_downgraded: opts.is_downgraded,
    onCloseRequest: (fn) => {
      entry.interceptor = async () => fn()
    }
  }

  provide(OVERLAY_CONTEXT_KEY, context)
  return context
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
