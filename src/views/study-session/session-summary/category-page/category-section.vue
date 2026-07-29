<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import SummaryCard from './summary-card.vue'
import { useCardGrid } from '@/views/deck/card-grid/use-card-grid'
import type { StudyCard } from '@/views/study-session/composables/session-engine'

type CategorySectionProps = {
  name: string
  cards: StudyCard[]
  heading?: string
}

const { name, cards, heading } = defineProps<CategorySectionProps>()

// Same geometry as the deck's card grid at its smallest size, sourced rather
// than copied so the two can't drift.
const { cell_width, gap, grid_classes } = useCardGrid('base')

// `auto-fit` rather than the composable's `auto-fill`: empty tracks collapse, so
// `justify-center` can center the cards as a block instead of leaving dead space
// on the right. Rows still fill left-to-right from a shared left edge.
const grid_style = computed<CSSProperties>(() => ({
  gap: `${gap.value}px`,
  gridTemplateColumns: `repeat(auto-fit, ${cell_width.value}px)`
}))
</script>

<template>
  <section
    :data-testid="`session-summary__section-${name}`"
    class="flex w-full flex-col items-center gap-4"
  >
    <ui-divider
      v-if="heading"
      :data-testid="`session-summary__section-heading-${name}`"
      :label="heading"
    />

    <div
      :data-testid="`session-summary__section-cards-${name}`"
      class="w-full"
      :class="grid_classes"
      :style="grid_style"
    >
      <summary-card v-for="card in cards" :key="card.id" :card="card" />
    </div>
  </section>
</template>
