import type { Directive, DirectiveBinding } from 'vue'
import { emitSfx, emitHoverSfx } from './bus'
import { type SoundKey } from './config'

export type SfxOptions = {
  // Routed through staged-tap in button.vue — not handled by this directive.
  press?: SoundKey
  tap_pre?: SoundKey
  tap_post?: SoundKey
  // Handled by this directive.
  hover?: SoundKey | SoundKey[]
  focus?: SoundKey
  blur?: SoundKey
  debounce?: number
}

type SfxBindingValue = SoundKey | SfxOptions

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
      emitHoverSfx(state.cfg.hover, { debounce: state.cfg.debounce })
    })
  )

  cleanups.push(
    _add(el, 'focus', () => {
      if (!state.cfg.focus) return
      emitSfx(state.cfg.focus, { debounce: state.cfg.debounce })
    })
  )

  cleanups.push(
    _add(el, 'blur', () => {
      if (!state.cfg.blur) return
      emitSfx(state.cfg.blur, { debounce: state.cfg.debounce })
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
    if (mods.blur) c.blur = binding
    return c
  }

  return binding
}
