<script lang="ts">
/**
 * The one dropdown allowed open app-wide — opening a new one closes this.
 * Needed because a long-press open swallows the release click, so outside-click
 * close never fires for it.
 */
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
import { useAmbientDepth } from '@/composables/ui/depth'
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
  // Renders only the trigger button, with no primary-action label beside it.
  triggerOnly?: boolean
  // Disables the primary action only — the caret stays live so the menu can
  // still be opened.
  primaryDisabled?: boolean
  // Disables the primary action and the caret, so the menu can't open either.
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
  // Mirrors button.vue's default — an absent Boolean prop casts to `false` and
  // would otherwise suppress the button's own quiet-tap default.
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
  // Raw dropdown body, replacing the options menu; `close` lets it dismiss itself.
  panel(props: { close: () => void }): unknown
}>()

const attrs = useAttrs()
const ambient_depth = useAmbientDepth()

const popover_open = ref(false)

// Neutral (chrome) by default; opts into a palette only via `data-palette` on
// this component. →[K:theming-palette-identity]
const identity_palette = computed(() => attrs['data-palette'] as string | undefined)
const is_neutral = computed(() => !identity_palette.value)

// `open` lets a caller mirror the menu state; `show` opens it from a gesture
// that isn't a trigger press (e.g. a long-press on the card).
defineExpose({ open: popover_open, show })

// Class/layout attrs ride the popover container; event handlers land on the
// inner button instead, so they fire only from the label region.
const popover_attrs = computed(() =>
  filter_attrs((key) => !key.startsWith('on') && key !== 'data-palette')
)
// `onClick` goes through `onButtonClick` instead, so the inner button never
// receives it merged with the trigger handler as an array.
const button_attrs = computed(() =>
  filter_attrs((key) => key.startsWith('on') && key !== 'onClick')
)

// Hideable only when `openOnTrigger` gives the label region its own way to
// open the menu — otherwise the caret is the only trigger.
const show_trigger = computed(() => !hideTrigger || !openOnTrigger)

// Ghost/outline variants get an explicit fill while open, matching the menu's
// background, so the two read as one surface; solid already fills.
const trigger_style = computed(() => {
  if (variant === 'solid' || !popover_open.value) return undefined
  return { '--btn-bg-color': 'var(--color-element)', '--btn-text-color': 'var(--color-on-element)' }
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

    <dropdown-menu :options="options" :size="size" :depth="ambient_depth" @select="onMenuSelect">
      <template v-if="$slots.panel" #default>
        <slot name="panel" :close="close" />
      </template>
    </dropdown-menu>
  </ui-popover>
</template>
