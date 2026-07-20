<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import type { ButtonProps } from '@/components/ui-kit/button.vue'
import type { SfxOptions } from '@/sfx/directive'

export type ButtonGroupOption = {
  label: string
  value: string | number
  icon?: string
}

type UiButtonGroupProps = {
  options: ButtonGroupOption[]
  size?: ButtonProps['size']
  sfx?: SfxOptions
  active_value?: ButtonGroupOption['value']
  icon_only?: boolean
  neutral?: boolean
}

const {
  options,
  size = 'xl',
  sfx = {},
  active_value,
  icon_only = false,
  neutral = false
} = defineProps<UiButtonGroupProps>()

const emit = defineEmits<{ (e: 'press', value: string | number): void }>()

const RADIUS: Record<NonNullable<ButtonProps['size']>, string> = {
  xl: '22.5px',
  lg: '19px',
  base: '18px',
  sm: '13px'
}

const PADDING_X: Record<NonNullable<ButtonProps['size']>, string> = {
  xl: '18px',
  lg: '16px',
  base: '10px',
  sm: '8px'
}

function styleFor(index: number) {
  const r = RADIUS[size]
  const inner = '4px'
  let borderRadius: string
  if (options.length === 1) borderRadius = r
  else if (index === 0) borderRadius = `${r} ${inner} ${inner} ${r}`
  else if (index === options.length - 1) borderRadius = `${inner} ${r} ${r} ${inner}`
  else borderRadius = inner

  return { '--btn-border-radius': borderRadius, '--btn-padding-x': PADDING_X[size] }
}
</script>

<template>
  <div data-testid="ui-button-group" class="ui-button-group flex w-full gap-0.5">
    <ui-button
      v-for="(option, i) in options"
      :key="option.value"
      :size="size"
      :neutral="neutral"
      :icon-left="option.icon"
      :icon-only="icon_only"
      :sfx="sfx"
      :active="option.value === active_value"
      data-testid="ui-button-group__button"
      :style="styleFor(i)"
      @press="emit('press', option.value)"
    >
      {{ option.label }}
    </ui-button>
  </div>
</template>

<style>
.ui-button-group > * {
  flex: 1;
}

.ui-button-group .ui-kit-btn--icon-only {
  aspect-ratio: unset;
}
</style>
