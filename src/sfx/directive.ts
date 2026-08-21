import type { Directive, DirectiveBinding } from 'vue'
import { emitSfx, emitHoverSfx } from './bus'
import type { SfxOptions, SfxRole } from './roles'

type SfxBindingValue = SfxRole | SfxOptions

type Cleanup = () => void

type SfxState = {
  cfg: SfxOptions
  mods: Partial<Record<string, boolean>>
  cleanup: Cleanup
}

const states = new WeakMap<HTMLElement, SfxState>()

export const vSfx: Directive<HTMLElement, SfxBindingValue> = {
  mounted(el, binding) {
    _attach(el, binding)
  },

  updated(el, binding) {
    if (binding.value === binding.oldValue) return
    const state = states.get(el)
    if (!state) {
      _attach(el, binding)
      return
    }
    state.cfg = _parseBinding(binding.value, binding.modifiers)
  },

  beforeUnmount(el) {
    const state = states.get(el)
    state?.cleanup()
    states.delete(el)
  }
}

function _attach(el: HTMLElement, binding: DirectiveBinding<SfxBindingValue>) {
  if (!binding.value) return

  const state: SfxState = {
    cfg: _parseBinding(binding.value, binding.modifiers),
    mods: binding.modifiers,
    cleanup: () => {}
  }

  const cleanups: Cleanup[] = []

  cleanups.push(
    _add(el, 'pointerenter', (e) => {
      if (!state.cfg.hover) return
      if ((e as PointerEvent).pointerType !== 'mouse') return
      emitHoverSfx(state.cfg.hover)
    })
  )

  cleanups.push(
    _add(el, 'focus', () => {
      if (!state.cfg.focus) return
      emitSfx(state.cfg.focus)
    })
  )

  state.cleanup = () => cleanups.forEach((c) => c())
  states.set(el, state)
}

function _add(el: HTMLElement, event: string, handler: EventListener) {
  el.addEventListener(event, handler, { passive: true })
  return () => el.removeEventListener(event, handler)
}

function _parseBinding(
  binding: SfxBindingValue,
  mods: Partial<Record<string, boolean>>
): SfxOptions {
  if (typeof binding === 'string') {
    const c: SfxOptions = {}
    if (mods.hover) c.hover = binding
    if (mods.focus) c.focus = binding
    return c
  }

  return binding
}
