<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import type { Placement } from '@floating-ui/vue'
import UiButton, { type ButtonProps } from '../button.vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import DropdownCaret from './caret.vue'
import DropdownMenu from './menu.vue'
import { emitSfx } from '@/sfx/bus'
import type { DropdownOption } from './types'

export type { DropdownOption } from './types'

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
  menuTheme?: Theme
  menuThemeDark?: Theme
  menuClass?: string
  triggerTheme?: Theme
  triggerThemeDark?: Theme
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
  disabled = false,
  menuTheme = 'brown-300',
  menuThemeDark,
  menuClass = 'outline-1 outline-brown-100 dark:outline-grey-900',
  triggerTheme,
  triggerThemeDark
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

const popover_open = ref(false)

// Callers reach these through a template ref: `open` to mirror the menu state
// (e.g. keeping a card's active look while its menu is up), `show` to open the
// menu from a gesture that isn't a trigger press (e.g. a long-press on the card).
defineExpose({ open: popover_open, show })

// Theme/class/layout attrs ride the popover container (its non-teleported
// content inherits the theme), while event handlers — the consumer's primary
// @click — land on the inner button so they fire only from the label region.
// With no consumer `data-theme`, the trigger falls back to the neutral surface
// rather than a theme-primary fill; a supplied `data-theme` still themes it.
const popover_attrs = computed(() => {
  const result = filter_attrs((key) => !key.startsWith('on'))
  if (result['data-theme'] === undefined) {
    result['data-theme'] = 'brown-100'
    result['data-theme-dark'] = 'stone-700'
  }
  return result
})
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

// Both transparent variants (ghost, outline) fill with theme-primary while the
// menu is up, so the trigger and menu read as one continuous surface. Ghost's
// text normally reads in theme-primary (nothing behind it), so it also needs
// to flip to on-primary here to stay legible against that fill — outline's
// text is on-primary already, so it needs no override.
const trigger_style = computed(() => {
  if (variant === 'solid' || !popover_open.value) return undefined
  return {
    '--btn-bg-color': 'var(--theme-primary)',
    ...(variant === 'ghost' ? { '--btn-text-color': 'var(--theme-on-primary)' } : {})
  }
})

function filter_attrs(keep: (key: string) => boolean) {
  const result: Record<string, unknown> = {}
  for (const key in attrs) {
    if (keep(key)) result[key] = attrs[key]
  }
  return result
}

function toggle() {
  if (disabled) return
  emitSfx('snappy_button_5')
  popover_open.value = !popover_open.value
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
        :data-theme="triggerTheme"
        :data-theme-dark="triggerThemeDark"
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
            :trigger-theme="triggerTheme"
            :trigger-theme-dark="triggerThemeDark"
            :disabled="disabled"
            @toggle="toggle"
          />
        </template>
      </ui-button>
    </template>

    <dropdown-menu
      :options="options"
      :size="size"
      :menu-theme="menuTheme"
      :menu-theme-dark="menuThemeDark"
      :menu-class="menuClass"
      @select="onMenuSelect"
    >
      <template v-if="$slots.panel" #default>
        <slot name="panel" :close="close" />
      </template>
    </dropdown-menu>
  </ui-popover>
</template>
