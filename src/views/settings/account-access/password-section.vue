<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { usePasswordActions } from './use-password-actions'

const emit = defineEmits<{ success: [] }>()

const { t } = useI18n()
const { password, confirm_password, loading, errors, success, submit } = usePasswordActions()

watch(success, (isSuccess) => {
  if (isSuccess) emit('success')
})
</script>

<template>
  <div
    data-testid="account-access-modal__password-section"
    class="h-full flex flex-col items-center justify-center gap-4 pt-12"
  >
    <ui-icon src="keyhole" class="size-12 text-ink" />
    <div class="w-full flex flex-col gap-2">
      <p class="text-base text-ink-muted text-center">
        {{ t('account-access-modal.password.instructions') }}
      </p>

      <form class="contents" @submit.prevent="submit">
        <ui-input
          data-theme="brown-50"
          data-theme-dark="stone-700"
          v-model:value="password"
          type="password"
          autocomplete="new-password"
          size="lg"
          :error="errors.password"
          :placeholder="t('account-access-modal.password.new-placeholder')"
          data-testid="account-access-modal__password-input"
        />
        <ui-input
          data-theme="brown-50"
          data-theme-dark="stone-700"
          v-model:value="confirm_password"
          type="password"
          autocomplete="new-password"
          size="lg"
          :error="errors.confirm_password"
          :placeholder="t('account-access-modal.password.confirm-placeholder')"
          data-testid="account-access-modal__password-confirm-input"
        />
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
      </form>
      <ui-button
        data-testid="account-access-modal__password-submit"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="lg"
        full-width
        :loading="loading"
        @press="submit"
      >
        {{ t('account-access-modal.password.submit-button') }}
      </ui-button>
    </div>
  </div>
</template>
