<script setup lang="ts">
import { type Grade, Rating, type RecordLog } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { useRatingFormat } from '@/composables/fsrs'

const { t } = useI18n()
const { getRatingTimeFormat } = useRatingFormat()

const { options, side } = defineProps<{
  options?: RecordLog
  side: CardSide
}>()

const emit = defineEmits<{
  (e: 'revealed'): void
  (e: 'started'): void
  (e: 'rated', grade: Grade): void
}>()

function onRatingClicked(grade: Grade) {
  emit('rated', grade)
}
</script>

<template>
  <div data-testid="rating-buttons" class="flex justify-center gap-2 text-2xl">
    <template v-if="side === 'back'">
      <ui-tooltip
        :text="getRatingTimeFormat(Rating.Again, options, 'short')"
        element="button"
        :gap="-12"
        data-testid="rating-buttons__again"
        class="text-brown-700 cursor-pointer rounded-full bg-white px-13 py-4 hover:-translate-0.5 hover:shadow-sm transition-all duration-50"
        static_on_mobile
        @click="onRatingClicked(Rating.Again)"
      >
        {{ t('study.flashcard.rating.fail-button') }}
      </ui-tooltip>

      <ui-tooltip
        :text="getRatingTimeFormat(Rating.Good, options, 'short')"
        element="button"
        :gap="-12"
        data-testid="rating-buttons__good"
        class="cursor-pointer rounded-full bg-(--theme-primary) px-13 py-4 text-white hover:-translate-0.5 hover:shadow-sm transition-all duration-50"
        static_on_mobile
        @click="onRatingClicked(Rating.Good)"
      >
        {{ t('study.flashcard.rating.pass-button') }}
      </ui-tooltip>
    </template>

    <button
      v-else-if="side === 'front'"
      data-testid="rating-buttons__show"
      class="cursor-pointer rounded-full bg-(--theme-primary) px-13 py-4 text-white hover:-translate-0.5 hover:shadow-sm transition-all duration-50"
      @click="$emit('revealed')"
    >
      {{ t('study.flashcard.rating.flip-button') }}
    </button>

    <button
      v-else-if="side === 'cover'"
      data-testid="rating-buttons__start"
      class="cursor-pointer rounded-full bg-(--theme-primary) px-13 py-4 text-white hover:-translate-0.5 hover:shadow-sm transition-all duration-50"
      @click="$emit('started')"
    >
      {{ t('study.flashcard.start-button') }}
    </button>
  </div>
</template>
