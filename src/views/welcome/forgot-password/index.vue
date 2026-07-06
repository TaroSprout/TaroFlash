<script setup lang="ts">
import DialogCard from '@/components/layout-kit/dialog-card/dialog-card.vue'
import ForgotPasswordForm from './form.vue'
import { useForgotPasswordActions } from '@/composables/auth/use-forgot-password-actions'
import { useI18n } from 'vue-i18n'

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()

const auth = useForgotPasswordActions()

async function onSubmit() {
  await auth.submit()
}
</script>

<template>
  <dialog-card
    data-testid="forgot-password-modal-card"
    class="w-100 bg-brown-200 dark:bg-grey-800"
    data-theme="brown-50"
    data-theme-dark="stone-700"
    :title="t('forgot-password-modal.heading')"
    @close="close()"
  >
    <forgot-password-form
      v-model:email="auth.email"
      :errors="auth.errors"
      :loading="auth.loading"
      :all-filled="auth.all_filled"
      :submit-error="auth.submitError"
      :success="auth.success"
      @submit="onSubmit"
    />
  </dialog-card>
</template>
