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
  success?: boolean
}

const {
  errors = {},
  loading = false,
  allFilled = false,
  submitError = '',
  success = false
} = defineProps<ForgotPasswordFormProps>()

const email = defineModel<string>('email', { required: true })

const emit = defineEmits<{ submit: [] }>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="forgot-password-modal"
    class="w-full max-md:max-w-100 md:w-80 flex flex-col items-center gap-6 p-4"
  >
    <div
      v-if="success"
      data-testid="forgot-password-modal__success"
      class="flex flex-col items-center gap-2 text-center py-6"
    >
      <ui-icon src="mail-envelope" class="size-12 text-brown-700 dark:text-brown-100" />
      <p class="text-xl text-brown-700 dark:text-brown-100">
        {{ t('forgot-password-modal.success-heading') }}
      </p>
      <p class="text-base text-brown-500 dark:text-brown-300">
        {{ t('forgot-password-modal.success-message') }}
      </p>
    </div>

    <form v-else class="w-full flex flex-col items-center gap-6" @submit.prevent="emit('submit')">
      <p class="text-base text-brown-500 dark:text-brown-300 text-center">
        {{ t('forgot-password-modal.instructions') }}
      </p>

      <div data-testid="forgot-password-modal__fields" class="flex flex-col gap-4 w-full">
        <div data-testid="forgot-password-modal__email">
          <ui-input
            type="email"
            name="email"
            data-theme="brown-50"
            data-theme-dark="stone-700"
            autocomplete="username"
            size="lg"
            v-model="email"
            :error="errors.email"
            :placeholder="t('forgot-password-modal.email-placeholder')"
          />
        </div>
      </div>

      <div
        data-testid="forgot-password-modal__footer"
        class="w-full flex flex-col items-center gap-2"
      >
        <p
          v-if="submitError"
          data-testid="forgot-password-modal__error"
          class="text-base text-red-500 dark:text-red-400 text-center"
        >
          {{ submitError }}
        </p>

        <ui-button
          data-testid="forgot-password-modal__submit"
          type="button"
          size="lg"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          :loading="loading"
          :disabled="!allFilled"
          click-when-disabled
          class="w-full!"
          @press="emit('submit')"
        >
          {{ t('forgot-password-modal.submit-button') }}
        </ui-button>
      </div>
    </form>
  </div>
</template>
