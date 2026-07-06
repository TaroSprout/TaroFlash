<script setup lang="ts">
import DialogCard from '@/components/layout-kit/dialog-card/dialog-card.vue'
import ResetPasswordForm from './form.vue'
import { useResetPasswordActions } from '@/composables/auth/use-reset-password-actions'
import { useToast } from '@/composables/toast'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const { password, confirm_password, loading, errors, submit } = useResetPasswordActions()

async function onSubmit() {
  const result = await submit()
  if (result !== 'success') return

  toast.success(t('reset-password-modal.success-toast'))
  close()
  router.push({ name: 'authenticated' })
}
</script>

<template>
  <dialog-card
    data-testid="reset-password-modal-card"
    class="w-100 bg-brown-200 dark:bg-grey-800"
    data-theme="brown-50"
    data-theme-dark="stone-700"
    :title="t('reset-password-modal.heading')"
    @close="close()"
  >
    <reset-password-form
      v-model:password="password"
      v-model:confirm-password="confirm_password"
      :errors="errors"
      :loading="loading"
      @submit="onSubmit"
    />
  </dialog-card>
</template>
