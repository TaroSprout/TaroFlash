<script setup lang="ts"></script>

<template>
  <div
    data-testid="deck-view__mode-toolbar-base"
    data-theme="brown-300"
    data-theme-dark="stone-700"
    class="w-full flex justify-between items-center gap-1.5"
  >
    <div v-if="$slots.left" data-testid="mode-toolbar__left" class="flex gap-1.5 shrink-0 h-full">
      <slot name="left"></slot>
    </div>
    <div v-else class="w-3.75 aspect-square bg-(--theme-primary) rounded-full"></div>

    <span
      data-testid="mode-toolbar__divider"
      class="w-full border-b-2 border-dashed border-(--theme-primary)"
    ></span>

    <div v-if="$slots.right" data-testid="mode-toolbar__right" class="flex gap-1.5 shrink-0 h-full">
      <slot name="right"></slot>
    </div>
  </div>
</template>
