<script setup lang="ts">
import Card from '@/components/card/index.vue'

defineProps<{ deck: Deck }>()
</script>

<template>
  <div data-testid="review-inbox-item" class="relative cursor-pointer">
    <card side="cover" size="xs" :cover_config="deck.cover_config" />
    <div
      data-testid="review-inbox-item__due-badge"
      class="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-500 ring-2 ring-brown-300 flex items-center justify-center text-xs font-semibold text-white"
    >
      {{ deck.due_count }}
    </div>
  </div>
</template>
