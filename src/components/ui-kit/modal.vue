<script setup lang="ts">
import { onUnmounted, watch, watchEffect, computed, useTemplateRef } from 'vue'
import {
  useModal,
  request_close_handlers,
  resolveModalAfterEnter,
  type ModalMode
} from '@/composables/modal'
import { useMatchMedia, type BreakpointKey } from '@/composables/ui/media-query'
import { useScrollLock } from '@/composables/ui/scroll-lock'
import { useShortcuts } from '@/composables/shortcuts'
import { recedeModal, restoreModal } from '@/utils/animations/modal'
import { MODAL_MODE_CONFIG } from './modal-mode-config'
import ModalSlot from './modal-slot.vue'

const DEFAULT_MODE: ModalMode = 'dialog'

const { modal_stack, pop } = useModal()
const shortcuts = useShortcuts('modal')

const DEFAULT_WIDTH_KEY: BreakpointKey = 'sm'
const DEFAULT_HEIGHT_KEY: BreakpointKey = 'sm'

function isMobileFor(el: Element) {
  const html = el as HTMLElement
  const width_key = (html.dataset.mobileBelowWidth as BreakpointKey) ?? DEFAULT_WIDTH_KEY
  const height_key = (html.dataset.mobileBelowHeight as BreakpointKey) ?? DEFAULT_HEIGHT_KEY
  return useMatchMedia(`w<${width_key} | h<${height_key}`).value
}

const modal_container = useTemplateRef<{ $el: HTMLElement }>('modal_container')
const scroll_lock = useScrollLock(() => modal_container.value?.$el)

const modal_els = new Map<string, HTMLElement>()

function setModalEl(id: string, el: Element | null) {
  if (el) modal_els.set(id, el as HTMLElement)
  else modal_els.delete(id)
}

function requestClose() {
  const top = modal_stack.value.at(-1)
  if (!top) return

  const handler = request_close_handlers.get(top.id)
  if (handler) {
    handler()
  } else {
    pop()
  }
}

onUnmounted(() => {
  shortcuts.dispose()
})

watchEffect(() => {
  if (!modal_container.value?.$el) return

  if (modal_stack.value.length > 0) {
    scroll_lock.lock()
    shortcuts.register({ combo: 'esc', handler: requestClose })
  } else {
    scroll_lock.unlock()
    shortcuts.clearScope()
  }
})

const show_backdrop = computed(() => modal_stack.value.some((m) => m.backdrop))

// A modal opening on top of another dials the one beneath it back, as if a shadow
// fell over it; closing the top modal restores whatever's now on top. Recede/restore
// only ever touch the entries directly affected by a push/pop, not the whole stack.
watch(
  () => modal_stack.value.length,
  (new_length, old_length) => {
    if (new_length > old_length) {
      const receding = modal_stack.value.at(-2)
      const el = receding && modal_els.get(receding.id)
      if (el) recedeModal(el, isMobileFor(el))
    } else if (new_length < old_length) {
      const restoring = modal_stack.value.at(-1)
      const el = restoring && modal_els.get(restoring.id)
      if (el) restoreModal(el, isMobileFor(el))
    }
  }
)

function getElementMode(el: Element): ModalMode {
  return ((el as HTMLElement).dataset.modalMode as ModalMode) ?? DEFAULT_MODE
}

function getModeConfig(el: Element) {
  const mode = getElementMode(el)
  return MODAL_MODE_CONFIG[mode]
}

function onBeforeEnter(el: Element) {
  ;(el as HTMLElement).style.willChange = 'transform, opacity'
}

function onEnter(el: Element, done: () => void) {
  const config = getModeConfig(el)
  const html_el = el as HTMLElement
  config.enter(el, isMobileFor(el), () => {
    html_el.style.willChange = ''
    done()
  })
}

function onAfterEnter(el: Element) {
  const id = (el as HTMLElement).dataset.modalId
  if (id) resolveModalAfterEnter(id)
}

function onLeave(el: Element, done: () => void) {
  const config = getModeConfig(el)
  const html_el = el as HTMLElement
  html_el.style.willChange = 'transform, opacity'
  config.leave(el, isMobileFor(el), () => {
    html_el.style.willChange = ''
    done()
  })
}
</script>

<template>
  <transition
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    enter-active-class="transition-[opacity] ease-in-out duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
    leave-active-class="transition-[opacity] ease-in-out duration-100"
  >
    <div
      v-if="modal_stack.length > 0"
      data-testid="ui-kit-modal-backdrop"
      class="pointer-events-auto fixed inset-0 flex items-center justify-center px-4 py-7"
      :class="{ 'pointer-fine:backdrop-blur-4 pointer-fine:bg-black/10': show_backdrop }"
      @click="requestClose"
    >
      <slot></slot>
    </div>
  </transition>

  <transition-group
    :css="false"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @leave="onLeave"
    data-testid="ui-kit-modal-container"
    :data-modal-mode="modal_stack.at(-1)?.mode ?? DEFAULT_MODE"
    ref="modal_container"
    tag="div"
    class="pointer-events-none fixed inset-0 z-90"
  >
    <div
      v-for="modal in modal_stack"
      :key="modal.id"
      :ref="(el) => setModalEl(modal.id, el as Element | null)"
      :data-modal-id="modal.id"
      data-testid="ui-kit-modal"
      class="absolute inset-0 flex justify-center pointer-events-none"
      :class="MODAL_MODE_CONFIG[modal.mode].containerClass"
      :data-modal-mode="modal.mode"
      :data-mobile-below-width="modal.mobile_below_width ?? DEFAULT_WIDTH_KEY"
      :data-mobile-below-height="modal.mobile_below_height ?? DEFAULT_HEIGHT_KEY"
      @click.self="requestClose"
    >
      <modal-slot :id="modal.id" :context="modal.context">
        <component
          :is="modal.component"
          v-bind="modal.componentProps"
          :data-modal-mode="modal.mode"
          :data-mobile-below-width="modal.mobile_below_width ?? DEFAULT_WIDTH_KEY"
          :data-mobile-below-height="modal.mobile_below_height ?? DEFAULT_HEIGHT_KEY"
          class="pointer-events-auto"
        />
      </modal-slot>
    </div>
  </transition-group>
</template>
