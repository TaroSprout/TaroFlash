<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/components/card/index.vue'
import { useMatchMedia } from '@/composables/ui/media-query'

type DeckGridSkeletonProps = {
  count?: number
}

const { count = 12 } = defineProps<DeckGridSkeletonProps>()

const DEFAULT_COVER: DeckCover = {
  theme: 'brown-300',
  theme_dark: 'stone-900',
  pattern: 'diagonal-stripes'
}

const is_md = useMatchMedia('w>=md')
const size = computed(() => (is_md.value ? 'base' : 'sm'))
</script>

<template>
  <div data-testid="deck-grid-skeleton" class="flex gap-x-3 gap-y-8 flex-wrap">
    <card
      v-for="n in count"
      :key="n"
      side="cover"
      :size="size"
      shimmer
      :cover_config="DEFAULT_COVER"
    />
  </div>
</template>
