import { emitSfx } from '@/sfx/bus'
import type { SoundKey } from '@/sfx/config'
import { useOverlayStore, type OverlayPresentation } from '@/stores/overlay-stack'
import uid from '@/utils/uid'
import { markRaw } from 'vue'
import type { Component } from 'vue'

export type OpenOverlayOptions = {
  props?: Record<string, unknown>
  presentation?: OverlayPresentation
  open_sfx?: SoundKey | SoundKey[]
  close_sfx?: SoundKey | SoundKey[]
}

export type OpenOverlayResult<T> = {
  result: Promise<T>
  close: (outcome: T) => void
}

/**
 * Opener for the overlay mechanism. `open` mounts a component onto the shared
 * stack and hands back the settle promise; `closeAll` tears the stack down.
 * This is the single seam where open/close sound effects live — consumers pass
 * `open_sfx` / `close_sfx` instead of hand-rolling `emitSfx` boilerplate.
 *
 * @example
 * const { open } = useOverlay()
 * const { result } = open<boolean>(SettingsModal, { open_sfx: 'ui.open' })
 * if (await result) { ... }
 */
export function useOverlay() {
  const store = useOverlayStore()

  /**
   * Push `component` onto the overlay stack. Returns `result` — a promise that
   * settles with whatever `close(outcome)` (or the store's teardown) resolves —
   * and `close`, which settles + removes this entry. Emits `open_sfx` now and
   * `close_sfx` once `result` settles.
   */
  function open<T>(component: Component, opts: OpenOverlayOptions = {}): OpenOverlayResult<T> {
    const id = uid()

    let settle!: (outcome: T) => void
    const result = new Promise<T>((resolve) => {
      settle = resolve
    })

    store.push({
      id,
      component: markRaw(component),
      props: opts.props ?? {},
      presentation: opts.presentation ?? 'dialog',
      settle: settle as (outcome: unknown) => void,
      markEntered: () => {}
    })

    if (opts.open_sfx) emitSfx(opts.open_sfx)
    if (opts.close_sfx) void result.then(() => emitSfx(opts.close_sfx!))

    return {
      result,
      close: (outcome: T) => store.remove(id, outcome)
    }
  }

  /** Close every open overlay at once, settling each pending `result` with `undefined`. */
  function closeAll() {
    store.closeAll()
  }

  return { open, closeAll }
}
