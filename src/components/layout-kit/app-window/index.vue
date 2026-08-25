<script setup lang="ts">
// Trap: the root renders full-width — every caller sets its own width cap on non-mobile screens →[K:app-window-fills-full-width]
// Docked to the bottom of a viewport too short to hold it, this window drops whatever height its caller set and its body stops scrolling — the sheet around it is then the only thing that scrolls. `keep_docked_height` narrows that to the width half of docking. →[K:docked-app-window-drops-body-scroll]
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { coverBindings } from '@/utils/cover'
import {
  WINDOW_HEADER_BORDER_CLASS,
  WINDOW_HEADER_DEPTH,
  WINDOW_HEADER_FILL_CLASS,
  type WindowHeaderBorder
} from './surface'
import UiButton from '@/components/ui-kit/button.vue'
import ScrollRegion from '@/components/layout-kit/scroll-region/index.vue'

type WindowPatternConfig = {
  palette?: PaletteName
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
  header_border?: WindowHeaderBorder
  window_px?: string
  /** Makes the body itself the scrolling region, so content runs under the header and is cut at the window's bottom edge. Off by default; a window whose pages manage their own overflow leaves it off. */
  scroll_body?: boolean
  /** Keeps the caller's height cap when the window docks only because the viewport is short, leaving the width half of docking untouched. Off by default. */
  keep_docked_height?: boolean
}

const {
  pattern_config,
  title,
  show_close_button = true,
  close_label,
  close_icon = 'close',
  header_border = 'wave',
  window_px,
  scroll_body = false,
  keep_docked_height = false
} = defineProps<AppWindowProps>()

const { t } = useI18n()

const slots = defineSlots<{
  sidebar(): any
  overlay(): any
  header(): any
  'header-content'(): any
  default(): any
  footer?(): any
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const header_border_class = computed(() => WINDOW_HEADER_BORDER_CLASS[header_border])
const header_fill_class = computed(() => WINDOW_HEADER_FILL_CLASS[header_border])
const close_label_text = computed(() => close_label ?? t('app-window.close-label'))

/** Default header owns the close button; a custom `header` slot replaces the header entirely, so the caller owns its own close affordance there. */
const show_builtin_close = computed(() => show_close_button && !slots.header)

const header_bindings = computed(() =>
  coverBindings(
    {
      palette: pattern_config?.palette,
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

/*
 * Docking releases the caller's height cap and hands the body's overflow to the
 * sheet. `keep_docked_height` narrows that release to the width half, so a
 * window docked only because the viewport got short keeps its cap and keeps its
 * own body scroller. Constant per caller, never rewritten as the viewport moves
 * →[K:mid-gesture-mutation-kills-momentum-scroll].
 */
const docked_release_class = computed(() =>
  keep_docked_height
    ? 'mobile-modal-flush:h-auto! mobile-modal-flush:[--scroll-overflow:visible]'
    : 'mobile-modal:h-auto! mobile-modal:[--scroll-overflow:visible]'
)

const root_style = computed(() => ({
  ...(window_px ? { '--window-px': window_px } : {}),
  ...(scroll_body && showHeader.value
    ? { '--window-header-depth': WINDOW_HEADER_DEPTH[header_border] }
    : {})
}))
</script>

<template>
  <div
    data-testid="app-window-root"
    class="relative w-full shrink-0 mobile-modal:mt-auto pointer-coarse:pt-px [--window-px:4.5rem] lg:[--window-px:2rem]"
    :class="docked_release_class"
    :style="root_style"
  >
    <div
      data-testid="app-window__overlay"
      class="absolute inset-0 pointer-events-none z-(--window-overlay-z,30)"
    >
      <slot name="overlay"></slot>
    </div>

    <div
      data-testid="app-window-container"
      data-station="window"
      class="flex overflow-hidden w-full h-full rounded-t-8 rounded-b-8 mobile-modal:rounded-b-none bevel-lg mobile-modal-flush:bevel-sheet"
    >
      <slot name="sidebar"></slot>

      <div data-testid="app-window" class="relative flex w-full h-full flex-col">
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
                'w-full flex justify-center items-center place-items-center px-(--window-px) pt-11.5 pb-14 gap-6 bg-(--color-accent) text-(--color-on-accent) relative z-10',
                header_border_class
              ]"
            >
              <slot name="header-content">
                <h1 class="text-5xl">{{ title }}</h1>
              </slot>
            </div>
          </slot>

          <div
            v-if="header_fill_class && !scroll_body"
            data-testid="app-window__header-fill"
            aria-hidden="true"
            :class="['absolute inset-0 z-20 pointer-events-none bg-surface', header_fill_class]"
          ></div>
        </div>

        <div
          data-testid="app-window__body"
          :data-scroll-body="scroll_body || undefined"
          :data-window-edge="slots.footer ? undefined : 'bottom'"
          class="scroll-hidden relative min-h-0 flex-1 bg-surface"
        >
          <scroll-region
            v-if="scroll_body"
            gutter="inside"
            class="flex h-full flex-col [--scroll-track-inset-start:var(--window-header-depth,0px)]"
            scroller_class="pt-(--window-header-depth)"
          >
            <slot></slot>
          </scroll-region>

          <slot v-else></slot>
        </div>

        <div
          v-if="slots.footer"
          data-testid="app-window__footer"
          class="bg-surface relative z-20 shrink-0"
        >
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sits above the header's shaped edge so a page can paint into the notch. The
   header, its fill, and any lowered overlay all order themselves against this
   number — keep them in the same stacking context, never give the header slot
   its own z-index. */
[data-testid='app-window__body'] {
  z-index: 20;
}

/* Stops the scroll track where the window's rounded bottom corner starts, which would clip its cap —
   32px being `rounded-b-8` written out. A window with a footer has no such edge and keeps the
   track's full height. */
[data-window-edge='bottom'] {
  --scroll-track-inset-end: 32px;
}

/* An attribute rather than a bound class — rewriting `class` around a scrolling box mid-gesture
   kills iOS momentum scroll. →[K:mid-gesture-mutation-kills-momentum-scroll] */
[data-scroll-body] {
  /* Drops under the header so scrolled content passes beneath the wave. */
  z-index: 0;

  /* Starts the scroll area behind the header's shaped edge, so content passes under the wave instead of clipping on a straight line. */
  margin-top: calc(var(--window-header-depth, 0px) * -1);
}
</style>
