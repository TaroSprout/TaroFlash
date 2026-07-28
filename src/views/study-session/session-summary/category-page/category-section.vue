<script setup lang="ts">
import SummaryCard from './summary-card.vue'
import type { StudyCard } from '@/views/study-session/composables/session-engine'

type CategorySectionProps = {
  name: string
  cards: StudyCard[]
  heading?: string
}

const { name, cards, heading } = defineProps<CategorySectionProps>()
</script>

<template>
  <section
    :data-testid="`session-summary__section-${name}`"
    class="flex w-full flex-col items-center gap-4"
  >
    <h3
      v-if="heading"
      :data-testid="`session-summary__section-heading-${name}`"
      class="w-full text-base font-bold text-ink"
    >
      {{ heading }}
    </h3>

    <div
      :data-testid="`session-summary__section-cards-${name}`"
      class="flex w-full flex-row flex-wrap justify-center gap-4"
    >
      <summary-card v-for="card in cards" :key="card.id" :card="card" />
    </div>
  </section>
</template>
