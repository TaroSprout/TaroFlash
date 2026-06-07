<script setup lang="ts">
import { onMounted, ref, provide } from 'vue'
import { emitSfx } from '@/sfx/bus'
import { useShortcuts } from '@/composables/use-shortcuts'
import { installApps } from '@/phone/system/install-apps'
import {
  type PhoneApp,
  type PhoneContext,
  type AppContextInjection,
  APP_CTX_KEY
} from '@/phone/system/types'
import { createPhoneRuntime } from '@/phone/system/runtime'
import { useModal } from '@/composables/modal'
import phoneSm from '@/phone/components/phone-sm.vue'
import phoneBase from '@/phone/components/phone-base.vue'
import { useI18n } from 'vue-i18n'
import { useMatchMedia } from '@/composables/use-media-query'
import {
  slideDownBlurIn,
  slideUpBlurOut,
  slideUpBlurIn,
  slideDownBlurOut
} from '@/utils/animations/phone'

const shortcuts = useShortcuts('phone', { priority: 'background' })
const { open: openModal, pop: popModal, modal_stack } = useModal()
const is_pointer_coarse = useMatchMedia('coarse')

const loading = ref(false)
const open = ref(false)
let apps: PhoneApp[] = []

const { t } = useI18n()

const runtime = createPhoneRuntime({
  openFullApp: (app, controller) => {
    const injection: AppContextInjection = { ...ctx, controller }
    openModal(app.component, {
      backdrop: true,
      mode: 'dialog',
      props: { onClose: () => popModal() },
      context: { key: APP_CTX_KEY, value: injection }
    })
  }
})

const ctx: PhoneContext = { ...runtime.phoneOS, t }

provide<AppContextInjection>(APP_CTX_KEY, {
  ...ctx,
  get controller() {
    return runtime.active_session.value?.controller
  }
})

shortcuts.register({
  combo: 'esc',
  handler: togglePhone
})

onMounted(async () => {
  loading.value = true

  apps = await installApps()
  runtime.init(apps, ctx)

  loading.value = false
})

function togglePhone() {
  if (open.value) {
    closePhone()
  } else {
    openPhone()
  }
}

function openPhone() {
  if (loading.value) return

  open.value = true
  emitSfx('ui.pop_window')
  document.addEventListener('click', onPageClick)
}

function closePhone(force = false) {
  if (force && runtime.active_session.value) {
    runtime.phoneOS.clear()
    emitSfx('ui.toggle_off')
    return
  }

  if (runtime.active_session.value) {
    runtime.phoneOS.close()
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
        <phone-base
          v-if="open"
          :apps="apps"
          :transition="runtime.transition.value"
          :active_session="runtime.active_session.value"
          class="z-10"
          @close="closePhone"
        />
      </transition>

      <transition @enter="onOpenPhoneSm" @leave="onClosePhoneSm">
        <phone-sm
          v-if="!open"
          :notification_count="
            runtime.notifications.value.reduce((sum, n) => sum + (n.count ?? 1), 0)
          "
          @open="openPhone"
        />
      </transition>
    </div>
  </div>
</template>

<style>
[data-testid='phone-stage'] {
  --phone-duration: 100ms;
}
</style>
