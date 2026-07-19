<script setup lang="ts">
import Card from '@/components/card/index.vue'
import { TYPE_SFX } from '@/sfx/config'

type ReviewInboxItemProps = {
  deck: Deck
  disabled?: boolean
}

const { disabled = false } = defineProps<ReviewInboxItemProps>()
</script>

<template>
  <div
    data-testid="review-inbox-item"
    class="flex flex-col items-center gap-2.5 pointer-fine:hover:scale-102 pointer-fine:hover:z-10 pointer-fine:transition-transform duration-75 relative cursor-pointer touch-manipulation"
    :class="disabled && 'opacity-50'"
    v-sfx="{ hover: TYPE_SFX }"
  >
    <card side="cover" class="w-(--card-w-2xs)" :cover_config="deck.cover_config" />

    <div
      data-testid="review-inbox-item__due-badge"
      class="absolute -top-1 -right-1 min-w-7 h-7 px-1.5 aspect-square rounded-full bg-red-400 dark:bg-red-500 ring-3 ring-brown-100 dark:ring-stone-950 flex items-center justify-center text-sm font-semibold text-white"
    >
      {{ deck.due_count }}
    </div>

    <div class="text-center text-sm text-brown-500">
      {{ deck.title }}
    </div>
  </div>
</template>
