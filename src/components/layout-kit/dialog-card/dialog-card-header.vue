<script setup lang="ts">
type DialogCardHeaderProps = {
  title?: string
  padded?: boolean
}

const { title, padded = true } = defineProps<DialogCardHeaderProps>()

defineSlots<{
  start(): any
  end(): any
}>()
</script>

<template>
  <header
    data-testid="dialog-card-header"
    class="w-full shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2"
    :class="padded ? 'px-(--dialog-px) pt-(--dialog-px)' : ''"
  >
    <div data-testid="dialog-card-header__start" class="justify-self-start">
      <slot name="start"></slot>
    </div>

    <h1
      data-testid="dialog-card-header__title"
      class="truncate text-center text-3xl font-bold text-ink"
    >
      {{ title }}
    </h1>

    <div data-testid="dialog-card-header__end" class="justify-self-end">
      <slot name="end"></slot>
    </div>
  </header>
</template>
