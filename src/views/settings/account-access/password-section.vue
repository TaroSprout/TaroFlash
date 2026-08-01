<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { useSessionStore } from '@/stores/session'
import { usePasswordActions } from './use-password-actions'

const emit = defineEmits<{ success: [] }>()

const { t } = useI18n()
const session = useSessionStore()
const {
  password,
  confirm_password,
  current_password,
  code,
  step,
  loading,
  errors,
  success,
  submit,
  resendCode
} = usePasswordActions()

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
        {{
          step === 'code'
            ? t('account-access-modal.password.code-instructions')
            : t('account-access-modal.password.instructions')
        }}
      </p>

      <form class="contents" @submit.prevent="submit">
        <template v-if="step === 'password'">
          <ui-input
            v-if="session.hasPassword"
            v-model:value="current_password"
            type="password"
            autocomplete="current-password"
            size="lg"
            :error="errors.current_password"
            :placeholder="t('account-access-modal.password.current-placeholder')"
            data-testid="account-access-modal__password-current-input"
          />
          <ui-input
            v-model:value="password"
            type="password"
            autocomplete="new-password"
            size="lg"
            :error="errors.password"
            :placeholder="t('account-access-modal.password.new-placeholder')"
            data-testid="account-access-modal__password-input"
          />
          <ui-input
            v-model:value="confirm_password"
            type="password"
            autocomplete="new-password"
            size="lg"
            :error="errors.confirm_password"
            :placeholder="t('account-access-modal.password.confirm-placeholder')"
            data-testid="account-access-modal__password-confirm-input"
          />
        </template>

        <ui-input
          v-else
          v-model:value="code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          size="lg"
          :error="errors.code"
          :placeholder="t('account-access-modal.password.code-placeholder')"
          data-testid="account-access-modal__password-code-input"
        />
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
      </form>

      <ui-button
        v-if="step === 'code'"
        neutral
        type="button"
        size="sm"
        class="self-end!"
        data-testid="account-access-modal__password-resend-code"
        @press="resendCode"
      >
        {{ t('account-access-modal.password.resend-code-link') }}
      </ui-button>

      <ui-button
        data-testid="account-access-modal__password-submit"
        data-palette="brand"
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
