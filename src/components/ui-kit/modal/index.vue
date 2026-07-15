<script setup lang="ts">
import {
  DEFAULT_MODE,
  DEFAULT_WIDTH_KEY,
  DEFAULT_HEIGHT_KEY,
  useModalStack
} from './use-modal-stack'
import { MODAL_MODE_CONFIG } from './mode-config'
import ModalSlot from './slot.vue'

const {
  modal_stack,
  show_backdrop,
  receded_ids,
  setModalEl,
  requestClose,
  onBeforeEnter,
  onEnter,
  onAfterEnter,
  onLeave
} = useModalStack()
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
          :inert="receded_ids.has(modal.id)"
          class="pointer-events-auto"
        />
      </modal-slot>
    </div>
  </transition-group>
</template>
