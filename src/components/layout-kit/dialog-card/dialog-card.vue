<script setup lang="ts">
import { computed } from 'vue'
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
  content_max_width?: string
  content_breakout_max_width?: string
}

const {
  title,
  show_close_button = true,
  close_label,
  full_bleed_at = 'w<sm | h<sm',
  dialog_px,
  content_max_width,
  content_breakout_max_width
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

const card_style = computed(() => (dialog_px ? { '--dialog-px': dialog_px } : undefined))

const body_style = computed(() => ({
  ...(content_max_width && { '--content-grid-max-width': content_max_width }),
  ...(content_breakout_max_width && {
    '--content-grid-breakout-max-width': content_breakout_max_width
  })
}))

defineExpose({ viewport })
</script>

<template>
  <div
    data-testid="dialog-card"
    class="relative flex flex-col gap-4 overflow-hidden [--dialog-px:1.5rem] sm:[--dialog-px:2rem]"
    :class="viewport === 'mobile' ? 'h-full! w-full! rounded-none!' : 'rounded-8 shadow-lg'"
    :style="card_style"
  >
    <slot name="header">
      <dialog-card-header v-if="title || show_close_button" :title="title" class="full-width">
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

    <div
      data-testid="dialog-card__body"
      class="content-grid content-grid-px-(--dialog-px) min-h-0 flex-1"
      :style="body_style"
    >
      <slot :viewport="viewport"></slot>
    </div>
  </div>
</template>
