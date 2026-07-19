<script lang="ts">
// Only one dropdown menu may be open at a time, app-wide. Outside-click close
// usually enforces this on its own, but a long-press open swallows the release
// click (see press-hold.ts), so the previous menu would survive — the seam
// closes it explicitly instead.
let close_open_menu: (() => void) | null = null

export type { DropdownOption } from './types'
</script>

<script setup lang="ts">
import { computed, onUnmounted, ref, useAttrs } from 'vue'
import type { Placement } from '@floating-ui/vue'
import UiButton, { type ButtonProps } from '../button.vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import DropdownCaret from './caret.vue'
import DropdownMenu from './menu.vue'
import { nextDepth, useAmbientDepth } from '@/composables/ui/depth'
import { emitSfx } from '@/sfx/bus'
import type { DropdownOption } from './types'

type DropdownButtonProps = Pick<
  ButtonProps,
  | 'size'
  | 'variant'
  | 'inverted'
  | 'fullWidth'
  | 'iconLeft'
  | 'iconRight'
  | 'sfx'
  | 'playOnTap'
  | 'tapAnimate'
> & {
  options?: DropdownOption[]
  position?: Placement
  fallbackPlacements?: Placement[]
  triggerIcon?: string
  gap?: number
  openOnTrigger?: boolean
  hideTrigger?: boolean
  shadow?: boolean
  // Render only the trigger button — no primary action label alongside it.
  triggerOnly?: boolean
  // Disable only the primary action — the caret trigger stays live so the menu
  // can still be opened (e.g. "already added, but add to another deck").
  primaryDisabled?: boolean
  // Disable the whole control — primary action AND the caret trigger, so the
  // menu can't be opened either.
  disabled?: boolean
}

defineOptions({ inheritAttrs: false })

const {
  options = [],
  size = 'base',
  variant = 'solid',
  inverted,
  fullWidth,
  iconLeft,
  iconRight,
  sfx,
  // Mirror ui-button's tap defaults: an absent Boolean prop casts to `false`,
  // which would otherwise forward `:play-on-tap="false"` and suppress the
  // button's own quiet-tap default. Keep in sync with button.vue.
  playOnTap = true,
  tapAnimate = false,
  position = 'bottom-start',
  fallbackPlacements = ['bottom-start', 'bottom-end', 'top-start', 'top-end'],
  triggerIcon = 'arrow-drop-down',
  gap = 4,
  openOnTrigger = false,
  hideTrigger = false,
  shadow = false,
  triggerOnly = false,
  primaryDisabled = false,
  disabled = false
} = defineProps<DropdownButtonProps>()

const emit = defineEmits<{
  (e: 'select', option: DropdownOption): void
}>()

const slots = defineSlots<{
  default(): unknown
  // Raw dropdown body — replaces the options menu when provided. Receives
  // `close` so the panel can dismiss the dropdown itself.
  panel(props: { close: () => void }): unknown
}>()

const attrs = useAttrs()
const ambient_depth = useAmbientDepth()

const popover_open = ref(false)

// A dropdown trigger is CHROME by default — most are settings/overflow/option
// menus, not accent actions. An accent dropdown opts in by passing a
// `data-palette`, which routes onto the trigger button (and, via inheritance,
// its caret) so the `[data-palette]` seam repaints it. Absent that, the trigger
// button + caret render the `element` chrome roles (`neutral`).
const identity_palette = computed(() => attrs['data-palette'] as string | undefined)
const is_neutral = computed(() => !identity_palette.value)

// Callers reach these through a template ref: `open` to mirror the menu state
// (e.g. keeping a card's active look while its menu is up), `show` to open the
// menu from a gesture that isn't a trigger press (e.g. a long-press on the card).
defineExpose({ open: popover_open, show })

// Class/layout attrs ride the popover container, while event handlers — the
// consumer's primary @click — land on the inner button so they fire only from
// the label region. Nothing is injected here: the container inherits the
// ambient depth and identity like any other element.
const popover_attrs = computed(() =>
  filter_attrs((key) => !key.startsWith('on') && key !== 'data-palette')
)
// `onClick` is handled through `onButtonClick` instead of forwarded, so the inner
// button never receives both it and the trigger handler as a merged array — which
// its play-on-tap intercept can't invoke (it expects a single onClick function).
const button_attrs = computed(() =>
  filter_attrs((key) => key.startsWith('on') && key !== 'onClick')
)

// The caret is the only way to open the menu unless the whole button is the
// trigger, so it can only be hidden when `openOnTrigger` also makes the label
// region open the popover.
const show_trigger = computed(() => !hideTrigger || !openOnTrigger)

// While the menu is up, the trigger ADOPTS the menu's depth — same data-depth,
// so the transparent variants (ghost, outline) fill with the very same surface
// the menu paints and the two read as one continuous plane. This used to be
// stated in colours (a --theme-primary fill), which said "depth" in the wrong
// vocabulary and broke the moment either side sat on a different surface.
const trigger_depth = computed(() =>
  popover_open.value ? nextDepth(ambient_depth.value) : undefined
)

const trigger_style = computed(() => {
  if (variant === 'solid' || !popover_open.value) return undefined
  return { '--btn-bg-color': 'var(--color-surface)', '--btn-text-color': 'var(--color-ink)' }
})

function filter_attrs(keep: (key: string) => boolean) {
  const result: Record<string, unknown> = {}
  for (const key in attrs) {
    if (keep(key)) result[key] = attrs[key]
  }
  return result
}

// Unmounting while open (e.g. the card unmounts) must release the singleton
// slot, or the next open would call a dead instance's close.
onUnmounted(() => {
  if (close_open_menu === close) close_open_menu = null
})

function toggle() {
  if (disabled) return
  emitSfx('snappy_button_5')
  if (popover_open.value) return close()

  close_open_menu?.()
  close_open_menu = close
  popover_open.value = true
}

// With `openOnTrigger`, the whole button is the dropdown trigger — not just the
// caret. The caret keeps its own `@click.stop`, so it never double-fires here.
function onTriggerClick() {
  if (openOnTrigger) toggle()
}

// Single click handler for the label region: the dropdown's own trigger behaviour
// plus the consumer's forwarded @click, so the inner button sees one onClick.
function onButtonClick(e: MouseEvent) {
  onTriggerClick()

  const consumer = attrs.onClick as
    | ((e: MouseEvent) => void)
    | ((e: MouseEvent) => void)[]
    | undefined
  if (Array.isArray(consumer)) consumer.forEach((fn) => fn(e))
  else consumer?.(e)
}

/** Open the menu programmatically, with the same sfx/disabled gate as a press. */
function show() {
  if (!popover_open.value) toggle()
}

function close() {
  if (close_open_menu === close) close_open_menu = null
  popover_open.value = false
}

function onMenuSelect(option: DropdownOption) {
  emit('select', option)
  close()
}
</script>

<template>
  <ui-popover
    :open="popover_open"
    :position="position"
    :fallback_placements="fallbackPlacements"
    :gap="gap"
    :shadow="shadow"
    :use_arrow="false"
    :match_reference_width="!triggerOnly && !$slots.panel"
    data-testid="dropdown-button"
    v-bind="popover_attrs"
    :data-active="popover_open"
    :class="{ 'z-100': popover_open }"
    @close="close"
  >
    <template #trigger>
      <ui-button
        v-if="triggerOnly"
        icon-only
        :icon-left="triggerIcon"
        :size="size"
        :variant="variant"
        :neutral="is_neutral"
        :data-palette="identity_palette"
        :data-depth="trigger_depth"
        :data-active="popover_open"
        :disabled="disabled"
        :style="trigger_style"
        data-testid="dropdown-button__button"
        @press="toggle"
      />
      <ui-button
        v-else
        v-bind="button_attrs"
        :size="size"
        :variant="variant"
        :inverted="inverted"
        :neutral="is_neutral"
        :data-palette="identity_palette"
        :full-width="fullWidth"
        :icon-left="iconLeft"
        :icon-right="iconRight"
        :sfx="sfx"
        :play-on-tap="playOnTap"
        :tap-animate="tapAnimate"
        :disabled="disabled || primaryDisabled"
        :data-depth="trigger_depth"
        :style="trigger_style"
        data-testid="dropdown-button__button"
        @press="onButtonClick"
      >
        <slot></slot>
        <template #trailing>
          <dropdown-caret
            v-if="show_trigger"
            :open="popover_open"
            :icon="triggerIcon"
            :size="size"
            :disabled="disabled"
            :neutral="is_neutral"
            @toggle="toggle"
          />
        </template>
      </ui-button>
    </template>

    <dropdown-menu :options="options" :size="size" @select="onMenuSelect">
      <template v-if="$slots.panel" #default>
        <slot name="panel" :close="close" />
      </template>
    </dropdown-menu>
  </ui-popover>
</template>
