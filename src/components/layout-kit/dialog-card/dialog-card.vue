<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DialogCardHeader from './dialog-card-header.vue'
import { provideDialogCardViewport, type DialogCardViewport } from './dialog-card-viewport'
import UiButton from '@/components/ui-kit/button.vue'

export type DialogCardProps = {
  title?: string
  show_close_button?: boolean
  close_label?: string
  full_bleed_at?: string
  dialog_px?: string
}

const {
  title,
  show_close_button = true,
  close_label,
  full_bleed_at = 'w<sm | h<sm',
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
const viewport = provideDialogCardViewport(full_bleed_at)

defineExpose({ viewport })
</script>

<template>
  <div
    data-testid="dialog-card"
    class="relative flex flex-col gap-4 overflow-hidden [--dialog-px:1.5rem] sm:[--dialog-px:2rem]"
    :class="viewport === 'mobile' ? 'h-full! w-full! rounded-none!' : 'rounded-8 shadow-lg'"
    :style="dialog_px ? { '--dialog-px': dialog_px } : undefined"
  >
    <slot name="header">
      <dialog-card-header v-if="title || show_close_button" :title="title">
        <template v-if="show_close_button" #start>
          <ui-button
            data-testid="dialog-card__close"
            data-theme="brown-100"
            data-theme-dark="stone-700"
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
