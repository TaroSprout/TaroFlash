<script setup lang="ts">
defineProps<{
  name: string
  price: string
}>()

defineSlots<{
  default(): unknown
}>()
</script>

<template>
  <div
    data-testid="plan-option"
    class="w-full h-full flex flex-col gap-5 rounded-9 p-12 bg-(--theme-primary) text-(--theme-on-primary)"
  >
    <div data-testid="plan-option__header" class="flex items-center justify-between gap-10">
      <p data-testid="plan-option__name" class="text-3xl">{{ name }}</p>
      <p data-testid="plan-option__price" class="text-lg *:[span]:text-sm" v-html="price"></p>
    </div>

    <ul data-testid="plan-option__list" class="flex flex-col gap-2 text-start">
      <slot></slot>
    </ul>
  </div>
</template>
