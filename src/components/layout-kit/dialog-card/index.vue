<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCardHeader from './dialog-card-header.vue'
import { provideDialogCardViewport, type DialogCardViewport } from './dialog-card-viewport.ts'
import UiButton from '@/components/ui-kit/button.vue'
import { nextDepth, provideDepth, useAmbientDepth } from '@/composables/ui/depth'
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
  lg: '37rem'
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
  /** Pins the header out of flow at the top so the body fills the card's full height, and the header floats over it instead of pushing it down. */
  float_header?: boolean
  /** Dedicated prop rather than a `class` override, so a caller's value replaces the default outright instead of two conflicting bg-* utilities racing in the same Tailwind layer. */
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
  bg_class = 'bg-surface'
} = defineProps<DialogCardProps>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const slots = defineSlots<{
  header(): any
  'header-start'(): any
  'header-end'(): any
  default(props: { viewport: DialogCardViewport }): any
  /** Pinned bottom row, outside the body's flow — action bars that must stay put while the body scrolls. */
  toolbar?(): any
}>()

const { t } = useI18n()

/** Always floats over the surface that opened it. */
const ambient_depth = useAmbientDepth()
const depth = provideDepth(() => nextDepth(ambient_depth.value))

const viewport = provideDialogCardViewport(full_bleed_at ?? SIZE_FULL_BLEED_AT[size])
/** Called from the template, not a `computed` — `slots.toolbar` isn't reactive. →[K:dialog-card-toolbar-slot-reactivity] */
function gridRowsClass() {
  if (float_header) {
    return slots.toolbar ? 'grid-rows-[minmax(0,1fr)_auto]' : 'grid-rows-[minmax(0,1fr)]'
  }

  return slots.toolbar ? 'grid-rows-[auto_minmax(0,1fr)_auto]' : 'grid-rows-[auto_minmax(0,1fr)]'
}

/** With a toolbar, the toolbar row owns the bottom space and the body takes none. →[K:dialog-card-toolbar-slot-reactivity] */
function bodyPaddingStyle() {
  return { '--dialog-body-pb': slots.toolbar ? '0px' : 'var(--dialog-px)' }
}

/** Set directly rather than via a Tailwind arbitrary-value class. →[K:dialog-card-content-grid-padding] */
// --content-grid-max-width caps to 100% on mobile so the content column always
// resolves to `100% - padding*2`, rather than a fixed desktop-sized max-width
// that could still be narrower than the phone's viewport.
const card_style = computed(() => ({
  ...(dialog_px && { '--dialog-px': dialog_px }),
  '--content-grid-padding': 'var(--dialog-px)',
  '--content-grid-max-width':
    viewport.value === 'mobile' ? '100%' : (content_max_width ?? SIZE_CONTENT_MAX_WIDTH[size]),
  '--content-grid-breakout-max-width':
    content_breakout_max_width ?? SIZE_CONTENT_BREAKOUT_MAX_WIDTH[size]
}))

defineExpose({ viewport })
</script>

<template>
  <div
    data-testid="dialog-card"
    :data-depth="depth"
    class="content-grid relative gap-y-4 overflow-hidden [--dialog-px:1.5rem] sm:[--dialog-px:2rem]"
    :class="[
      SIZE_CLASSES[size],
      bg_class,
      gridRowsClass(),
      viewport === 'mobile' ? 'h-full! w-full! rounded-none!' : 'rounded-8 bevel-lg'
    ]"
    :style="[card_style, bodyPaddingStyle()]"
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
              neutral
              v-if="show_close_button"
              data-testid="dialog-card__close"
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

    <div v-if="slots.toolbar" data-testid="dialog-card__toolbar" class="pb-(--dialog-px)">
      <slot name="toolbar"></slot>
    </div>
  </div>
</template>
