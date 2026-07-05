<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { coverBindings } from '@/utils/cover'
import { mobileSheetOverlayKey } from './mobile-sheet-overlay'
import {
  SHEET_BODY_BG,
  SHEET_HEADER_BORDER_CLASS,
  type SheetHeaderBorder,
  type SheetSurface
} from './sheet-surface'
import UiButton from '@/components/ui-kit/button.vue'

type SheetPatternConfig = {
  theme?: Theme
  theme_dark?: Theme
  pattern?: DeckCoverPattern
  pattern_size?: string
  pattern_opacity?: string
}

export type MobileSheetProps = {
  pattern_config?: SheetPatternConfig
  title?: string
  show_close_button?: boolean
  close_label?: string
  close_icon?: string
  surface?: SheetSurface
  header_border?: SheetHeaderBorder
  sheet_px?: string
}

const {
  pattern_config,
  title,
  show_close_button = true,
  close_label,
  close_icon = 'close',
  surface = 'standard',
  header_border = 'wave',
  sheet_px
} = defineProps<MobileSheetProps>()

const { t } = useI18n()

const slots = defineSlots<{
  sidebar(): any
  overlay(): any
  header(): any
  'header-content'(): any
  default(): any
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const body_bg_class = computed(() => SHEET_BODY_BG[surface])
const header_border_class = computed(() => SHEET_HEADER_BORDER_CLASS[header_border])
const close_label_text = computed(() => close_label ?? t('mobile-sheet.close-label'))

// The default header owns the close button. A custom `header` slot replaces the
// header entirely, so the caller owns its own close affordance there.
const show_builtin_close = computed(() => show_close_button && !slots.header)

const header_bindings = computed(() =>
  coverBindings(
    {
      theme: pattern_config?.theme,
      pattern: pattern_config?.pattern
    },
    {
      border: false,
      patternOpacity: pattern_config?.pattern_opacity ?? '0.25',
      patternSize: pattern_config?.pattern_size
    }
  )
)

const showHeader = computed(() => Boolean(slots.header || slots['header-content'] || title))

const overlay_root = ref<HTMLElement>()
provide(mobileSheetOverlayKey, overlay_root)
</script>

<template>
  <div
    data-testid="mobile-sheet-root"
    class="relative w-full shrink-0 mobile-modal:mt-auto pointer-coarse:pt-px [--sheet-px:4.5rem] lg:[--sheet-px:2rem]"
    :style="sheet_px ? { '--sheet-px': sheet_px } : undefined"
  >
    <div
      ref="overlay_root"
      data-testid="mobile-sheet__overlay"
      class="absolute inset-0 pointer-events-none z-10"
    >
      <slot name="overlay"></slot>
    </div>

    <div
      data-testid="mobile-sheet-container"
      class="flex overflow-hidden w-full h-full rounded-t-8 rounded-b-8 mobile-modal:rounded-b-none shadow-lg border-brown-100 dark:border-grey-900 border-t border-l mobile-modal:border-r"
    >
      <slot name="sidebar"></slot>

      <div
        data-testid="mobile-sheet"
        :data-surface="surface"
        :class="['relative flex w-full h-full flex-col', body_bg_class]"
      >
        <div
          v-if="show_builtin_close"
          data-testid="mobile-sheet__close-slot"
          class="absolute top-0 p-4 left-0 z-20"
        >
          <ui-button
            :icon-left="close_icon"
            icon-only
            :inverted="showHeader"
            @press="emit('close')"
            play-on-tap
          >
            {{ close_label_text }}
          </ui-button>
        </div>

        <slot v-if="showHeader" name="header">
          <div
            data-testid="mobile-sheet__header"
            :data-header-border="header_border"
            v-bind="header_bindings"
            :class="[
              'w-full flex justify-center items-center place-items-center px-(--sheet-px) pt-11.5 pb-14 gap-6 bg-(--theme-primary) text-(--theme-on-primary) relative',
              header_border_class
            ]"
          >
            <slot name="header-content">
              <h1 class="text-5xl text-white">{{ title }}</h1>
            </slot>
          </div>
        </slot>

        <div data-testid="mobile-sheet__body" class="h-full">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>
