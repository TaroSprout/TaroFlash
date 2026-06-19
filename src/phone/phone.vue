<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { emitSfx } from '@/sfx/bus'
import { useShortcuts } from '@/composables/shortcuts'
import { useModal } from '@/composables/modal'
import { useI18n } from 'vue-i18n'
import { useMatchMedia } from '@/composables/ui/media-query'
import { usePhoneStore } from '@/phone/store'
import { buildPhoneApps } from '@/phone/apps/index'
import phoneSm from '@/phone/components/phone-sm.vue'
import phoneBase from '@/phone/components/phone-base.vue'
import {
  slideDownBlurIn,
  slideUpBlurOut,
  slideUpBlurIn,
  slideDownBlurOut
} from '@/utils/animations/phone'

const shortcuts = useShortcuts('phone', { priority: 'background' })
const { open: openModal, pop: popModal, modal_stack } = useModal()
const { t } = useI18n()
const is_pointer_coarse = useMatchMedia('coarse')
const store = usePhoneStore()

const open = ref(false)

watch(
  () => store.pending_modal,
  (app) => {
    if (!app) return
    const opts = app.modal_options
    openModal(app.component, {
      backdrop: true,
      mode: opts?.mode ?? 'dialog',
      mobile_below_width: opts?.mobile_below_width,
      mobile_below_height: opts?.mobile_below_height,
      props: { close: () => popModal() }
    })
    store.consumePendingModal()
  }
)

shortcuts.register({
  combo: 'esc',
  handler: togglePhone
})

onMounted(() => {
  buildPhoneApps(t).forEach((app) => store.registerApp(app))
})

function togglePhone() {
  if (open.value) {
    closePhone()
  } else {
    openPhone()
  }
}

function openPhone() {
  open.value = true
  emitSfx('ui.pop_window')
  document.addEventListener('click', onPageClick)
}

function closePhone(force = false) {
  if (force && store.active_app) {
    store.clear()
    emitSfx('ui.toggle_off')
    return
  }

  if (store.active_app) {
    store.close()
    emitSfx('ui.toggle_off')
    return
  }

  open.value = false
  emitSfx('ui.pop_window')
  document.removeEventListener('click', onPageClick)
}

function onPageClick(e: Event) {
  if (!isInsidePhone(e) && modal_stack.value.length === 0) {
    closePhone(true)
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
      class="w-full max-w-(--page-width) flex items-center justify-center mx-4 sm:mx-10 relative"
    >
      <transition @enter="onOpenBasePhone" @leave="onCloseBasePhone">
        <phone-base v-if="open" class="z-10" @close="closePhone" />
      </transition>

      <transition @enter="onOpenPhoneSm" @leave="onClosePhoneSm">
        <phone-sm v-if="!open" @open="openPhone" />
      </transition>
    </div>
  </div>
</template>

<style>
[data-testid='phone-stage'] {
  --phone-duration: 100ms;
}
</style>
