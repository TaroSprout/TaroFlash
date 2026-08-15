<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import FeedbackCard from './feedback-card.vue'
import FeedbackSubmitDialog from './feedback-submit-dialog.vue'
import { useFeedbackItemsQuery } from '@/api/feedback'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()
const modal = useModal()
const { data: items } = useFeedbackItemsQuery()

function onSubmitPress() {
  emitSfx('wooden_chime_ring')
  modal.open(FeedbackSubmitDialog, { backdrop: true, mode: 'popup' })
}
</script>

<template>
  <app-window
    data-testid="feedback-board"
    data-palette="green"
    class="sm:h-196 sm:w-170"
    :title="t('feedback-board.title')"
    scroll_body
    @close="close"
  >
    <div data-testid="feedback-board__body" class="flex flex-col gap-5 px-5 sm:px-20 pb-6">
      <div data-testid="feedback-board__list" class="flex flex-col gap-2">
        <p data-testid="feedback-board__intro" class="text-ink-muted pb-3 text-base text-center">
          {{ t('feedback-board.intro') }}
        </p>

        <feedback-card v-for="item in items" :key="item.id" :item="item" />
      </div>
    </div>

    <template #footer>
      <div data-testid="feedback-board__actions" class="px-5 pt-2 pb-6 sm:px-20">
        <ui-button
          data-testid="feedback-board__submit-button"
          data-palette="green"
          icon-left="shooting-star"
          size="lg"
          full-width
          @press="onSubmitPress"
        >
          {{ t('feedback-board.submit-button') }}
        </ui-button>
      </div>
    </template>
  </app-window>
</template>
