<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DialogCardHeader from './dialog-card-header.vue'
import { provideDialogCardViewport, type DialogCardViewport } from './dialog-card-viewport'
import UiButton from '@/components/ui-kit/button.vue'

export type DialogCardProps = {
  title?: string
  show_close_button?: boolean
  close_label?: string
  viewport_query?: string
  dialog_px?: string
}

const {
  title,
  show_close_button = true,
  close_label,
  viewport_query = 'w<sm | h<sm',
  dialog_px
} = defineProps<DialogCardProps>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const slots = defineSlots<{
  header(): any
  'header-end'(): any
  default(props: { viewport: DialogCardViewport }): any
}>()

const { t } = useI18n()
const viewport = provideDialogCardViewport(viewport_query)

defineExpose({ viewport })
</script>

<template>
  <div
    data-testid="dialog-card"
    class="relative flex flex-col overflow-hidden [--dialog-px:1.5rem] sm:[--dialog-px:2rem]"
    :class="viewport === 'mobile' ? 'h-full! w-full! rounded-none!' : 'rounded-8 shadow-lg'"
    :style="dialog_px ? { '--dialog-px': dialog_px } : undefined"
  >
    <slot name="header">
      <dialog-card-header v-if="title || show_close_button" :title="title">
        <template v-if="show_close_button" #start>
          <ui-button
            data-testid="dialog-card__close"
            icon-left="close"
            icon-only
            rounded-full
            @press="emit('close')"
          >
            {{ close_label ?? t('dialog-card.close-label') }}
          </ui-button>
        </template>

        <template v-if="slots['header-end']" #end>
          <slot name="header-end"></slot>
        </template>
      </dialog-card-header>
    </slot>

    <slot :viewport="viewport"></slot>
  </div>
</template>
