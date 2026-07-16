<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useSubmitFeedbackMutation } from '@/api/feedback'
import { useNoticeStore } from '@/stores/notice-store'
import { emitSfx } from '@/sfx/bus'

const TITLE_MAX_CHARS = 80
const BODY_MAX_CHARS = 500

type FeedbackSubmitDialogProps = {
  close: (response?: boolean) => void
}

const { close } = defineProps<FeedbackSubmitDialogProps>()

const { t } = useI18n()
const notice = useNoticeStore()
const submitFeedback = useSubmitFeedbackMutation()

// Submitters don't categorize their own feedback — admins set `type` from the admin dashboard.
const UNCATEGORIZED_TYPE: FeedbackType = 'other'

const title = ref('')
const body = ref('')

const can_submit = computed(() => title.value.trim().length > 0)

async function onSubmit() {
  if (!can_submit.value) return

  try {
    await submitFeedback.mutateAsync({
      title: title.value.trim(),
      body: body.value.trim() || undefined,
      type: UNCATEGORIZED_TYPE
    })
    emitSfx('generic_notification_9')
    notice.success(t('toast.success.feedback-submitted'))
    close(true)
  } catch {
    notice.error(t('toast.error.feedback-submit-failed'))
  }
}

function onClose() {
  emitSfx('pop_up_close')
  close(false)
}
</script>

<template>
  <dialog-card
    data-testid="feedback-submit-dialog"
    data-theme="green-500"
    data-theme-dark="green-800"
    size="lg"
    :title="t('feedback-submit-dialog.title')"
    @close="onClose"
  >
    <div
      data-testid="feedback-submit-dialog__body"
      class="h-full flex flex-col justify-between gap-4 pb-(--dialog-px)"
    >
      <p class="text-brown-500 dark:text-brown-300 text-base text-center">
        {{ t('feedback-submit-dialog.intro') }}
      </p>

      <div class="flex flex-col gap-2">
        <ui-input
          v-model:value="title"
          data-testid="feedback-submit-dialog__title"
          :placeholder="t('feedback-submit-dialog.title-placeholder')"
          :max-length="TITLE_MAX_CHARS"
          size="lg"
        />

        <ui-textarea
          v-model:value="body"
          data-testid="feedback-submit-dialog__body-input"
          :placeholder="t('feedback-submit-dialog.body-placeholder')"
          :max_chars="BODY_MAX_CHARS"
          rows="10"
          size="lg"
        />
      </div>

      <ui-button
        data-testid="feedback-submit-dialog__submit"
        data-theme="green-500"
        data-theme-dark="green-800"
        icon-left="shooting-star"
        size="lg"
        full-width
        :loading="submitFeedback.isLoading.value"
        :disabled="!can_submit || submitFeedback.isLoading.value"
        @press="onSubmit"
      >
        {{ t('feedback-submit-dialog.submit-button') }}
      </ui-button>
    </div>
  </dialog-card>
</template>
