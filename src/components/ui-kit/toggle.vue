<script setup lang="ts">
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'

type ToggleProps = {
  // Suppresses hover + select sfx — for contexts like dev/debug tooling that
  // shouldn't make noise, not a general-purpose per-instance mute.
  silent?: boolean
}

const { silent = false } = defineProps<ToggleProps>()

const checked = defineModel<boolean>('checked')

function onChange() {
  if (!silent) emitSfx('select')
}
</script>

<template>
  <label
    data-testid="ui-kit-toggle"
    :data-active="checked"
    class="group/toggle flex cursor-pointer items-center justify-between gap-2"
    v-sfx="silent ? {} : { hover: TYPE_SFX }"
  >
    <span data-testid="ui-kit-toggle__label" class="text-ink">
      <slot></slot>
    </span>

    <span
      data-testid="ui-kit-toggle__switch"
      class="flex w-12 items-center rounded-full p-1 transition-[background-color,box-shadow] bg-below has-checked:bg-(--color-accent) group-hover/toggle:ring-2 group-hover/toggle:ring-below has-checked:group-hover/toggle:ring-(--color-accent)"
    >
      <input type="checkbox" v-model="checked" class="peer sr-only" @change="onChange" />
      <span
        data-testid="ui-kit-toggle__switch-handle"
        class="size-5 rounded-full transition-all duration-100 ease-in-out bg-brown-500 dark:bg-brown-300 peer-checked:bg-(--color-on-accent) peer-checked:translate-x-full group-hover/toggle:scale-110"
      ></span>
    </span>
  </label>
</template>
