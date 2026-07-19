<script setup lang="ts">
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { useI18n } from 'vue-i18n'
import type { ForgotPasswordFieldErrors } from '@/composables/auth/use-forgot-password-actions'

type ForgotPasswordFormProps = {
  errors?: ForgotPasswordFieldErrors
  loading?: boolean
  allFilled?: boolean
  submitError?: string
}

const {
  errors = {},
  loading = false,
  allFilled = false,
  submitError = ''
} = defineProps<ForgotPasswordFormProps>()

const email = defineModel<string>('email', { required: true })

const emit = defineEmits<{ submit: [] }>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="forgot-password-modal"
    class="h-full flex flex-col items-center justify-center gap-4"
  >
    <ui-icon src="mail-envelope" class="size-12 text-ink" />

    <div class="w-full flex flex-col gap-2">
      <p class="text-base text-ink-muted text-center">
        {{ t('forgot-password-modal.instructions') }}
      </p>

      <form class="contents" @submit.prevent="emit('submit')">
        <ui-input
          type="email"
          name="email"
          data-theme="brown-50"
          data-theme-dark="stone-700"
          autocomplete="email"
          size="lg"
          v-model="email"
          :error="errors.email"
          :placeholder="t('forgot-password-modal.email-placeholder')"
          data-testid="forgot-password-modal__email-input"
        />
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
      </form>

      <p
        v-if="submitError"
        data-testid="forgot-password-modal__error"
        class="text-base text-red-500 dark:text-red-400 text-center"
      >
        {{ submitError }}
      </p>

      <ui-button
        data-testid="forgot-password-modal__submit"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="lg"
        full-width
        :loading="loading"
        :disabled="!allFilled"
        click-when-disabled
        @press="emit('submit')"
      >
        {{ t('forgot-password-modal.submit-button') }}
      </ui-button>
    </div>
  </div>
</template>
