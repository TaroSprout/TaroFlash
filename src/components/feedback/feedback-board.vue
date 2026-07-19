<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
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
    data-theme="green-500"
    data-theme-dark="green-800"
    class="sm:w-170"
    :title="t('feedback-board.title')"
    @close="close"
  >
    <div data-testid="feedback-board__body" class="flex h-full flex-col gap-5 px-5 sm:px-20 pb-6">
      <p class="text-ink-muted text-base text-center">
        {{ t('feedback-board.intro') }}
      </p>

      <div data-testid="feedback-board__list-wrap" class="relative min-h-0 flex-1">
        <div
          data-testid="feedback-board__list"
          class="scroll-hidden mobile-modal:max-h-none flex max-h-120 flex-col gap-2 overflow-y-auto"
        >
          <feedback-card v-for="item in items" :key="item.id" :item="item" />
        </div>

        <scroll-bar
          target="[data-testid='feedback-board__list']"
          min-width="sm"
          class="absolute top-0 bottom-0 -right-10"
        />
      </div>

      <ui-button
        data-testid="feedback-board__submit-button"
        data-theme="green-500"
        data-theme-dark="green-800"
        icon-left="shooting-star"
        size="lg"
        full-width
        @press="onSubmitPress"
      >
        {{ t('feedback-board.submit-button') }}
      </ui-button>
    </div>
  </app-window>
</template>
