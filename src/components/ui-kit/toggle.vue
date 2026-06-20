<script setup lang="ts">
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'

const checked = defineModel<boolean>('checked')
</script>

<template>
  <label
    data-testid="ui-kit-toggle"
    :data-active="checked"
    class="group/toggle flex cursor-pointer items-center justify-between gap-2"
    v-sfx="{ hover: TYPE_SFX }"
  >
    <span data-testid="ui-kit-toggle__label" class="text-brown-700 dark:text-brown-100">
      <slot></slot>
    </span>

    <span
      data-testid="ui-kit-toggle__switch"
      class="flex w-12 items-center rounded-full p-1 transition-[background-color,box-shadow] bg-input has-checked:bg-(--theme-primary) group-hover/toggle:ring-2 group-hover/toggle:ring-input has-checked:group-hover/toggle:ring-(--theme-primary)"
    >
      <input
        type="checkbox"
        v-model="checked"
        class="peer sr-only"
        @change="emitSfx('select')"
      />
      <span
        data-testid="ui-kit-toggle__switch-handle"
        class="size-5 rounded-full transition-all duration-100 ease-in-out bg-brown-500 dark:bg-brown-300 peer-checked:bg-(--theme-on-primary) peer-checked:translate-x-full group-hover/toggle:scale-110"
      ></span>
    </span>
  </label>
</template>
