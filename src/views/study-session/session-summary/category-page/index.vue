<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCardBody from '@/components/layout-kit/dialog-card/dialog-card-body.vue'
import CategorySection from './category-section.vue'
import SummaryCardEditor from './summary-card-editor.vue'
import { aggregateSession, type SummaryCategory } from '../aggregate'
import { useDeckResolution } from '@/views/study-session/deck-resolution'
import { useInjectedStudySessionController } from '@/views/study-session/composables/session-controller'
import type { CardReviewResult, StudyCard } from '@/views/study-session/composables/session-engine'

type CategoryPageProps = {
  results: CardReviewResult[]
  category: SummaryCategory
}

type Section = {
  name: string
  cards: StudyCard[]
  heading?: string
}

const { results, category } = defineProps<CategoryPageProps>()

const { t } = useI18n()
const { thresholdFor } = useDeckResolution()
const { cards, summary_editing_card, onSummaryEditUpdate, stopSummaryEdit } =
  useInjectedStudySessionController()

const summary = computed(() => aggregateSession(results, thresholdFor))

// The session queue holds the full card for everything reviewed, so a category's
// results resolve to real cards without a refetch.
const cards_by_id = computed(() => new Map(cards.value.map((card) => [card.id, card])))

// `correct` is the one category with two sections — its own cards plus the ones
// that failed; every other category is a single unlabelled list.
const sections = computed<Section[]>(() => {
  if (category !== 'correct') {
    return [{ name: category, cards: resolve(summary.value.groups[category]) }]
  }

  return [
    {
      name: 'correct',
      heading: t('session-summary.category.correct-heading'),
      cards: resolve(summary.value.groups.correct)
    },
    {
      name: 'incorrect',
      heading: t('session-summary.category.incorrect-heading'),
      cards: resolve(summary.value.incorrect)
    }
  ].filter((section) => section.cards.length > 0)
})

function resolve(group: CardReviewResult[]): StudyCard[] {
  return group.flatMap((result) => {
    const card = cards_by_id.value.get(result.card_id)
    return card ? [card] : []
  })
}
</script>

<template>
  <dialog-card-body data-testid="session-summary-category" overflow_bleed class="h-full w-full">
    <summary-card-editor
      v-if="summary_editing_card"
      :card="summary_editing_card"
      @update="onSummaryEditUpdate"
      @done="stopSummaryEdit"
    />

    <div v-else data-testid="session-summary-category__content" class="flex flex-col gap-6">
      <p
        v-if="!sections.length"
        data-testid="session-summary-category__empty"
        class="text-center text-base text-ink"
      >
        {{ t('session-summary.category.empty-fallback') }}
      </p>

      <category-section
        v-for="section in sections"
        :key="section.name"
        :name="section.name"
        :heading="section.heading"
        :cards="section.cards"
      />
    </div>
  </dialog-card-body>
</template>
