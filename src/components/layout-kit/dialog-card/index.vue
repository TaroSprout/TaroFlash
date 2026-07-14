<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCardHeader from './dialog-card-header.vue'
import { provideDialogCardViewport, type DialogCardViewport } from './dialog-card-viewport.ts'
import UiButton from '@/components/ui-kit/button.vue'
import type { SfxOptions } from '@/sfx/directive'

export type DialogCardSize = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<DialogCardSize, string> = {
  sm: 'w-140 h-110',
  md: 'w-150 h-160',
  lg: 'w-160 h-170'
}

const SIZE_FULL_BLEED_AT: Record<DialogCardSize, string> = {
  sm: 'w<sm | h<sm',
  md: 'w<sm | h<sm',
  lg: 'w<sm | h<md'
}

const SIZE_CONTENT_MAX_WIDTH: Record<DialogCardSize, string> = {
  sm: '25rem',
  md: '32.5rem',
  lg: '35rem'
}

const SIZE_CONTENT_BREAKOUT_MAX_WIDTH: Record<DialogCardSize, string> = {
  sm: '35rem',
  md: '37.5rem',
  lg: '40rem'
}

export type DialogCardProps = {
  title?: string
  show_header?: boolean
  show_close_button?: boolean
  close_label?: string
  close_disabled?: boolean
  close_sfx?: SfxOptions
  size?: DialogCardSize
  full_bleed_at?: string
  dialog_px?: string
  content_max_width?: string
  content_breakout_max_width?: string
  // Takes the header out of flow (absolutely pinned to the top) so the body
  // fills the card's full height and any centering inside it is relative to
  // that full height, not the space left over after the header. The header
  // then visually floats over the top of the body instead of pushing it down.
  float_header?: boolean
  // Background utility classes. A dedicated prop rather than a `class`
  // override so a caller's value replaces the default outright instead of
  // both landing in the same Tailwind layer, where two conflicting bg-*
  // utilities race unpredictably.
  bg_class?: string
}

const {
  title,
  show_header = true,
  show_close_button = true,
  close_label,
  close_disabled = false,
  close_sfx,
  size = 'md',
  full_bleed_at,
  dialog_px,
  content_max_width,
  content_breakout_max_width,
  float_header = false,
  bg_class = 'bg-brown-200 dark:bg-grey-800'
} = defineProps<DialogCardProps>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const slots = defineSlots<{
  header(): any
  'header-start'(): any
  'header-end'(): any
  default(props: { viewport: DialogCardViewport }): any
}>()

const { t } = useI18n()
const viewport = provideDialogCardViewport(full_bleed_at ?? SIZE_FULL_BLEED_AT[size])

const card_style = computed(() => ({
  ...(dialog_px && { '--dialog-px': dialog_px }),
  '--content-grid-max-width': content_max_width ?? SIZE_CONTENT_MAX_WIDTH[size],
  '--content-grid-breakout-max-width':
    content_breakout_max_width ?? SIZE_CONTENT_BREAKOUT_MAX_WIDTH[size]
}))

defineExpose({ viewport })
</script>

<template>
  <div
    data-testid="dialog-card"
    class="content-grid content-grid-px-(--dialog-px) relative gap-y-4 overflow-hidden [--dialog-px:1.5rem] sm:[--dialog-px:2rem]"
    :class="[
      SIZE_CLASSES[size],
      bg_class,
      float_header ? 'grid-rows-[minmax(0,1fr)]' : 'grid-rows-[auto_minmax(0,1fr)]',
      viewport === 'mobile'
        ? 'h-full! w-full! rounded-none!'
        : 'rounded-8 shadow-lg border-t border-l border-brown-100 dark:border-grey-900'
    ]"
    :style="card_style"
  >
    <slot name="header">
      <dialog-card-header
        v-if="show_header && (title || show_close_button || slots['header-start'])"
        :title="title"
        class="full-width"
        :class="float_header ? 'absolute inset-x-0 top-0 z-10' : ''"
      >
        <template #start>
          <slot name="header-start">
            <ui-button
              v-if="show_close_button"
              data-testid="dialog-card__close"
              data-theme="brown-100"
              data-theme-dark="stone-700"
              icon-left="close"
              icon-only
              rounded-full
              :sfx="close_sfx"
              :disabled="close_disabled"
              @press="emit('close')"
            >
              {{ close_label ?? t('dialog-card.close-label') }}
            </ui-button>
          </slot>
        </template>

        <template v-if="slots['header-end']" #end>
          <slot name="header-end"></slot>
        </template>
      </dialog-card-header>
    </slot>

    <slot :viewport="viewport"></slot>
  </div>
</template>
