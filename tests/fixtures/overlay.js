import { vi } from 'vite-plus/test'
import { OVERLAY_CONTEXT_KEY } from '@/composables/overlay/overlay-context'

/**
 * A stand-in overlay context for mounting a primitive (app-window, dialog-card,
 * paged-window, overlay-surface) outside the real overlay stack. Provide via
 * `global: { provide: { [OVERLAY_CONTEXT_KEY]: makeOverlayContext() } }`.
 */
export function makeOverlayContext(overrides = {}) {
  return {
    close: vi.fn(),
    dismiss: vi.fn(),
    onCloseRequest: vi.fn(),
    entered: Promise.resolve(),
    ...overrides
  }
}

export { OVERLAY_CONTEXT_KEY }
