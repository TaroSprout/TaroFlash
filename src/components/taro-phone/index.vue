<script setup lang="ts">
import { useShortcuts } from '@/composables/shortcuts'
import { useModal } from '@/composables/modal'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useTaroPhoneStore } from '@/stores/taro-phone'
import { emitSfx } from '@/sfx/bus'
import TaroPhoneSm from '@/components/taro-phone/taro-phone-sm.vue'
import TaroPhoneBase from '@/components/taro-phone/taro-phone-base.vue'
import {
  slideDownBlurIn,
  slideUpBlurOut,
  slideUpBlurIn,
  slideDownBlurOut
} from '@/utils/animations/phone'

const shortcuts = useShortcuts('taro-phone', { priority: 'background' })
const { modal_stack } = useModal()
const is_pointer_coarse = useMatchMedia('coarse')
const store = useTaroPhoneStore()

shortcuts.register({
  combo: 'esc',
  handler: togglePhone
})

function togglePhone() {
  if (store.is_open) {
    closePhone()
  } else {
    openPhone()
  }
}

function openPhone() {
  store.open()
  emitSfx('pop_window')
  document.addEventListener('pointerdown', onPageClick)
}

function closePhone() {
  store.close()
  emitSfx('pop_window')
  document.removeEventListener('pointerdown', onPageClick)
}

// Listens on pointerdown (not click) so outside-detection runs before any
// click handler in the interaction — e.g. a modal's own close button — has a
// chance to mutate modal_stack/is_open first, which would otherwise race
// against this check.
function onPageClick(e: Event) {
  if (!store.is_open) return

  if (!isInsidePhone(e) && modal_stack.value.length === 0) {
    closePhone()
  }
}

function isInsidePhone(e: Event) {
  const path = (e.composedPath?.() ?? []) as EventTarget[]
  return path.some((n) => n instanceof HTMLElement && n.matches?.('[data-testid="phone"]'))
}

function onOpenBasePhone(el: Element, done: () => void) {
  const animation = is_pointer_coarse.value ? slideDownBlurIn : slideUpBlurIn
  animation(el, done)
}

function onCloseBasePhone(el: Element, done: () => void) {
  const animation = is_pointer_coarse.value ? slideUpBlurOut : slideDownBlurOut
  animation(el, done)
}

function onOpenPhoneSm(el: Element, done: () => void) {
  slideUpBlurIn(el, done)
}

function onClosePhoneSm(el: Element, done: () => void) {
  slideDownBlurOut(el, done)
}
</script>

<template>
  <div
    data-testid="phone-stage"
    class="fixed inset-0 z-100 flex justify-center pointer-events-none"
  >
    <div
      data-testid="phone-dock"
      class="w-full max-w-[calc(var(--page-width)-var(--page-px)*2)] flex items-center justify-center mx-(--page-px) relative"
    >
      <transition @enter="onOpenBasePhone" @leave="onCloseBasePhone">
        <taro-phone-base v-if="store.is_open" class="z-10" @close="closePhone" />
      </transition>

      <transition @enter="onOpenPhoneSm" @leave="onClosePhoneSm">
        <taro-phone-sm v-if="!store.is_open" @open="openPhone" />
      </transition>
    </div>
  </div>
</template>

<style>
[data-testid='phone-stage'] {
  --phone-duration: 100ms;
}
</style>
