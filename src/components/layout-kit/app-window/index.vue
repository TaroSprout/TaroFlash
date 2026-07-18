<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { coverBindings } from '@/utils/cover'
import {
  WINDOW_BODY_BG,
  WINDOW_HEADER_BORDER_CLASS,
  WINDOW_HEADER_FILL_CLASS,
  type WindowHeaderBorder,
  type WindowSurface
} from './surface'
import UiButton from '@/components/ui-kit/button.vue'

type WindowPatternConfig = {
  theme?: Theme
  theme_dark?: Theme
  pattern?: DeckCoverPattern
  pattern_size?: string
  pattern_opacity?: string
}

export type AppWindowProps = {
  pattern_config?: WindowPatternConfig
  title?: string
  show_close_button?: boolean
  close_label?: string
  close_icon?: string
  surface?: WindowSurface
  header_border?: WindowHeaderBorder
  window_px?: string
}

const {
  pattern_config,
  title,
  show_close_button = true,
  close_label,
  close_icon = 'close',
  surface = 'standard',
  header_border = 'wave',
  window_px
} = defineProps<AppWindowProps>()

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

const body_bg_class = computed(() => WINDOW_BODY_BG[surface])
const header_border_class = computed(() => WINDOW_HEADER_BORDER_CLASS[header_border])
const header_fill_class = computed(() => WINDOW_HEADER_FILL_CLASS[header_border])
const close_label_text = computed(() => close_label ?? t('app-window.close-label'))

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
</script>

<template>
  <div
    data-testid="app-window-root"
    class="relative w-full shrink-0 mobile-modal:mt-auto pointer-coarse:pt-px [--window-px:4.5rem] lg:[--window-px:2rem]"
    :style="window_px ? { '--window-px': window_px } : undefined"
  >
    <div
      data-testid="app-window__overlay"
      class="absolute inset-0 pointer-events-none z-(--window-overlay-z,30)"
    >
      <slot name="overlay"></slot>
    </div>

    <div
      data-testid="app-window-container"
      class="flex overflow-hidden w-full h-full rounded-t-8 rounded-b-8 mobile-modal:rounded-b-none shadow-lg border-brown-100 dark:border-grey-900 border-t border-l mobile-modal:border-r"
    >
      <slot name="sidebar"></slot>

      <div
        data-testid="app-window"
        :data-surface="surface"
        class="relative flex w-full h-full flex-col"
      >
        <div
          v-if="show_builtin_close"
          data-testid="app-window__close-slot"
          class="absolute top-0 p-4 left-0 z-40"
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

        <div v-if="showHeader" data-testid="app-window__header-slot" class="relative">
          <slot name="header">
            <div
              data-testid="app-window__header"
              :data-header-border="header_border"
              v-bind="header_bindings"
              :class="[
                'w-full flex justify-center items-center place-items-center px-(--window-px) pt-11.5 pb-14 gap-6 bg-(--theme-primary) text-(--theme-on-primary) relative z-10',
                header_border_class
              ]"
            >
              <slot name="header-content">
                <h1 class="text-5xl text-white">{{ title }}</h1>
              </slot>
            </div>
          </slot>

          <div
            v-if="header_fill_class"
            data-testid="app-window__header-fill"
            aria-hidden="true"
            :class="['absolute inset-0 z-20 pointer-events-none', body_bg_class, header_fill_class]"
          ></div>
        </div>

        <div
          data-testid="app-window__body"
          :class="['relative z-20 min-h-0 flex-1', body_bg_class]"
        >
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>
