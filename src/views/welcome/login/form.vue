<script setup lang="ts">
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiDivider from '@/components/ui-kit/divider.vue'
import { useI18n } from 'vue-i18n'
import type { OAuthProvider } from '@/api/session'
import type { LoginFieldErrors } from '@/composables/auth/use-login-actions'

const {
  errors = {},
  loading = false,
  allFilled = false,
  submitError = ''
} = defineProps<{
  errors?: LoginFieldErrors
  loading?: boolean
  allFilled?: boolean
  submitError?: string
}>()

const email = defineModel<string>('email', { required: true })
const password = defineModel<string>('password', { required: true })

const emit = defineEmits<{ submit: []; oauth: [provider: OAuthProvider]; 'forgot-password': [] }>()

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="login-dialog"
    class="w-full max-md:max-w-100 md:w-80 flex flex-col items-center gap-6 p-4"
  >
    <ui-button
      data-testid="login-dialog__google"
      data-theme="brown-50"
      data-theme-dark="stone-900"
      size="lg"
      class="w-full!"
      icon-left="google-logo"
      @press="emit('oauth', 'google')"
    >
      {{ t('login-dialog.google-button') }}
    </ui-button>

    <ui-divider :label="t('login-dialog.divider-or')" />

    <form class="w-full flex flex-col items-center gap-6" @submit.prevent="emit('submit')">
      <div data-testid="login-dialog__fields" class="flex flex-col gap-4 w-full">
        <div data-testid="login-dialog__email">
          <ui-input
            type="email"
            name="email"
            data-theme="brown-50"
            data-theme-dark="stone-900"
            autocomplete="username"
            size="lg"
            v-model="email"
            :error="errors.email"
            :placeholder="t('login-dialog.email-placeholder')"
          />
        </div>

        <div data-testid="login-dialog__password">
          <ui-input
            type="password"
            name="password"
            data-theme="brown-50"
            data-theme-dark="stone-900"
            autocomplete="current-password"
            size="lg"
            v-model="password"
            :error="errors.password"
            :placeholder="t('login-dialog.password')"
          />
        </div>

        <ui-button
          data-testid="login-dialog__forgot-password"
          type="button"
          size="sm"
          data-theme="brown-200"
          data-theme-dark="stone-700"
          class="self-end!"
          @press="emit('forgot-password')"
        >
          {{ t('login-dialog.forgot-password-link') }}
        </ui-button>
      </div>

      <div data-testid="login-dialog__footer" class="w-full flex flex-col items-center gap-2">
        <p
          v-if="submitError"
          data-testid="login-dialog__error"
          class="text-base text-red-500 dark:text-red-400 text-center"
        >
          {{ submitError }}
        </p>

        <ui-button
          data-testid="login-dialog__submit"
          size="lg"
          data-theme="blue-500"
          data-theme-dark="blue-650"
          :loading="loading"
          :disabled="!allFilled"
          click-when-disabled
          class="w-full!"
          @press="emit('submit')"
        >
          {{ t('login-dialog.submit-button') }}
        </ui-button>
      </div>
    </form>
  </div>
</template>
