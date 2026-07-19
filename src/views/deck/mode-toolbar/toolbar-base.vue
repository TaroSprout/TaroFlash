<script setup lang="ts"></script>

<template>
  <div
    data-testid="deck-view__mode-toolbar-base"
    class="w-full grid grid-cols-[auto_1fr_auto] items-center gap-1.5"
  >
    <div v-if="$slots.left" data-testid="mode-toolbar__left" class="flex gap-1.5 self-stretch">
      <slot name="left"></slot>
    </div>
    <div v-else class="w-3.75 aspect-square bg-element rounded-full"></div>

    <span
      data-testid="mode-toolbar__divider"
      class="border-b-2 border-dashed border-element"
    ></span>

    <div v-if="$slots.right" data-testid="mode-toolbar__right" class="flex gap-1.5 self-stretch">
      <slot name="right"></slot>
    </div>
  </div>
</template>
