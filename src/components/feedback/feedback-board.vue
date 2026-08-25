<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTemplateRef, watch, ref } from 'vue'
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import FeedbackCard from './feedback-card.vue'
import FeedbackSkeleton from './skeleton.vue'
import FeedbackSubmitDialog from './feedback-submit-dialog.vue'
import { useFeedbackItemsQuery } from '@/api/feedback'
import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import { shake } from '@/utils/animations/shake'

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()
const modal = useModal()
const { data: items, status, refetch } = useFeedbackItemsQuery()
const error_message = useTemplateRef<HTMLElement>('error_message')
/** Distinguishes the error's first appearance (its own cue) from a repeat retry failure (shake + a different cue). */
const has_shown_load_error = ref(false)

function onSubmitPress() {
  emitSfx('dialog.open-chime')
  modal.open(FeedbackSubmitDialog, { backdrop: true, mode: 'popup' })
}

function onRetry() {
  return refetch()
}

// The initial load failure gets its own cue as the message first appears; a
// retry that fails again shakes the same message with the rejection cue
// instead, since no new message appears.
watch(status, (current) => {
  if (current !== 'error') return

  if (has_shown_load_error.value) {
    emitSfx('ui.rejected')
    if (error_message.value) shake(error_message.value)
    return
  }

  has_shown_load_error.value = true
  emitSfx('notice.error')
})
</script>

<template>
  <app-window
    data-testid="feedback-board"
    data-palette="green"
    class="msm:h-196 msm:w-170 [--scroll-content-inset:1.25rem] msm:[--scroll-content-inset:5rem]"
    :title="t('feedback-board.title')"
    scroll_body
    @close="close"
  >
    <div
      data-testid="feedback-board__body"
      class="flex flex-col gap-5 pr-(--scroll-content-pad-end) pl-5 msm:pl-20"
    >
      <div data-testid="feedback-board__list" class="flex flex-col gap-2">
        <p data-testid="feedback-board__intro" class="text-ink-muted pb-3 text-base text-center">
          {{ t('feedback-board.intro') }}
        </p>

        <feedback-skeleton v-if="status === 'pending'" />

        <div
          v-else-if="status === 'error'"
          data-testid="feedback-board__error"
          class="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center"
        >
          <p ref="error_message" data-testid="feedback-board__error-message" class="text-ink">
            {{ t('feedback-board.error-message') }}
          </p>

          <ui-button
            data-testid="feedback-board__retry-button"
            variant="ghost"
            data-palette="brand"
            icon-left="refresh"
            @press="onRetry"
          >
            {{ t('feedback-board.retry-button') }}
          </ui-button>
        </div>

        <div
          v-else-if="(items ?? []).length === 0"
          data-testid="feedback-board__empty"
          class="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center"
        >
          <p data-testid="feedback-board__empty-heading" class="text-ink text-lg">
            {{ t('feedback-board.empty-heading') }}
          </p>
          <p data-testid="feedback-board__empty-message" class="text-ink-muted">
            {{ t('feedback-board.empty-message') }}
          </p>
        </div>

        <feedback-card v-else v-for="item in items ?? []" :key="item.id" :item="item" />
      </div>
    </div>

    <template #footer>
      <div data-testid="feedback-board__actions" class="px-5 pt-2 pb-6 msm:px-20">
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
