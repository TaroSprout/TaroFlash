<script setup lang="ts">
import {
  crossfadeResizeBeforeEnter,
  crossfadeResizeEnter,
  crossfadeResizeLeave
} from '@/utils/animations/crossfade-resize'
</script>

<template>
  <div data-testid="crossfade-resize" class="relative overflow-hidden">
    <transition
      :css="false"
      @before-enter="crossfadeResizeBeforeEnter"
      @enter="crossfadeResizeEnter"
      @leave="crossfadeResizeLeave"
    >
      <slot />
    </transition>
  </div>
</template>
