<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { useEmailActions } from './use-email-actions'

const emit = defineEmits<{ pending: [] }>()

const { t } = useI18n()
const { email, loading, error, pending, submit } = useEmailActions()

watch(pending, (isPending) => {
  if (isPending) emit('pending')
})
</script>

<template>
  <div
    data-testid="account-access-modal__email-section"
    class="h-full flex flex-col items-center justify-center gap-4 pt-6"
  >
    <ui-icon src="mail-envelope" class="size-12 text-ink" />
    <div class="w-full flex flex-col gap-2">
      <p class="text-base text-ink-muted text-center">
        {{ t('account-access-modal.email.instructions') }}
      </p>

      <form class="contents" @submit.prevent="submit">
        <ui-input
          :placeholder="t('account-access-modal.email.new-label')"
          v-model:value="email"
          type="email"
          size="lg"
          :error="error"
          data-testid="account-access-modal__email-input"
        />
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
      </form>
      <ui-button
        data-testid="account-access-modal__email-submit"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="lg"
        full-width
        :loading="loading"
        @press="submit"
      >
        {{ t('account-access-modal.email.submit-button') }}
      </ui-button>
    </div>
  </div>
</template>
