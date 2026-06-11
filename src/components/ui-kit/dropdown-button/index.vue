<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import type { Placement } from '@floating-ui/vue'
import UiButton, { type ButtonProps } from '../button.vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { emitSfx } from '@/sfx/bus'
import { flipEnter, flipLeave } from '@/utils/animations/flip'

export type DropdownOption = {
  label: string
  value: string | number
  icon?: string
}

type DropdownButtonProps = Pick<
  ButtonProps,
  'size' | 'variant' | 'inverted' | 'fullWidth' | 'iconLeft' | 'sfx' | 'playOnTap'
> & {
  options: DropdownOption[]
  position?: Placement
  triggerIcon?: string
  gap?: number
  openOnTrigger?: boolean
  hideTrigger?: boolean
  shadow?: boolean
}

defineOptions({ inheritAttrs: false })

const {
  options,
  size = 'base',
  variant = 'solid',
  inverted,
  fullWidth,
  iconLeft,
  sfx,
  playOnTap,
  position = 'bottom-start',
  triggerIcon = 'arrow-drop-down',
  gap = 4,
  openOnTrigger = false,
  hideTrigger = false,
  shadow = false
} = defineProps<DropdownButtonProps>()

const emit = defineEmits<{
  (e: 'select', option: DropdownOption): void
}>()

const slots = defineSlots<{
  default(): unknown
}>()

const attrs = useAttrs()

const popover_open = ref(false)

// Theme/class/layout attrs ride the popover container (its non-teleported
// content inherits the theme), while event handlers — the consumer's primary
// @click — land on the inner button so they fire only from the label region.
const popover_attrs = computed(() => filter_attrs((key) => !key.startsWith('on')))
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
// menu is up, so the trigger and menu read as one continuous surface.
const trigger_style = computed(() =>
  variant !== 'solid' && popover_open.value
    ? { '--btn-bg-color': 'var(--theme-primary)' }
    : undefined
)

function filter_attrs(keep: (key: string) => boolean) {
  const result: Record<string, unknown> = {}
  for (const key in attrs) {
    if (keep(key)) result[key] = attrs[key]
  }
  return result
}

function toggle() {
  emitSfx('ui.snappy_button_5', { blocking: true })
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

function onCaretEnter(el: Element, done: () => void) {
  flipEnter(el, 'x', done)
}

function onCaretLeave(el: Element, done: () => void) {
  flipLeave(el, 'x', done)
}

function close() {
  popover_open.value = false
}

function onSelect(option: DropdownOption) {
  emitSfx('ui.select')
  emit('select', option)
  close()
}
</script>

<template>
  <ui-popover
    :open="popover_open"
    :position="position"
    :gap="gap"
    :shadow="shadow"
    :use_arrow="false"
    match_reference_width
    data-testid="dropdown-button"
    v-bind="popover_attrs"
    :class="{ 'z-100': popover_open }"
    @close="close"
  >
    <template #trigger>
      <ui-button
        v-bind="button_attrs"
        :size="size"
        :variant="variant"
        :inverted="inverted"
        :full-width="fullWidth"
        :icon-left="iconLeft"
        :sfx="sfx"
        :play-on-tap="playOnTap"
        :style="trigger_style"
        data-testid="dropdown-button__button"
        @click="onButtonClick"
      >
        <slot></slot>
        <template #trailing>
          <div
            v-if="show_trigger"
            class="flex h-full p-2 pointer-coarse:p-0"
            data-testid="dropdown-button__trigger-wrap"
          >
            <transition mode="out-in" @enter="onCaretEnter" @leave="onCaretLeave">
              <span
                :key="String(popover_open)"
                role="button"
                tabindex="0"
                aria-haspopup="menu"
                :aria-expanded="popover_open"
                :data-active="popover_open"
                class="relative z-1 flex aspect-square h-full cursor-pointer items-center justify-center rounded-[calc(var(--btn-border-radius)-8px)] pointer-coarse:rounded-(--btn-border-radius) bg-(--theme-secondary) text-(--theme-on-secondary) transition-[scale] duration-120 ease-[ease] hover:scale-110"
                data-testid="dropdown-button__trigger"
                v-sfx.hover="'ui.click_07'"
                @click.stop="toggle"
                @keydown.enter.space.stop.prevent="toggle"
              >
                <ui-icon
                  :src="triggerIcon"
                  class="size-[calc(var(--icon-size,20px)-6px)]"
                  :class="{ 'rotate-180': popover_open }"
                />
              </span>
            </transition>
          </div>
        </template>
      </ui-button>
    </template>

    <div
      class="flex flex-col overflow-hidden rounded-(--btn-border-radius) bg-(--theme-primary) py-2 text-(length:--btn-font-size) leading-(--btn-font-size--line-height) text-(--theme-on-primary)"
      :class="`ui-kit-btn-tokens--${size}`"
      data-testid="dropdown-button__menu"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="flex w-full cursor-pointer items-center gap-(--btn-gap) p-(--btn-padding) text-start whitespace-nowrap hover:bg-[color-mix(in_srgb,var(--theme-on-primary)_14%,transparent)]"
        data-testid="dropdown-button__option"
        @click="onSelect(option)"
      >
        <ui-icon v-if="option.icon" :src="option.icon" class="size-(--icon-size,20px) shrink-0" />
        <span>{{ option.label }}</span>
      </button>
    </div>
  </ui-popover>
</template>
