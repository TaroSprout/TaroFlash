<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import MobileSheet from '@/components/layout-kit/sheet/mobile-sheet.vue'
import UiButton from '@/components/ui-kit/button.vue'
import FeedbackCard from './feedback-card.vue'
import { useFeedbackItemsQuery } from '@/api/feedback'

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()
const { data: items } = useFeedbackItemsQuery()
</script>

<template>
  <mobile-sheet
    data-testid="feedback-board"
    data-theme="green-500"
    data-theme-dark="green-800"
    class="sm:w-150"
    :title="t('feedback-board.title')"
    @close="close"
  >
    <div data-testid="feedback-board__body" class="flex h-full flex-col gap-5 p-6">
      <p class="text-brown-500 dark:text-brown-300 text-base">{{ t('feedback-board.intro') }}</p>

      <div data-testid="feedback-board__list" class="flex flex-1 flex-col gap-4 overflow-y-auto">
        <feedback-card v-for="item in items" :key="item.id" :item="item" />
      </div>

      <ui-button
        data-testid="feedback-board__submit-button"
        data-theme="green-500"
        data-theme-dark="green-800"
        icon-left="shooting-star"
        size="lg"
        full-width
        disabled
      >
        {{ t('feedback-board.submit-button') }}
      </ui-button>
    </div>
  </mobile-sheet>
</template>
