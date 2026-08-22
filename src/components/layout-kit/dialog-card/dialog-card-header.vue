<script setup lang="ts">
type DialogCardHeaderProps = {
  title?: string
  padded?: boolean
}

const { title, padded = true } = defineProps<DialogCardHeaderProps>()

const slots = defineSlots<{
  start(): any
  end(): any
  /** Below the title row, full width — a page-specific strip like a progress bar. */
  after(): any
}>()
</script>

<template>
  <header
    data-testid="dialog-card-header"
    class="w-full shrink-0 flex flex-col gap-2"
    :class="padded ? 'px-(--dialog-px) pt-(--dialog-px)' : ''"
  >
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
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
    </div>

    <div v-if="slots.after" data-testid="dialog-card-header__after" class="w-full">
      <slot name="after"></slot>
    </div>
  </header>
</template>
