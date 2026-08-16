<script setup lang="ts">
import { emitSfx } from '@/sfx/bus'
import type { SfxOptions } from '@/sfx/roles'

type ToggleProps = {
  sfx?: SfxOptions
  disabled?: boolean
}

const { sfx = {}, disabled = false } = defineProps<ToggleProps>()

const checked = defineModel<boolean>('checked')

function onChange() {
  const picked = sfx.press ?? 'ui.select'
  if (picked !== false) emitSfx(picked)
}
</script>

<template>
  <label
    data-testid="ui-kit-toggle"
    :data-active="checked"
    :data-disabled="disabled"
    class="group/toggle flex items-center justify-between gap-2"
    :class="disabled ? 'pointer-events-none opacity-disabled' : 'cursor-pointer'"
    v-sfx="{ hover: sfx.hover ?? 'ui.hover' }"
  >
    <span data-testid="ui-kit-toggle__label" class="text-ink">
      <slot></slot>
    </span>

    <span
      data-testid="ui-kit-toggle__switch"
      class="flex w-12 items-center rounded-full p-1 transition-[background-color,box-shadow] bg-well has-checked:bg-(--color-accent) group-hover/toggle:ring-2 group-hover/toggle:ring-well has-checked:group-hover/toggle:ring-(--color-accent)"
    >
      <input
        type="checkbox"
        v-model="checked"
        :disabled="disabled"
        class="peer sr-only"
        @change="onChange"
      />
      <span
        data-testid="ui-kit-toggle__switch-handle"
        class="size-5 rounded-full transition-all duration-100 ease-in-out bg-ink-muted peer-checked:bg-(--color-on-accent) peer-checked:translate-x-full group-hover/toggle:scale-110"
      ></span>
    </span>
  </label>
</template>
