<script setup lang="ts">
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
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
  <form
    data-testid="reset-password-modal"
    class="w-full max-md:max-w-100 md:w-80 flex flex-col items-center gap-6 p-4"
    @submit.prevent="emit('submit')"
  >
    <div data-testid="reset-password-modal__fields" class="flex flex-col gap-4 w-full">
      <div data-testid="reset-password-modal__password">
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
        />
      </div>

      <div data-testid="reset-password-modal__confirm-password">
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
        />
      </div>
    </div>

    <ui-button
      data-testid="reset-password-modal__submit"
      type="button"
      size="lg"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      :loading="loading"
      class="w-full!"
      @press="emit('submit')"
    >
      {{ t('reset-password-modal.submit-button') }}
    </ui-button>
  </form>
</template>
