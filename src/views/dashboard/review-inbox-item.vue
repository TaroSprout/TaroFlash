<script setup lang="ts">
import Card from '@/components/card/index.vue'
import { TYPE_SFX } from '@/sfx/config'

defineProps<{ deck: Deck }>()
</script>

<template>
  <div
    data-testid="review-inbox-item"
    class="pointer-fine:hover:scale-102 pointer-fine:hover:z-10 pointer-fine:transition-transform duration-75 relative cursor-pointer touch-manipulation"
    v-sfx="{ hover: TYPE_SFX }"
  >
    <card side="cover" size="xs" :cover_config="deck.cover_config" />
    <div
      data-testid="review-inbox-item__due-badge"
      class="absolute -top-1 -right-1 min-w-7 h-7 px-1.5 aspect-square rounded-full bg-red-500 ring-3 ring-brown-300 dark:ring-stone-900 flex items-center justify-center text-sm font-semibold text-white"
    >
      {{ deck.due_count }}
    </div>
  </div>
</template>
