<script setup lang="ts">
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { useI18n } from 'vue-i18n'
import type { PasswordFieldErrors } from '@/utils/password-validation'

type ResetPasswordFormProps = {
  errors?: PasswordFieldErrors
  loading?: boolean
}

const { errors = {}, loading = false } = defineProps<ResetPasswordFormProps>()

const password = defineModel<string>('password', { required: true })
const confirmPassword = defineModel<string>('confirmPassword', { required: true })

const emit = defineEmits<{ submit: [] }>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="reset-password-modal"
    class="w-full max-w-100 h-full flex flex-1 flex-col items-center gap-2 py-4 pt-10 mx-auto"
  >
    <ui-icon src="keyhole" class="size-12 text-brown-700 dark:text-brown-100" />

    <div class="w-full flex flex-col gap-2">
      <form class="contents" @submit.prevent="emit('submit')">
        <ui-input
          type="password"
          name="password"
          data-theme="brown-50"
          data-theme-dark="stone-700"
          autocomplete="new-password"
          size="lg"
          v-model="password"
          :error="errors.password"
          :placeholder="t('reset-password-modal.password-placeholder')"
          data-testid="reset-password-modal__password-input"
        />
        <ui-input
          type="password"
          name="confirm-password"
          data-theme="brown-50"
          data-theme-dark="stone-700"
          autocomplete="new-password"
          size="lg"
          v-model="confirmPassword"
          :error="errors.confirm_password"
          :placeholder="t('reset-password-modal.confirm-password-placeholder')"
          data-testid="reset-password-modal__confirm-password-input"
        />
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
      </form>

      <ui-button
        data-testid="reset-password-modal__submit"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="lg"
        full-width
        :loading="loading"
        @press="emit('submit')"
      >
        {{ t('reset-password-modal.submit-button') }}
      </ui-button>
    </div>
  </div>
</template>
