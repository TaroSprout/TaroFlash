<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import type { Placement } from '@floating-ui/vue'
import UiButton, { type ButtonProps } from '../button.vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { emitSfx } from '@/sfx/bus'
import { flipEnter, flipLeave } from '@/utils/animations/flip'
import { useDropdownSizing } from './use-dropdown-sizing'

type DropdownOption = {
  label: string
  value: string | number
  icon?: string
}

type DropdownButtonProps = Pick<
  ButtonProps,
  'size' | 'variant' | 'inverted' | 'fullWidth' | 'iconLeft' | 'sfx'
> & {
  options: DropdownOption[]
  position?: Placement
  triggerIcon?: string
  gap?: number
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
  position = 'bottom-start',
  triggerIcon = 'arrow-drop-down',
  gap = 4
} = defineProps<DropdownButtonProps>()

const emit = defineEmits<{
  (e: 'select', option: DropdownOption): void
}>()

const slots = defineSlots<{
  default(): unknown
}>()

const attrs = useAttrs()
const { triggerRef, sizerRef, min_width, trigger_width } = useDropdownSizing(() => options)

const popover_open = ref(false)

// Theme/class/layout attrs ride the popover container (its non-teleported
// content inherits the theme), while event handlers — the consumer's primary
// @click — land on the inner button so they fire only from the label region.
const popover_attrs = computed(() => filter_attrs((key) => !key.startsWith('on')))
const button_attrs = computed(() => filter_attrs((key) => key.startsWith('on')))

const min_width_style = computed(() =>
  min_width.value ? { minWidth: `${min_width.value}px` } : undefined
)

const menu_style = computed(() =>
  trigger_width.value ? { width: `${trigger_width.value}px` } : undefined
)

function filter_attrs(keep: (key: string) => boolean) {
  const result: Record<string, unknown> = {}
  for (const key in attrs) {
    if (keep(key)) result[key] = attrs[key]
  }
  return result
}

function toggle() {
  emitSfx('ui.select', { blocking: true })
  popover_open.value = !popover_open.value
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
  emit('select', option)
  close()
}
</script>

<template>
  <ui-popover
    :open="popover_open"
    :position="position"
    :gap="gap"
    :use_arrow="false"
    data-testid="dropdown-button"
    v-bind="popover_attrs"
    :class="{ 'z-100': popover_open }"
    @close="close"
  >
    <template #trigger>
      <ui-button
        ref="triggerRef"
        v-bind="button_attrs"
        :size="size"
        :variant="variant"
        :inverted="inverted"
        :full-width="fullWidth"
        :icon-left="iconLeft"
        :sfx="sfx"
        :style="min_width_style"
        data-testid="dropdown-button__button"
      >
        <slot></slot>
        <template #trailing>
          <div
            class="ui-kit-dropdown-button__trigger-wrap"
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
                class="ui-kit-dropdown-button__trigger"
                data-testid="dropdown-button__trigger"
                v-sfx.hover="'ui.click_07'"
                @click.stop="toggle"
                @keydown.enter.space.stop.prevent="toggle"
              >
                <ui-icon
                  :src="triggerIcon"
                  class="ui-kit-dropdown-button__trigger-icon"
                  :class="{ 'ui-kit-dropdown-button__trigger-icon--open': popover_open }"
                />
              </span>
            </transition>
          </div>
        </template>
      </ui-button>

      <span
        ref="sizerRef"
        aria-hidden="true"
        data-testid="dropdown-button__sizer"
        :class="['ui-kit-dropdown-button__sizer', `ui-kit-btn-tokens--${size}`]"
      >
        <span v-for="option in options" :key="option.value" class="ui-kit-dropdown-button__row">
          <ui-icon v-if="option.icon" :src="option.icon" class="ui-kit-dropdown-button__row-icon" />
          <span>{{ option.label }}</span>
        </span>
      </span>
    </template>

    <div
      :class="['ui-kit-dropdown-button__menu', `ui-kit-btn-tokens--${size}`]"
      :style="menu_style"
      data-testid="dropdown-button__menu"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="ui-kit-dropdown-button__row ui-kit-dropdown-button__option"
        data-testid="dropdown-button__option"
        @click="onSelect(option)"
      >
        <ui-icon v-if="option.icon" :src="option.icon" class="ui-kit-dropdown-button__row-icon" />
        <span>{{ option.label }}</span>
      </button>
    </div>
  </ui-popover>
</template>

<style>
.ui-kit-dropdown-button__trigger-wrap {
  display: flex;
  height: 100%;
  padding: 8px;
}

.ui-kit-dropdown-button__trigger {
  position: relative;
  z-index: 1;

  display: flex;
  align-items: center;
  justify-content: center;

  height: 100%;
  aspect-ratio: 1;

  background-color: var(--theme-secondary);
  color: var(--theme-on-secondary);
  border-radius: calc(var(--btn-border-radius) - 8px);
  cursor: pointer;

  transition: scale 120ms ease;
}

@media (hover: hover) {
  .ui-kit-dropdown-button__trigger:hover {
    scale: 1.1;
  }
}

.ui-kit-dropdown-button__trigger-icon {
  width: calc(var(--icon-size, 20px) - 6px);
  height: calc(var(--icon-size, 20px) - 6px);
}

.ui-kit-dropdown-button__trigger-icon--open {
  rotate: 180deg;
}

.ui-kit-dropdown-button__menu {
  display: flex;
  flex-direction: column;
  overflow: hidden;

  border-radius: var(--btn-border-radius);

  background-color: var(--theme-primary);
  color: var(--theme-on-primary);
  font-size: var(--btn-font-size);
  line-height: var(--btn-font-size--line-height);
}

.ui-kit-dropdown-button__row {
  display: flex;
  align-items: center;
  gap: var(--btn-gap);

  padding: var(--btn-padding);
  white-space: nowrap;
}

.ui-kit-dropdown-button__row-icon {
  width: var(--icon-size, 20px);
  height: var(--icon-size, 20px);
}

.ui-kit-dropdown-button__option {
  width: 100%;
  text-align: start;
  cursor: pointer;
}

@media (hover: hover) {
  .ui-kit-dropdown-button__option:hover {
    background-color: color-mix(in srgb, var(--theme-on-primary) 14%, transparent);
  }
}

.ui-kit-dropdown-button__sizer {
  position: absolute;
  left: -9999px;
  top: 0;

  display: flex;
  flex-direction: column;

  visibility: hidden;
  pointer-events: none;
}
</style>
