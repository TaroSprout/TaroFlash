<script setup lang="ts">
import AppWindow from '@/components/layout-kit/app-window/index.vue'
import UiButton from '@/components/ui-kit/button.vue'
import SignupForm from './form.vue'
import { useSignupActions } from '@/composables/auth/use-signup-actions'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAlert } from '@/composables/alert'

const { close } = defineProps<{
  close: (response?: boolean) => void
}>()

const { t } = useI18n()
const router = useRouter()
const alert = useAlert()

const auth = useSignupActions()

async function onSubmit() {
  const result = await auth.submit()

  if (result === 'success') {
    router.push('/dashboard')
    close(true)
    return
  }

  // 'invalid' shows inline field errors; only a genuine request failure alerts.
  if (result === 'error') {
    alert.warn({
      title: t('signup-dialog.alert.error-title'),
      message: t('signup-dialog.alert.error-message'),
      cancelLabel: t('signup-dialog.alert.close')
    })
  }
}
</script>

<template>
  <app-window
    data-testid="signup-container"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    class="sm:w-130"
    :title="t('signup-dialog.heading')"
    :pattern_config="{
      pattern: 'leaf',
      pattern_opacity: '0.1'
    }"
    @close="close()"
  >
    <div
      data-testid="signup__body"
      class="flex flex-col gap-8 py-8 px-6 sm:px-15 items-center relative"
    >
      <signup-form
        v-model:username="auth.username"
        v-model:email="auth.email"
        v-model:password="auth.password"
        v-model:confirm-password="auth.confirm_password"
        :errors="auth.errors"
        @submit="onSubmit"
        @oauth="auth.submitOAuth"
      />

      <div data-testid="signup__actions" class="w-full flex justify-center gap-2.5">
        <ui-button
          size="xl"
          full-width
          data-theme="brown-100"
          data-theme-dark="stone-700"
          :fancy-hover="false"
          @press="close()"
        >
          {{ t('signup-dialog.cancel') }}
        </ui-button>
        <ui-button
          size="xl"
          full-width
          data-theme="blue-500"
          data-theme-dark="blue-650"
          :loading="auth.loading"
          :disabled="!auth.all_filled"
          click-when-disabled
          @press="onSubmit"
        >
          {{ t('signup-dialog.submit-button') }}
        </ui-button>
      </div>
    </div>
  </app-window>
</template>
